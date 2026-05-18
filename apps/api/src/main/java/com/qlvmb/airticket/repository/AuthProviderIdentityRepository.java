package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AuthProviderIdentityEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthProviderIdentityRepository extends JpaRepository<AuthProviderIdentityEntity, Long> {

  @EntityGraph(attributePaths = {"userAccount", "userAccount.roles", "userAccount.roles.permissions"})
  Optional<AuthProviderIdentityEntity> findOneWithUserAccountByProviderAndProviderSubject(
      String provider,
      String providerSubject
  );
}
