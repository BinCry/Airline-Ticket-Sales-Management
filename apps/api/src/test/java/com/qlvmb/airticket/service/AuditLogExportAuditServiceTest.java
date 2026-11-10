package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

@ExtendWith(MockitoExtension.class)
class AuditLogExportAuditServiceTest {

  @Mock private AuditLogRepository audits;
  @Mock private UserAccountRepository users;
  @Mock private PlatformTransactionManager manager;
  private final TransactionStatus status = mock(TransactionStatus.class);
  private AuditLogExportAuditService service;

  @BeforeEach
  void setUp() {
    lenient().when(manager.getTransaction(any())).thenReturn(status);
    service = new AuditLogExportAuditService(audits, users, manager);
  }

  @Test
  void writesExactlyOneEventWithTheActorInAnIndependentWritableTransaction() {
    var actor = mock(UserAccountEntity.class);
    when(users.findById(301L)).thenReturn(Optional.of(actor));
    service.recordExport(301L, "{\"rowsPrepared\":1}");
    ArgumentCaptor<AuditLogEntity> entity = ArgumentCaptor.forClass(AuditLogEntity.class);
    verify(audits).save(entity.capture());
    assertThat(entity.getValue().getActorUserAccount()).isSameAs(actor);
    assertThat(entity.getValue().getAction()).isEqualTo("admin.audit.export");
    assertThat(entity.getValue().getTargetType()).isEqualTo("audit_log");
    assertThat(entity.getValue().getTargetId()).isEqualTo("export");
    assertThat(entity.getValue().getDetail()).isEqualTo("{\"rowsPrepared\":1}");
    ArgumentCaptor<TransactionDefinition> definition = ArgumentCaptor.forClass(TransactionDefinition.class);
    verify(manager).getTransaction(definition.capture());
    assertThat(definition.getValue().getPropagationBehavior()).isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    assertThat(definition.getValue().isReadOnly()).isFalse();
    verify(manager).commit(status);
  }

  @Test
  void persistenceFailureRollsBackWithoutEscapingToTheDownload() {
    when(users.findById(301L)).thenReturn(Optional.of(mock(UserAccountEntity.class)));
    when(audits.save(any())).thenThrow(new IllegalStateException("Audit persistence failed"));
    assertThatCode(() -> service.recordExport(301L, "{}")).doesNotThrowAnyException();
    verify(manager).rollback(status);
  }

  @Test
  void commitFailureDoesNotEscapeToTheDownload() {
    when(users.findById(301L)).thenReturn(Optional.of(mock(UserAccountEntity.class)));
    org.mockito.Mockito.doThrow(new IllegalStateException("Audit commit failed")).when(manager).commit(status);
    assertThatCode(() -> service.recordExport(301L, "{}")).doesNotThrowAnyException();
    verify(audits).save(any());
  }

  @Test
  void missingActorIsLoggedAsAFailureWithoutInventingAnAccount() {
    when(users.findById(301L)).thenReturn(Optional.empty());
    assertThatCode(() -> service.recordExport(301L, "{}")).doesNotThrowAnyException();
    verifyNoInteractions(audits);
    verify(manager).rollback(status);
  }

  @Test
  void metadataOverflowIsNotSilentlyTruncated() {
    assertThatCode(() -> service.recordExport(301L, "x".repeat(1001))).doesNotThrowAnyException();
    verifyNoInteractions(audits, users, manager);
  }
}
