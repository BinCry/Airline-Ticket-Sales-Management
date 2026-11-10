package com.qlvmb.airticket.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import com.qlvmb.airticket.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuditLogExportService {

  public static final int ROW_LIMIT = 10000;
  private static final Logger LOGGER = LoggerFactory.getLogger(AuditLogExportService.class);
  private final AuditLogQueryService queries;
  private final AuditLogExportAuditService auditWriter;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final TransactionTemplate snapshot;

  public AuditLogExportService(AuditLogQueryService queries, AuditLogExportAuditService auditWriter,
      EntityManager entityManager, ObjectMapper objectMapper, PlatformTransactionManager transactionManager) {
    this.queries = queries;
    this.auditWriter = auditWriter;
    this.entityManager = entityManager;
    this.objectMapper = objectMapper;
    snapshot = new TransactionTemplate(transactionManager);
    snapshot.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    snapshot.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    snapshot.setReadOnly(true);
  }

  public ExportFile prepare(AuditLogFilterRequest filter) {
    if (filter == null || filter.from() == null || filter.to() == null) {
      throw new BadRequestException("Xuất CSV bắt buộc có ngày bắt đầu và ngày kết thúc.");
    }
    if (ChronoUnit.DAYS.between(filter.from(), filter.to()) + 1 > 90) {
      throw new BadRequestException("Mỗi lần xuất CSV tối đa 90 ngày, tính cả ngày đầu và ngày cuối.");
    }
    String filters = filterJson(filter);
    String reserved = detail(filters, ROW_LIMIT, false, ExportStatus.SERVER_WRITE_COMPLETED);
    if (reserved.codePointCount(0, reserved.length()) > 1000) {
      throw new BadRequestException("Bộ lọc quá dài để ghi đầy đủ nhật ký xuất CSV; hãy thu hẹp bộ lọc.");
    }

    Path path;
    try {
      path = Files.createTempFile("airline-audit-export-", ".csv");
    } catch (IOException exception) {
      throw new IllegalStateException("Không thể tạo tệp CSV tạm.", exception);
    }
    try {
      // Toàn bộ các lô dùng cùng snapshot; chỉ transaction riêng này được giải phóng persistence context.
      ExportStats stats = snapshot.execute(status -> writeSnapshot(path, filter));
      if (stats == null) {
        throw new IllegalStateException("Không nhận được kết quả chuẩn bị CSV.");
      }
      long length = Files.size(path);
      InputStream input = Files.newInputStream(path);
      return new ExportFile(path, input, length, stats.rows(), stats.truncated(), filters,
          "audit-logs-" + filter.from() + "_" + filter.to() + ".csv");
    } catch (IOException | RuntimeException exception) {
      removeTemporaryFile(path);
      if (exception instanceof IOException || exception instanceof UncheckedIOException) {
        throw new IllegalStateException("Không thể chuẩn bị nội dung CSV.", exception);
      }
      throw (RuntimeException) exception;
    }
  }

  private ExportStats writeSnapshot(Path path, AuditLogFilterRequest filter) {
    try (Writer writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
      AuditLogCsvWriter.writeHeader(writer);
      int rows = 0;
      for (int batch = 0; ; batch++) {
        List<AuditLogItemResponse> items = queries.getExportBatch(filter, batch);
        try {
          if (rows == ROW_LIMIT) {
            // Phải đọc thêm dòng 10.001 mới biết có cắt dữ liệu, không suy ra từ đủ 10.000 dòng.
            return new ExportStats(rows, !items.isEmpty());
          }
          for (AuditLogItemResponse item : items) {
            if (rows == ROW_LIMIT) {
              return new ExportStats(rows, true);
            }
            AuditLogCsvWriter.writeItem(writer, item);
            rows++;
          }
          if (items.size() < AuditLogQueryService.EXPORT_BATCH_SIZE) {
            return new ExportStats(rows, false);
          }
        } finally {
          entityManager.clear();
        }
      }
    } catch (IOException exception) {
      throw new UncheckedIOException(exception);
    }
  }

  public void writeTo(ExportFile file, Long actorId, OutputStream output) throws IOException {
    ExportStatus status = ExportStatus.SERVER_WRITE_FAILED;
    try {
      file.input.transferTo(output);
      output.flush();
      status = ExportStatus.SERVER_WRITE_COMPLETED;
    } finally {
      // Ghi xong phía server không đồng nghĩa trình duyệt đã lưu tệp thành công.
      auditWriter.recordExport(actorId, detail(file.filters, file.rows, file.truncated, status));
    }
  }

  private String filterJson(AuditLogFilterRequest filter) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("actorId", filter.actorId());
    values.put("actorKeyword", filter.actorKeyword());
    values.put("actionPrefix", filter.actionPrefix());
    values.put("action", filter.action());
    values.put("targetType", filter.targetType());
    values.put("targetId", filter.targetId());
    values.put("keyword", filter.keyword());
    values.values().removeIf(value -> value == null);
    values.put("from", filter.from().toString());
    values.put("to", filter.to().toString());
    values.put("includeHidden", filter.includeHidden());
    try {
      return objectMapper.writeValueAsString(values);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Không thể chuẩn bị bộ lọc cho nhật ký xuất CSV.", exception);
    }
  }

  private static String detail(String filters, int rows, boolean truncated, ExportStatus status) {
    return "{\"filters\":" + filters + ",\"rowsPrepared\":" + rows + ",\"truncated\":" + truncated
        + ",\"status\":\"" + status.name() + "\"}";
  }

  private static void removeTemporaryFile(Path path) {
    try {
      Files.deleteIfExists(path);
    } catch (IOException exception) {
      LOGGER.warn("Không thể xóa tệp CSV tạm do phiên xuất này tạo: {}", path, exception);
    }
  }

  private enum ExportStatus {
    SERVER_WRITE_COMPLETED, SERVER_WRITE_FAILED
  }

  private record ExportStats(int rows, boolean truncated) {
  }

  public static final class ExportFile implements AutoCloseable {
    private final Path path;
    private final InputStream input;
    private final long length;
    private final int rows;
    private final boolean truncated;
    private final String filters;
    private final String filename;

    private ExportFile(Path path, InputStream input, long length, int rows, boolean truncated,
        String filters, String filename) {
      this.path = path;
      this.input = input;
      this.length = length;
      this.rows = rows;
      this.truncated = truncated;
      this.filters = filters;
      this.filename = filename;
    }

    public int rowCount() {
      return rows;
    }

    public boolean truncated() {
      return truncated;
    }

    public long contentLength() {
      return length;
    }

    public String filename() {
      return filename;
    }

    @Override
    public void close() {
      try {
        input.close();
      } catch (IOException exception) {
        LOGGER.warn("Không thể đóng tệp CSV tạm.", exception);
      } finally {
        removeTemporaryFile(path);
      }
    }
  }
}
