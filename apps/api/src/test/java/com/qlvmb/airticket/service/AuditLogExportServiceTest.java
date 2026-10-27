package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import com.qlvmb.airticket.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

@ExtendWith(MockitoExtension.class)
class AuditLogExportServiceTest {

  @Mock private AuditLogQueryService queries;
  @Mock private AuditLogExportAuditService auditWriter;
  @Mock private EntityManager entityManager;
  @Mock private PlatformTransactionManager manager;
  private final TransactionStatus status = mock(TransactionStatus.class);
  private final ObjectMapper mapper = new ObjectMapper();
  private AuditLogExportService service;

  @BeforeEach
  void setUp() {
    lenient().when(manager.getTransaction(any())).thenReturn(status);
    service = new AuditLogExportService(queries, auditWriter, entityManager, mapper, manager);
  }

  @Test
  void acceptsNinetyInclusiveDaysAndEmptyResults() throws Exception {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31), null);
    when(queries.getExportBatch(filter, 0)).thenReturn(List.of());
    Path path;
    try (var file = service.prepare(filter)) {
      path = (Path) ReflectionTestUtils.getField(file, "path");
      assertThat(file.rowCount()).isZero();
      assertThat(file.truncated()).isFalse();
      assertThat(file.filename()).isEqualTo("audit-logs-2026-01-01_2026-03-31.csv");
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      service.writeTo(file, 301L, output);
      assertThat(output.size()).isEqualTo(file.contentLength());
      assertThat(output.toString(StandardCharsets.UTF_8)).startsWith("\ufeff\"id\"");
      assertThat(Files.exists(path)).isTrue();
    }
    assertThat(Files.exists(path)).isFalse();
    verify(auditWriter).recordExport(eq(301L), any());
    verify(manager).commit(status);
  }

  @Test
  void rejectsNinetyOneDaysBeforeStartingAnyTransaction() {
    assertThatThrownBy(() -> service.prepare(filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 1), null)))
        .isInstanceOf(BadRequestException.class);
    verifyNoInteractions(queries, manager, auditWriter, entityManager);
  }

  @Test
  void rejectsMissingDateBoundsAndMissingRequest() {
    assertThatThrownBy(() -> service.prepare(null)).isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> service.prepare(filter(null, LocalDate.of(2026, 1, 1), null)))
        .isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> service.prepare(filter(LocalDate.of(2026, 1, 1), null, null)))
        .isInstanceOf(BadRequestException.class);
    verifyNoInteractions(queries, manager, auditWriter, entityManager);
  }

  @Test
  void rejectsMetadataThatCannotFitWithoutTruncationBeforeQuerying() {
    assertThatThrownBy(() -> service.prepare(filter(LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 1, 2), "x".repeat(1000))))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("ghi đầy đủ");
    verifyNoInteractions(queries, manager, auditWriter, entityManager);
  }

  @Test
  void readsAllBatchesInOneRepeatableReadTransactionAndChecksRowTenThousandAndOne() throws Exception {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(eq(filter), anyInt())).thenAnswer(invocation ->
        invocation.<Integer>getArgument(1) < 20 ? Collections.nCopies(500, item()) : List.of(item()));
    try (var file = service.prepare(filter)) {
      assertThat(file.rowCount()).isEqualTo(10000);
      assertThat(file.truncated()).isTrue();
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      service.writeTo(file, 301L, output);
      assertThat(output.toString(StandardCharsets.UTF_8).lines().count()).isEqualTo(10001);
    }
    ArgumentCaptor<TransactionDefinition> definition = ArgumentCaptor.forClass(TransactionDefinition.class);
    verify(manager).getTransaction(definition.capture());
    assertThat(definition.getValue().getIsolationLevel()).isEqualTo(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    assertThat(definition.getValue().getPropagationBehavior()).isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    assertThat(definition.getValue().isReadOnly()).isTrue();
    verify(entityManager, times(21)).clear();
    verify(queries).getExportBatch(filter, 20);
    ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
    verify(auditWriter).recordExport(eq(301L), detail.capture());
    var json = mapper.readTree(detail.getValue());
    assertThat(json.path("rowsPrepared").asInt()).isEqualTo(10000);
    assertThat(json.path("truncated").asBoolean()).isTrue();
    assertThat(json.path("status").asText()).isEqualTo("SERVER_WRITE_COMPLETED");
  }

  @Test
  void exactlyTenThousandRowsAreNotReportedAsTruncated() {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(eq(filter), anyInt())).thenAnswer(invocation ->
        invocation.<Integer>getArgument(1) < 20 ? Collections.nCopies(500, item()) : List.of());
    try (var file = service.prepare(filter)) {
      assertThat(file.rowCount()).isEqualTo(10000);
      assertThat(file.truncated()).isFalse();
    }
    verify(queries).getExportBatch(filter, 20);
    verifyNoInteractions(auditWriter);
  }

  @Test
  void shortFinalBatchStopsWithoutAFalseWarning() {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(filter, 0)).thenReturn(Collections.nCopies(500, item()));
    when(queries.getExportBatch(filter, 1)).thenReturn(List.of(item()));
    try (var file = service.prepare(filter)) {
      assertThat(file.rowCount()).isEqualTo(501);
      assertThat(file.truncated()).isFalse();
    }
    verify(queries, times(2)).getExportBatch(eq(filter), anyInt());
  }

  @Test
  void rowLimitStillHoldsIfAnUnexpectedBatchExceedsTheRequestedSize() throws Exception {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(filter, 0)).thenReturn(Collections.nCopies(10001, item()));
    try (var file = service.prepare(filter)) {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      service.writeTo(file, 301L, output);
      assertThat(file.rowCount()).isEqualTo(10000);
      assertThat(file.truncated()).isTrue();
      assertThat(output.toString(StandardCharsets.UTF_8).lines().count()).isEqualTo(10001);
    }
  }

  @Test
  void queryFailureRollsBackPreparationAndIsNotReportedAsAnAuditWriteFailure() {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    RuntimeException failure = new IllegalStateException("Query failed");
    when(queries.getExportBatch(filter, 0)).thenThrow(failure);
    assertThatThrownBy(() -> service.prepare(filter)).isSameAs(failure);
    verify(manager).rollback(status);
    verifyNoInteractions(auditWriter);
  }

  @Test
  void transmissionFailureRemainsAnIoFailureAndRecordsOnlyOneFailedServerWrite() throws Exception {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(filter, 0)).thenReturn(List.of(item()));
    IOException failure = new IOException("Client disconnected");
    try (var file = service.prepare(filter)) {
      assertThatThrownBy(() -> service.writeTo(file, 301L, new OutputStream() {
        @Override public void write(int value) throws IOException { throw failure; }
      })).isSameAs(failure);
    }
    ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
    verify(auditWriter).recordExport(eq(301L), detail.capture());
    assertThat(mapper.readTree(detail.getValue()).path("status").asText()).isEqualTo("SERVER_WRITE_FAILED");
  }

  @Test
  void auditMetadataPreservesTheNormalizedFiltersAndDistinguishesTheAuthenticatedActor() throws Exception {
    var filter = new AuditLogFilterRequest(9, 1, "none", " An ", "ops", "ops.change", "flight", "VN%_\\",
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), "Đổi\"\n%_\\", true);
    when(queries.getExportBatch(filter, 0)).thenReturn(List.of(item()));
    try (var file = service.prepare(filter)) {
      service.writeTo(file, 301L, new ByteArrayOutputStream());
    }
    ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
    verify(auditWriter).recordExport(eq(301L), detail.capture());
    var json = mapper.readTree(detail.getValue());
    assertThat(json.path("filters").path("actorId").asText()).isEqualTo("none");
    assertThat(json.path("filters").path("actorKeyword").asText()).isEqualTo("An");
    assertThat(json.path("filters").path("keyword").asText()).isEqualTo(filter.keyword());
    assertThat(json.path("filters").path("includeHidden").asBoolean()).isTrue();
    assertThat(json.path("filters").has("page")).isFalse();
    assertThat(detail.getValue().codePointCount(0, detail.getValue().length())).isLessThanOrEqualTo(1000);
  }

  @Test
  void aFlushFailureDoesNotClaimThatTheServerFinishedWriting() throws Exception {
    var filter = filter(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), null);
    when(queries.getExportBatch(filter, 0)).thenReturn(List.of(item()));
    IOException failure = new IOException("Flush failed");
    try (var file = service.prepare(filter)) {
      assertThatThrownBy(() -> service.writeTo(file, 301L, new ByteArrayOutputStream() {
        @Override public void flush() throws IOException { throw failure; }
      })).isSameAs(failure);
    }
    ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
    verify(auditWriter).recordExport(eq(301L), detail.capture());
    assertThat(mapper.readTree(detail.getValue()).path("status").asText()).isEqualTo("SERVER_WRITE_FAILED");
  }

  private AuditLogFilterRequest filter(LocalDate from, LocalDate to, String keyword) {
    return new AuditLogFilterRequest(null, null, null, null, null, null, null, null, from, to, keyword, false);
  }

  private AuditLogItemResponse item() {
    return new AuditLogItemResponse(1L, null, null, null, "system.action", "flight", "VN1", "Nội dung",
        OffsetDateTime.parse("2026-01-01T00:00:00Z"), false);
  }
}
