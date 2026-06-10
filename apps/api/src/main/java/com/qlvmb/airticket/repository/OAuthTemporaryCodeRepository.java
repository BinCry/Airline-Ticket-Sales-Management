package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.OAuthTemporaryCodeEntity;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthTemporaryCodeRepository extends JpaRepository<OAuthTemporaryCodeEntity, Long> {

  Optional<OAuthTemporaryCodeEntity> findByStateHashAndConsumedAtIsNull(String stateHash);

  @EntityGraph(attributePaths = {"userAccount", "userAccount.roles", "userAccount.roles.permissions"})
  Optional<OAuthTemporaryCodeEntity> findByExchangeCodeHashAndConsumedAtIsNull(String exchangeCodeHash);

  long deleteByExpiresAtBefore(OffsetDateTime expiresAt);
}
