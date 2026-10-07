package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AircraftTypeEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AircraftTypeRepository extends JpaRepository<AircraftTypeEntity, Long> {
  List<AircraftTypeEntity> findAllByOrderByCodeAsc();
  boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
