package com.qlvmb.airticket.repository;
import com.qlvmb.airticket.domain.entity.FlightChangeEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FlightChangeEventRepository extends JpaRepository<FlightChangeEventEntity,Long>{}
