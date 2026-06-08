package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FlightBookingOptionsResponse;
import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.mapper.FlightSearchMapper;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.BookingSeatSelectionRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FlightSearchService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final String BOOKING_OPTIONS_NOT_FOUND_MESSAGE =
      "Không tìm thấy chuyến bay được chọn.";
  private static final String PUBLIC_BOOKING_CLOSED_MESSAGE =
      "Chuyến bay hiện không còn mở bán.";
  private static final List<String> SEARCH_FILTERS = List.of(
      "Giờ bay",
      "Ngân sách",
      "Còn ghế"
  );

  private final AirportRepository airportRepository;
  private final BookingService bookingService;
  private final BookingSeatSelectionRepository bookingSeatSelectionRepository;
  private final FlightRepository flightRepository;
  private final ProductCatalogService productCatalogService;
  private final FlightSearchMapper flightSearchMapper;

  public FlightSearchService(
      AirportRepository airportRepository,
      BookingService bookingService,
      BookingSeatSelectionRepository bookingSeatSelectionRepository,
      FlightRepository flightRepository,
      ProductCatalogService productCatalogService,
      FlightSearchMapper flightSearchMapper
  ) {
    this.airportRepository = airportRepository;
    this.bookingService = bookingService;
    this.bookingSeatSelectionRepository = bookingSeatSelectionRepository;
    this.flightRepository = flightRepository;
    this.productCatalogService = productCatalogService;
    this.flightSearchMapper = flightSearchMapper;
  }

  @Transactional
  public FlightSearchResponse searchFlights(
      String from,
      String to,
      LocalDate departureDate,
      LocalDate returnDate,
      String tripType,
      int adultCount,
      int childCount,
      int infantCount
  ) {
    String normalizedFrom = normalizeAirportCode(from);
    String normalizedTo = normalizeAirportCode(to);
    String normalizedTripType = normalizeTripType(tripType);

    validateRequest(
        normalizedFrom,
        normalizedTo,
        departureDate,
        returnDate,
        normalizedTripType,
        adultCount,
        childCount,
        infantCount
    );

    List<FlightSearchResponse.FlightCard> outboundFlights =
        searchDirection(normalizedFrom, normalizedTo, departureDate);

    List<FlightSearchResponse.FlightCard> returnFlights = "round_trip".equals(normalizedTripType)
        ? searchDirection(normalizedTo, normalizedFrom, returnDate)
        : List.of();
    List<FlightSearchResponse.FlightCard> allFlights = concatFlights(outboundFlights, returnFlights);

    FlightSearchResponse.SearchCriteria criteria = flightSearchMapper.toCriteria(
        normalizedFrom,
        normalizedTo,
        departureDate.toString(),
        returnDate == null ? null : returnDate.toString(),
        normalizedTripType,
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

  @Transactional
  public FlightBookingOptionsResponse getBookingOptions(Long flightId) {
    FlightEntity flight = flightRepository.findDetailedById(flightId)
        .orElseThrow(() -> new BadRequestException(BOOKING_OPTIONS_NOT_FOUND_MESSAGE));

    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    reconcileExpiredHoldsForFlight(flight, currentTime);

    if (!PublicFlightWindowPolicy.isPublicBookingOpen(flight, currentTime)) {
      throw new BadRequestException(PUBLIC_BOOKING_CLOSED_MESSAGE);
    }

    List<FlightBookingOptionsResponse.FareOptionItem> fareOptions = buildBookingFareOptions(flight);
    Set<String> occupiedSeats = new LinkedHashSet<>(
        bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(flightId, currentTime)
    );

    return new FlightBookingOptionsResponse(
        flight.getId(),
        flight.getCode(),
        flight.getOriginAirport().getCode(),
        flight.getDestinationAirport().getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getDepartureAt(),
        flight.getArrivalAt(),
        productCatalogService.resolveBaseFare(flight.getFareInventories()),
        fareOptions,
        buildSeatItems(occupiedSeats)
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
      LocalDate date
  ) {
    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    OffsetDateTime start = date.atStartOfDay(ZONE_ID).toOffsetDateTime();
    OffsetDateTime end = date.plusDays(1).atStartOfDay(ZONE_ID).toOffsetDateTime();
    List<FlightEntity> flights = flightRepository.searchRoute(from, to, start, end);
    reconcileExpiredHoldsForFlights(flights, currentTime);

    return flights.stream()
        .filter(flight -> PublicFlightWindowPolicy.isPublicBookingOpen(flight, currentTime))
        .map(flight -> {
          List<FlightSearchResponse.FareOption> fareOptions = buildFareOptions(flight);
          if (fareOptions.isEmpty()) {
            return null;
          }
          return flightSearchMapper.toFlightCard(
              flight,
              productCatalogService.resolveBaseFare(flight.getFareInventories()),
              fareOptions
          );
        })
        .filter(Objects::nonNull)
        .sorted(Comparator.comparing(FlightSearchResponse.FlightCard::departureAt))
        .toList();
  }

  private void reconcileExpiredHoldsForFlights(
      Collection<FlightEntity> flights,
      OffsetDateTime currentTime
  ) {
    List<Long> inventoryIds = flights.stream()
        .flatMap(flight -> flight.getFareInventories().stream())
        .map(FlightFareInventoryEntity::getId)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    bookingService.reconcileExpiredHoldsForInventories(inventoryIds, currentTime);
  }

  private void reconcileExpiredHoldsForFlight(
      FlightEntity flight,
      OffsetDateTime currentTime
  ) {
    List<Long> inventoryIds = flight.getFareInventories().stream()
        .map(FlightFareInventoryEntity::getId)
        .filter(Objects::nonNull)
        .toList();
    bookingService.reconcileExpiredHoldsForInventories(inventoryIds, currentTime);
  }

  private List<FlightSearchResponse.FareOption> buildFareOptions(FlightEntity flight) {
    return productCatalogService.getFixedFareMetas().stream()
        .map(fareMeta -> flight.findFareInventory(fareMeta.fareFamily())
            .map(inventory -> new FlightSearchResponse.FareOption(
                inventory.getId(),
                fareMeta.fareFamily(),
                fareMeta.title(),
                inventory.getPrice(),
                inventory.getAvailableSeats(),
                inventory.getTotalSeats()
            ))
            .orElse(null))
        .filter(Objects::nonNull)
        .filter(fareOption -> fareOption.seatsLeft() > 0)
        .toList();
  }

  private List<FlightBookingOptionsResponse.FareOptionItem> buildBookingFareOptions(FlightEntity flight) {
    return productCatalogService.getFixedFareMetas().stream()
        .map(fareMeta -> flight.findFareInventory(fareMeta.fareFamily())
            .map(inventory -> new FlightBookingOptionsResponse.FareOptionItem(
                inventory.getId(),
                fareMeta.fareFamily(),
                fareMeta.title(),
                inventory.getPrice(),
                inventory.getAvailableSeats(),
                inventory.getTotalSeats(),
                fareMeta.rowStart(),
                fareMeta.rowEnd()
            ))
            .orElse(null))
        .filter(Objects::nonNull)
        .toList();
  }

  private List<FlightBookingOptionsResponse.SeatItem> buildSeatItems(Collection<String> occupiedSeats) {
    Set<String> occupiedSeatSet = occupiedSeats.stream()
        .map(String::toUpperCase)
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    List<String> seatLetters = List.of("A", "B", "C", "D", "E", "F");

    return java.util.stream.IntStream.rangeClosed(1, 28)
        .boxed()
        .flatMap(rowNumber -> seatLetters.stream().map(seatLetter -> rowNumber + seatLetter))
        .map(seatNumber -> new FlightBookingOptionsResponse.SeatItem(
            seatNumber,
            productCatalogService.resolveFareFamilyBySeatNumber(seatNumber),
            occupiedSeatSet.contains(seatNumber)
        ))
        .toList();
  }

  private void validateRequest(
      String from,
      String to,
      LocalDate departureDate,
      LocalDate returnDate,
      String tripType,
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
      throw new BadRequestException("Số lượng em bé không được vượt quá số người lớn.");
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
      return "one_way";
    }
    String normalizedTripType = tripType.trim().toLowerCase();
    if (!List.of("one_way", "round_trip").contains(normalizedTripType)) {
      throw new BadRequestException("Loại hành trình không hợp lệ.");
    }
    return normalizedTripType;
  }
}
