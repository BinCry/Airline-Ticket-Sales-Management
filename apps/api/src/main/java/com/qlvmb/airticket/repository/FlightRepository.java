package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.FlightEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FlightRepository extends JpaRepository<FlightEntity, Long> {

  boolean existsByCodeIgnoreCase(String code);

  @Query("""
      select distinct flight from FlightEntity flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      left join fetch flight.fareInventories fareInventory
      where flight.originAirport.code = :from
        and flight.destinationAirport.code = :to
        and flight.departureAt >= :start
        and flight.departureAt < :end
        and flight.hiddenAt is null
      order by flight.departureAt asc
      """)
  List<FlightEntity> searchRoute(
      @Param("from") String from,
      @Param("to") String to,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end
  );

  @Query("""
      select flight from FlightEntity flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      where upper(flight.code) = upper(:code)
        and flight.hiddenAt is null
      """)
  Optional<FlightEntity> findStatusByCode(@Param("code") String code);

  @Query("""
      select flight from FlightEntity flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      where flight.departureAt >= :start
        and flight.departureAt < :end
        and flight.hiddenAt is null
      order by flight.departureAt asc
      """)
  List<FlightEntity> findStatusesByDepartureWindow(
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end
  );

  @Query("""
      select flight from FlightEntity flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      left join fetch flight.fareInventories fareInventory
      where flight.id = :flightId
        and flight.hiddenAt is null
      """)
  Optional<FlightEntity> findDetailedById(@Param("flightId") Long flightId);

  @Query("""
      select flight from FlightEntity flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      left join fetch flight.fareInventories fareInventory
      where flight.id = :flightId
      """)
  Optional<FlightEntity> findDetailedIncludingHiddenById(@Param("flightId") Long flightId);
}
