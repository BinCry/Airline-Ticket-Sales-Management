package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.mapper.FlightSearchMapper;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FlightSearchService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final List<String> SEARCH_FILTERS = List.of(
      "Giờ bay",
      "Gói giá",
      "Ngân sách",
      "Còn ghế"
  );

  private final AirportRepository airportRepository;
  private final FlightRepository flightRepository;
  private final ProductCatalogService productCatalogService;
  private final FlightSearchMapper flightSearchMapper;

  public FlightSearchService(
      AirportRepository airportRepository,
      FlightRepository flightRepository,
      ProductCatalogService productCatalogService,
      FlightSearchMapper flightSearchMapper
  ) {
    this.airportRepository = airportRepository;
    this.flightRepository = flightRepository;
    this.productCatalogService = productCatalogService;
    this.flightSearchMapper = flightSearchMapper;
  }

  @Transactional(readOnly = true)
  public FlightSearchResponse searchFlights(
      String from,
      String to,
      LocalDate departureDate,
      LocalDate returnDate,
      String tripType,
      String fareFamily,
      int adultCount,
      int childCount,
      int infantCount
  ) {
    String normalizedFrom = normalizeAirportCode(from);
    String normalizedTo = normalizeAirportCode(to);
    String normalizedTripType = normalizeTripType(tripType);
    String normalizedFareFamily = normalizeFareFamily(fareFamily);

    validateRequest(
        normalizedFrom,
        normalizedTo,
        departureDate,
        returnDate,
        normalizedTripType,
        normalizedFareFamily,
        adultCount,
        childCount,
        infantCount
    );

    List<FlightSearchResponse.FlightCard> outboundFlights =
        searchDirection(normalizedFrom, normalizedTo, departureDate, normalizedFareFamily);

    List<FlightSearchResponse.FlightCard> returnFlights = "round_trip".equals(normalizedTripType)
        ? searchDirection(normalizedTo, normalizedFrom, returnDate, normalizedFareFamily)
        : List.of();
    List<FlightSearchResponse.FlightCard> allFlights = concatFlights(outboundFlights, returnFlights);

    FlightSearchResponse.SearchCriteria criteria = flightSearchMapper.toCriteria(
        normalizedFrom,
        normalizedTo,
        departureDate.toString(),
        returnDate == null ? null : returnDate.toString(),
        normalizedTripType,
        normalizedFareFamily,
        adultCount,
        childCount,
        infantCount
    );

    return new FlightSearchResponse(
        normalizedTripType,
        normalizedFrom,
        normalizedTo,
        SEARCH_FILTERS,
        allFlights,
        productCatalogService.buildFareCards(allFlights),
        criteria,
        outboundFlights,
        returnFlights
    );
  }

  private List<FlightSearchResponse.FlightCard> concatFlights(
      List<FlightSearchResponse.FlightCard> outboundFlights,
      List<FlightSearchResponse.FlightCard> returnFlights
  ) {
    return java.util.stream.Stream.concat(outboundFlights.stream(), returnFlights.stream()).toList();
  }

  private List<FlightSearchResponse.FlightCard> searchDirection(
      String from,
      String to,
      LocalDate date,
      String fareFamily
  ) {
    OffsetDateTime start = date.atStartOfDay(ZONE_ID).toOffsetDateTime();
    OffsetDateTime end = date.plusDays(1).atStartOfDay(ZONE_ID).toOffsetDateTime();
    List<FlightEntity> flights = flightRepository.searchRoute(from, to, start, end);
    List<FlightFareInventoryEntity> inventories = flights.stream()
        .filter(FlightEntity::isSalesOpen)
        .filter(flight -> !"cancelled".equals(flight.getStatus()))
        .flatMap(flight -> flight.getFareInventories().stream())
        .filter(inventory -> fareFamily == null || Objects.equals(inventory.getFareFamily(), fareFamily))
        .toList();

    if (inventories.isEmpty()) {
      return List.of();
    }

    return inventories.stream()
        .map(inventory -> flightSearchMapper.toFlightCard(inventory, inventory.getAvailableSeats()))
        .filter(card -> card.seatsLeft() > 0)
        .toList();
  }

  private void validateRequest(
      String from,
      String to,
      LocalDate departureDate,
      LocalDate returnDate,
      String tripType,
      String fareFamily,
      int adultCount,
      int childCount,
      int infantCount
  ) {
    if (departureDate == null) {
      throw new BadRequestException("Ngày đi không được để trống.");
    }
    validateAirportCode(from, "đi");
    validateAirportCode(to, "đến");
    if (Objects.equals(from, to)) {
      throw new BadRequestException("Sân bay đi và đến không được trùng nhau.");
    }
    if ("round_trip".equals(tripType) && returnDate == null) {
      throw new BadRequestException("Hành trình khứ hồi cần có ngày về.");
    }
    if (returnDate != null && returnDate.isBefore(departureDate)) {
      throw new BadRequestException("Ngày về không được trước ngày đi.");
    }
    if (adultCount < 1) {
      throw new BadRequestException("Phải có ít nhất 1 người lớn.");
    }
    if (childCount < 0 || infantCount < 0) {
      throw new BadRequestException("Số lượng hành khách không hợp lệ.");
    }
    if (adultCount + childCount + infantCount > 9) {
      throw new BadRequestException("Tổng số hành khách vượt quá giới hạn 9 người.");
    }
    if (infantCount > adultCount) {
      throw new BadRequestException("Số lượng em bé không được vượt số người lớn.");
    }
    if (fareFamily != null) {
      productCatalogService.requireFareMeta(fareFamily);
    }
  }

  private void validateAirportCode(String airportCode, String directionLabel) {
    if (!airportRepository.existsByCodeIgnoreCase(airportCode)) {
      throw new BadRequestException("Mã sân bay " + directionLabel + " không hợp lệ.");
    }
  }

  private String normalizeAirportCode(String airportCode) {
    if (airportCode == null || airportCode.isBlank()) {
      throw new BadRequestException("Mã sân bay không được để trống.");
    }
    return airportCode.trim().toUpperCase();
  }

  private String normalizeTripType(String tripType) {
    if (tripType == null || tripType.isBlank()) {
      return "round_trip";
    }
    String normalizedTripType = tripType.trim().toLowerCase();
    if ("multi_city".equals(normalizedTripType)) {
      throw new BadRequestException("Hiện tại hệ thống chưa hỗ trợ hành trình nhiều chặng.");
    }
    if (!List.of("one_way", "round_trip").contains(normalizedTripType)) {
      throw new BadRequestException("Loại hành trình không hợp lệ.");
    }
    return normalizedTripType;
  }

  private String normalizeFareFamily(String fareFamily) {
    if (fareFamily == null || fareFamily.isBlank()) {
      return null;
    }
    return productCatalogService.normalizeFareFamily(fareFamily);
  }
}
