package com.qlvmb.airticket.domain.mapper;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class FlightSearchMapper {

  private static final ZoneId DISPLAY_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

  public FlightSearchResponse.SearchCriteria toCriteria(
      String from,
      String to,
      String departureDate,
      String returnDate,
      String tripType,
      String fareFamily,
      int adultCount,
      int childCount,
      int infantCount
  ) {
    return new FlightSearchResponse.SearchCriteria(
        from,
        to,
        departureDate,
        returnDate,
        tripType,
        fareFamily,
        adultCount,
        childCount,
        infantCount
    );
  }

  public FlightSearchResponse.FlightCard toFlightCard(FlightFareInventoryEntity inventory, long seatsLeft) {
    FlightEntity flight = inventory.getFlight();
    OffsetDateTime departureAt = chuyenVeMuiGioHienThi(flight.getDepartureAt());
    OffsetDateTime arrivalAt = chuyenVeMuiGioHienThi(flight.getArrivalAt());

    return new FlightSearchResponse.FlightCard(
        inventory.getId(),
        flight.getId(),
        flight.getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getOriginAirport().getCode(),
        flight.getDestinationAirport().getCode(),
        departureAt.toString(),
        arrivalAt.toString(),
        formatTime(departureAt),
        formatTime(arrivalAt),
        buildDuration(departureAt, arrivalAt),
        flight.getStatus(),
        inventory.getFareFamily(),
        inventory.getPrice(),
        seatsLeft
    );
  }

  private OffsetDateTime chuyenVeMuiGioHienThi(OffsetDateTime dateTime) {
    return dateTime.atZoneSameInstant(DISPLAY_ZONE_ID).toOffsetDateTime();
  }

  private String formatTime(OffsetDateTime dateTime) {
    return dateTime.format(TIME_FORMATTER);
  }

  private String buildDuration(OffsetDateTime departureAt, OffsetDateTime arrivalAt) {
    Duration duration = Duration.between(departureAt, arrivalAt);
    long hours = duration.toHours();
    long minutes = duration.toMinutesPart();
    return hours + " giờ " + minutes + " phút";
  }
}
