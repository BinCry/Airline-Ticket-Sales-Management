package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AircraftEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AircraftRepository extends JpaRepository<AircraftEntity, Long> {
  List<AircraftEntity> findAllByOrderByRegistrationCodeAsc();
  boolean existsByRegistrationCodeIgnoreCaseAndIdNot(String registrationCode, Long id);
}
