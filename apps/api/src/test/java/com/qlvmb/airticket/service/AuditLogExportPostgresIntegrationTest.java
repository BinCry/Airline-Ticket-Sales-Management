package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.IntConsumer;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_ALLOW_WRITES", matches = "true")
class AuditLogExportPostgresIntegrationTest {
  private static AuditLogPostgresTestSupport.IntegrationSession session;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  @BeforeAll
  static void openApprovedContext() throws Exception {
    session = AuditLogPostgresTestSupport.openIntegration();
  }

  @AfterAll
  static void closeContextWithoutDeletingData() {
    if (session != null) {
      session.close();
    }
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 499, 500, 501, 9999, 10000, 10001})
  void exportsRealBatchesAndRecordsTheActualTruncation(int count) throws Exception {
    String scope = scope();
    long actor = session.actor("Người xuất CSV");
    session.bulkLogs(scope, count, "dữ liệu kiểm thử");
    List<Integer> batches = new ArrayList<>();
    AuditLogQueryService observed = new ObservedQueries(batch -> {
      assertThat(session.jdbc().queryForObject("select current_setting('transaction_isolation')", String.class))
          .isEqualTo("repeatable read");
      batches.add(batch);
    });
    AuditLogExportService export = exportWith(observed);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (var file = export.prepare(filter(scope))) {
      assertThat(file.rowCount()).isEqualTo(Math.min(count, 10000));
      assertThat(file.truncated()).isEqualTo(count > 10000);
      export.writeTo(file, actor, output);
      assertThat(output.size()).isEqualTo(file.contentLength());
    }
    // Fixture của case này không có xuống dòng trong ô; số dòng CSV có thể đếm trực tiếp.
    assertThat(output.toString(StandardCharsets.UTF_8).lines().count())
        .isEqualTo(Math.min(count, 10000) + 1L);
    assertThat(batches).containsExactlyElementsOf(java.util.stream.IntStream.rangeClosed(0, count / 500)
        .boxed().toList());
    JsonNode event = exportEvent(actor);
    assertThat(event.path("rowsPrepared").asInt()).isEqualTo(Math.min(count, 10000));
    assertThat(event.path("truncated").asBoolean()).isEqualTo(count > 10000);
    assertThat(event.path("status").asText()).isEqualTo("SERVER_WRITE_COMPLETED");
    assertThat(event.path("filters").path("targetId").asText()).isEqualTo(scope);
  }

  @ParameterizedTest
  @ValueSource(strings = {"  =SUM(1,2)", "\t+42", "\u0001-1", "\u200b@SUM(1,2)"})
  void preservesVietnameseCsvAndNeutralizesFormulasAfterInvisibleCharacters(String formula) throws Exception {
    String scope = scope();
    long actor = session.actor("Người xuất tiếng Việt");
    String detail = formula + ", \"Nội dung\"\r\nDòng thứ hai";
    session.log(null, "test.audit.created", scope, detail,
        OffsetDateTime.parse("2026-10-25T05:00:00Z"), false);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (var file = session.exports().prepare(filter(scope))) {
      assertThat(file.rowCount()).isEqualTo(1);
      session.exports().writeTo(file, actor, output);
    }
    byte[] bytes = output.toByteArray();
    assertThat(bytes[0] & 255).isEqualTo(0xef);
    assertThat(bytes[1] & 255).isEqualTo(0xbb);
    assertThat(bytes[2] & 255).isEqualTo(0xbf);
    assertThat(output.toString(StandardCharsets.UTF_8)).startsWith("\ufeff\"id\"")
        .contains("\"'" + detail.replace("\"", "\"\"") + "\"");
    assertThat(exportEvent(actor).path("rowsPrepared").asInt()).isEqualTo(1);
  }

  @Test
  void keepsOneSnapshotWhileAnotherConnectionCommitsBetweenBatchesAndClearsManagedEntities() throws Exception {
    String scope = scope();
    long actor = session.actor("Người kiểm thử snapshot");
    session.bulkLogs(scope, 501, "snapshot-original");
    CountDownLatch firstBatch = new CountDownLatch(1);
    CountDownLatch committed = new CountDownLatch(1);
    var executor = Executors.newSingleThreadExecutor();
    var writer = executor.submit(() -> {
      try {
        if (!firstBatch.await(10, TimeUnit.SECONDS)) {
          throw new IllegalStateException("Không nhận được mốc đồng bộ lô đầu tiên.");
        }
        session.write(() -> session.jdbc().update(
            "update audit_log set hidden_at=now(), detail='snapshot-changed' where target_id=?", scope));
        session.bulkLogs(scope, 1, "snapshot-new");
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException("Luồng kiểm thử đồng thời bị ngắt.");
      } finally {
        committed.countDown();
      }
    });
    var observed = new ObservedQueries(batch -> {
      assertThat(session.jdbc().queryForObject("select current_setting('transaction_read_only')", String.class))
          .isEqualTo("on");
      if (batch == 0) {
        firstBatch.countDown();
        try {
          assertThat(committed.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException exception) {
          Thread.currentThread().interrupt();
          throw new IllegalStateException("Đợi transaction đồng thời bị ngắt.");
        }
      }
    });
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try {
      AuditLogExportService export = exportWith(observed);
      try (var file = export.prepare(filter(scope))) {
        writer.get(10, TimeUnit.SECONDS);
        assertThat(file.rowCount()).isEqualTo(501);
        export.writeTo(file, actor, output);
      }
      assertThat(output.toString(StandardCharsets.UTF_8))
          .contains("snapshot-original").doesNotContain("snapshot-new", "snapshot-changed");
      assertThat(session.queries().getAuditLogs(filter(scope)).totalElements()).isEqualTo(1);
      assertThat(session.queries().getAuditLogs(filter(scope)).items().getFirst().detail()).isEqualTo("snapshot-new");
    } finally {
      firstBatch.countDown();
      executor.shutdownNow();
      assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
    }
  }

  @Test
  void commitsExportAuditIndependentlyOfAnOuterTransactionRollback() throws Exception {
    String scope = scope();
    long actor = session.actor("Người kiểm thử transaction");
    session.bulkLogs(scope, 1, "transaction");
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (var file = session.exports().prepare(filter(scope))) {
      var outer = new TransactionTemplate(session.manager());
      outer.executeWithoutResult(status -> {
        session.jdbc().update("""
            insert into audit_log(action,target_type,target_id,detail,created_at)
            values ('test.rollback','audit_test',?,'rollback-marker',now())
            """, scope);
        try {
          session.exports().writeTo(file, actor, output);
        } catch (IOException exception) {
          throw new UncheckedIOException(exception);
        }
        status.setRollbackOnly();
      });
    }
    assertThat(session.jdbc().queryForObject(
        "select count(*) from audit_log where target_id=? and action='test.rollback'", Long.class, scope)).isZero();
    assertThat(exportEvent(actor).path("status").asText()).isEqualTo("SERVER_WRITE_COMPLETED");
    assertThat(output.size()).isPositive();
  }

  @Test
  void missingAuditActorDoesNotBreakThePreparedCsv() throws Exception {
    String scope = scope();
    session.bulkLogs(scope, 1, "không còn actor xuất");
    assertThat(session.jdbc().queryForObject("select count(*) from user_account where id=?",
        Long.class, Long.MAX_VALUE)).isZero();
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (var file = session.exports().prepare(filter(scope))) {
      session.exports().writeTo(file, Long.MAX_VALUE, output);
    }
    assertThat(output.toString(StandardCharsets.UTF_8)).contains("không còn actor xuất");
    assertThat(session.jdbc().queryForObject("""
        select count(*) from audit_log where action='admin.audit.export' and actor_user_id=?
        """, Long.class, Long.MAX_VALUE)).isZero();
  }

  @Test
  void transmissionFailureRecordsOneFailedServerWrite() throws Exception {
    String scope = scope();
    long actor = session.actor("Người kiểm thử lỗi truyền");
    session.bulkLogs(scope, 1, "lỗi truyền");
    try (var file = session.exports().prepare(filter(scope))) {
      OutputStream broken = new OutputStream() {
        @Override
        public void write(int value) throws IOException {
          throw new IOException("Lỗi truyền giả lập của integration test.");
        }
      };
      assertThatThrownBy(() -> session.exports().writeTo(file, actor, broken)).isInstanceOf(IOException.class);
    }
    assertThat(exportEvent(actor).path("status").asText()).isEqualTo("SERVER_WRITE_FAILED");
  }

  private static JsonNode exportEvent(long actor) throws Exception {
    List<String> details = session.jdbc().queryForList("""
        select detail from audit_log where actor_user_id=? and action='admin.audit.export'
        """, String.class, actor);
    assertThat(details).hasSize(1);
    return MAPPER.readTree(details.getFirst());
  }

  private static AuditLogExportService exportWith(AuditLogQueryService queries) {
    return new AuditLogExportService(queries, session.auditWriter(), session.entityManager(), MAPPER, session.manager());
  }

  private static final class ObservedQueries extends AuditLogQueryService {
    private final IntConsumer afterBatch;

    private ObservedQueries(IntConsumer afterBatch) {
      super(session.repository());
      this.afterBatch = afterBatch;
    }

    @Override
    public List<AuditLogItemResponse> getExportBatch(AuditLogFilterRequest filter, int batch) {
      AuditLogPostgresTestSupport.requireIntegrationApproval();
      if (batch > 0) {
        assertThat(session.entityManager().unwrap(Session.class).getStatistics().getEntityCount()).isZero();
      }
      // Dùng kết quả SQL/JPA thật; chỉ đặt điểm quan sát, không giả lập dữ liệu trả về.
      List<AuditLogItemResponse> items = session.queries().getExportBatch(filter, batch);
      assertThat(items).hasSizeLessThanOrEqualTo(500);
      afterBatch.accept(batch);
      return items;
    }
  }

  private static AuditLogFilterRequest filter(String target) {
    return new AuditLogFilterRequest(0, 20, null, null, null, null, null, target,
        LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 25), null, false);
  }

  private static String scope() {
    return "audit-export-it-" + UUID.randomUUID();
  }
}
