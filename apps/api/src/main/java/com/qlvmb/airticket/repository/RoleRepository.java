package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.RoleEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {

  Optional<RoleEntity> findByCode(String code);

  @EntityGraph(attributePaths = "permissions")
  List<RoleEntity> findAllByCodeIn(Collection<String> codes);
}
