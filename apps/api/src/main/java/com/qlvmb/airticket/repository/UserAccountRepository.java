package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAccountRepository extends JpaRepository<UserAccountEntity, Long> {

  Optional<UserAccountEntity> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);

  @EntityGraph(attributePaths = {"roles", "roles.permissions"})
  Optional<UserAccountEntity> findOneWithRolesByEmailIgnoreCase(String email);

  @EntityGraph(attributePaths = {"roles", "roles.permissions"})
  Optional<UserAccountEntity> findOneWithRolesById(Long id);

  @EntityGraph(attributePaths = {"roles", "roles.permissions"})
  List<UserAccountEntity> findAllByOrderByCreatedAtDesc();

  @Query("""
      select count(userAccount)
      from UserAccountEntity userAccount
      join userAccount.roles role
      where role.code = :roleCode
        and userAccount.status = 'active'
        and userAccount.lockedAt is null
      """)
  long countActiveUsersByRoleCode(@Param("roleCode") String roleCode);
}
