package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuditLogExportAuditService {

  private static final Logger LOGGER = LoggerFactory.getLogger(AuditLogExportAuditService.class);
  private final AuditLogRepository audits;
  private final UserAccountRepository users;
  private final TransactionTemplate transaction;

  public AuditLogExportAuditService(AuditLogRepository audits, UserAccountRepository users,
      PlatformTransactionManager transactionManager) {
    this.audits = audits;
    this.users = users;
    transaction = new TransactionTemplate(transactionManager);
    transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    transaction.setReadOnly(false);
  }

  public void recordExport(Long actorId, String detail) {
    try {
      if (detail.codePointCount(0, detail.length()) > 1000) {
        throw new IllegalStateException("Metadata xuất CSV vượt giới hạn nhật ký.");
      }
      transaction.executeWithoutResult(status -> {
        var actor = users.findById(actorId)
            .orElseThrow(() -> new IllegalStateException("Không còn tài khoản người xuất nhật ký."));
        audits.save(AuditLogEntity.create(actor, "admin.audit.export", "audit_log", "export", detail,
            OffsetDateTime.now(ZoneOffset.UTC)));
      });
    } catch (RuntimeException exception) {
      // Bắt lỗi sau khi transaction riêng đã kết thúc, không chặn tệp CSV.
      LOGGER.error("Không ghi được nhật ký xuất CSV; actorId={}", actorId, exception);
    }
  }
}
