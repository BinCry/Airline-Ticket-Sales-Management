package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.FlightBookingOptionsResponse;
import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.mapper.FlightSearchMapper;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.BookingSeatSelectionRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class FlightSearchServiceTest {

  @Mock
  private AirportRepository airportRepository;

  @Mock
  private BookingService bookingService;

  @Mock
  private FlightRepository flightRepository;

  @Mock
  private BookingSeatSelectionRepository bookingSeatSelectionRepository;

  private FlightSearchService flightSearchService;

  @BeforeEach
  void setUp() {
    flightSearchService = new FlightSearchService(
        airportRepository,
        bookingService,
        bookingSeatSelectionRepository,
        flightRepository,
        new ProductCatalogService(),
        new FlightSearchMapper()
    );
  }

  @Test
  void searchFlights_shouldReturnOutboundFlightsForOneWayTrip() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        201L,
        "AU201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 6, 10),
        thoiDiem(ngayDi, 8, 20),
        "on_time",
        List.of(mockInventory(2001L, "pho_thong_tiet_kiem", 8, 1490000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "sgn",
        "han",
        ngayDi,
        null,
        "one_way",
        1,
        0,
        0
    );

    assertThat(response.tripType()).isEqualTo("one_way");
    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.returnFlights()).isEmpty();
    assertThat(response.outboundFlights().getFirst().code()).isEqualTo("AU201");
    assertThat(response.outboundFlights().getFirst().departureTime()).isEqualTo("06:10");
    verify(flightRepository, never()).searchRoute(eq("HAN"), eq("SGN"), any(), any());
  }

  @Test
  void searchFlights_shouldReturnRoundTripFlights() {
    LocalDate ngayDi = ngayTuongLai(7);
    LocalDate ngayVe = ngayTuongLai(10);
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        215L,
        "AU215",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 9, 45),
        thoiDiem(ngayDi, 11, 55),
        "boarding",
        List.of(mockInventory(2002L, "pho_thong_linh_hoat", 5, 1890000L))
    );
    FlightEntity returnFlight = mockFlight(
        330L,
        "AU330",
        "HAN",
        "Ha Noi",
        "SGN",
        "Thanh pho Ho Chi Minh",
        thoiDiem(ngayVe, 14, 20),
        thoiDiem(ngayVe, 16, 30),
        "on_time",
        List.of(mockInventory(2003L, "pho_thong_linh_hoat", 4, 1920000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));
    when(flightRepository.searchRoute(eq("HAN"), eq("SGN"), any(), any())).thenReturn(List.of(returnFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        ngayVe,
        "round_trip",
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.returnFlights()).hasSize(1);
    assertThat(response.flights()).hasSize(2);
    assertThat(response.fares()).hasSize(3);
    assertThat(response.criteria().returnDate()).isEqualTo(ngayVe.toString());
  }

  @Test
  void searchFlights_shouldReturnFareOptionsTheoChuyenBay() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        233L,
        "AU233",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 18, 20),
        thoiDiem(ngayDi, 20, 35),
        "scheduled",
        List.of(
            mockInventory(2004L, "pho_thong_tiet_kiem", 9, 1490000L),
            mockInventory(2005L, "thuong_gia", 3, 3490000L)
        )
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        null,
        "one_way",
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.outboundFlights().getFirst().baseFare()).isEqualTo(1490000L);
    assertThat(response.outboundFlights().getFirst().fares())
        .extracting(FlightSearchResponse.FareOption::fareFamily)
        .containsExactly("pho_thong_tiet_kiem", "thuong_gia");
  }

  @Test
  void searchFlights_shouldReturnGiaThapNhatChoTungHangVe() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");
    FlightEntity firstFlight = mockFlight(
        701L,
        "AU701",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 7, 0),
        thoiDiem(ngayDi, 9, 10),
        "scheduled",
        List.of(
            mockInventory(2701L, "pho_thong_tiet_kiem", 12, 1490000L),
            mockInventory(2702L, "pho_thong_linh_hoat", 8, 1990000L),
            mockInventory(2703L, "thuong_gia", 3, 3490000L)
        )
    );
    FlightEntity secondFlight = mockFlight(
        702L,
        "AU702",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 11, 30),
        thoiDiem(ngayDi, 13, 40),
        "scheduled",
        List.of(
            mockInventory(2711L, "pho_thong_tiet_kiem", 9, 1590000L),
            mockInventory(2712L, "pho_thong_linh_hoat", 6, 2090000L),
            mockInventory(2713L, "thuong_gia", 2, 3290000L)
        )
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any()))
        .thenReturn(List.of(firstFlight, secondFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        null,
        "one_way",
        1,
        0,
        0
    );

    assertThat(response.fares())
        .extracting(FlightSearchResponse.FareCard::fareFamily, FlightSearchResponse.FareCard::price)
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("pho_thong_tiet_kiem", 1490000L),
            org.assertj.core.groups.Tuple.tuple("pho_thong_linh_hoat", 1990000L),
            org.assertj.core.groups.Tuple.tuple("thuong_gia", 3290000L)
        );
  }

  @Test
  void searchFlights_shouldRejectUnknownAirportCode() {
    when(airportRepository.existsByCodeIgnoreCase("XXX")).thenReturn(false);

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "XXX",
        "HAN",
        ngayTuongLai(7),
        null,
        "one_way",
        1,
        0,
        0
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Mã sân bay đi không hợp lệ.");
  }

  @Test
  void searchFlights_shouldRejectReturnDateBeforeDepartureDate() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        ngayDi.minusDays(1),
        "round_trip",
        1,
        0,
        0
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Ngày về không được trước ngày đi.");
  }

  @Test
  void searchFlights_shouldRejectPassengerCountOverLimit() {
    mockAirportExists("SGN", "HAN");

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayTuongLai(7),
        null,
        "one_way",
        4,
        4,
        2
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Tổng số hành khách vượt quá giới hạn 9 người.");
  }

  @Test
  void searchFlights_shouldRejectNegativePassengerCount() {
    mockAirportExists("SGN", "HAN");

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayTuongLai(7),
        null,
        "one_way",
        1,
        -1,
        0
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Số lượng hành khách không hợp lệ.");
  }

  @Test
  void searchFlights_shouldUseAvailableSeatsInsteadOfTotalSeats() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        450L,
        "AU450",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 21, 0),
        thoiDiem(ngayDi, 23, 10),
        "scheduled",
        List.of(mockInventory(2450L, "pho_thong_tiet_kiem", 2, 18, 1590000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        null,
        "one_way",
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.outboundFlights().getFirst().fares()).hasSize(1);
    assertThat(response.outboundFlights().getFirst().fares().getFirst().seatsLeft()).isEqualTo(2);
  }

  @Test
  void searchFlights_shouldReconcileExpiredHoldsBeforeReturningFlights() {
    LocalDate ngayDi = ngayTuongLai(7);
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        901L,
        "VN901",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 10, 0),
        thoiDiem(ngayDi, 12, 10),
        "scheduled",
        List.of(
            mockInventory(2901L, "pho_thong_tiet_kiem", 8, 1490000L),
            mockInventory(2902L, "pho_thong_linh_hoat", 4, 1990000L)
        )
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    flightSearchService.searchFlights("SGN", "HAN", ngayDi, null, "one_way", 1, 0, 0);

    verify(bookingService).reconcileExpiredHoldsForInventories(
        argThat(ids -> ids.containsAll(List.of(2901L, 2902L))),
        any()
    );
  }

  @Test
  void searchFlights_shouldHideFlightsPastPublicCutoff() {
    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    LocalDate ngayDi = currentTime.toLocalDate();
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        902L,
        "VN902",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        currentTime.plusMinutes(20).toString(),
        currentTime.plusHours(2).plusMinutes(20).toString(),
        "scheduled",
        List.of(mockInventory(2903L, "pho_thong_tiet_kiem", 8, 1490000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        ngayDi,
        null,
        "one_way",
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).isEmpty();
  }

  @Test
  void getBookingOptions_shouldReconcileExpiredHoldsAndReturnOccupiedSeats() {
    LocalDate ngayDi = ngayTuongLai(7);
    FlightEntity flight = mockFlight(
        903L,
        "VN903",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        thoiDiem(ngayDi, 11, 0),
        thoiDiem(ngayDi, 13, 10),
        "scheduled",
        List.of(
            mockInventory(3901L, "pho_thong_tiet_kiem", 8, 1490000L),
            mockInventory(3902L, "pho_thong_linh_hoat", 4, 1990000L)
        )
    );
    when(flightRepository.findDetailedById(903L)).thenReturn(Optional.of(flight));
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(eq(903L), any()))
        .thenReturn(List.of("9A", "3C"));

    FlightBookingOptionsResponse response = flightSearchService.getBookingOptions(903L);

    assertThat(response.fareOptions()).hasSize(2);
    assertThat(response.seats())
        .filteredOn(FlightBookingOptionsResponse.SeatItem::occupied)
        .extracting(FlightBookingOptionsResponse.SeatItem::seatNumber)
        .containsExactlyInAnyOrder("9A", "3C");
    verify(bookingService).reconcileExpiredHoldsForInventories(
        argThat(ids -> ids.containsAll(List.of(3901L, 3902L))),
        any()
    );
  }

  @Test
  void getBookingOptions_shouldRejectFlightsPastPublicCutoff() {
    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    FlightEntity flight = mockFlight(
        904L,
        "VN904",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        currentTime.plusMinutes(10).toString(),
        currentTime.plusHours(2).plusMinutes(10).toString(),
        "scheduled",
        List.of(mockInventory(4901L, "pho_thong_tiet_kiem", 8, 1490000L))
    );
    when(flightRepository.findDetailedById(904L)).thenReturn(Optional.of(flight));

    assertThatThrownBy(() -> flightSearchService.getBookingOptions(904L))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chuyến bay hiện không còn mở bán.");
  }

  private LocalDate ngayTuongLai(int soNgayCong) {
    return PublicFlightWindowPolicy.currentTime().toLocalDate().plusDays(soNgayCong);
  }

  private String thoiDiem(LocalDate ngay, int gio, int phut) {
    return String.format("%sT%02d:%02d:00+07:00", ngay, gio, phut);
  }

  private void mockAirportExists(String... airportCodes) {
    for (String airportCode : airportCodes) {
      when(airportRepository.existsByCodeIgnoreCase(airportCode)).thenReturn(true);
    }
  }

  private FlightEntity mockFlight(
      long flightId,
      String flightCode,
      String originCode,
      String originCity,
      String destinationCode,
      String destinationCity,
      String departureAt,
      String arrivalAt,
      String status,
      List<FlightFareInventoryEntity> inventories
  ) {
    FlightEntity flight = BeanUtils.instantiateClass(FlightEntity.class);
    AirportEntity originAirport = mockAirport(originCode, originCity);
    AirportEntity destinationAirport = mockAirport(destinationCode, destinationCity);
    ReflectionTestUtils.setField(flight, "id", flightId);
    ReflectionTestUtils.setField(flight, "code", flightCode);
    ReflectionTestUtils.setField(flight, "originAirport", originAirport);
    ReflectionTestUtils.setField(flight, "destinationAirport", destinationAirport);
    ReflectionTestUtils.setField(flight, "departureAt", OffsetDateTime.parse(departureAt));
    ReflectionTestUtils.setField(flight, "arrivalAt", OffsetDateTime.parse(arrivalAt));
    ReflectionTestUtils.setField(flight, "status", status);
    ReflectionTestUtils.setField(flight, "salesOpen", true);
    ReflectionTestUtils.setField(flight, "fareInventories", new ArrayList<>(inventories));
    for (FlightFareInventoryEntity inventory : inventories) {
      lenient().when(inventory.getFlight()).thenReturn(flight);
    }
    return flight;
  }

  private AirportEntity mockAirport(String code, String cityName) {
    AirportEntity airport = org.mockito.Mockito.mock(AirportEntity.class);
    lenient().when(airport.getCode()).thenReturn(code);
    lenient().when(airport.getCityName()).thenReturn(cityName);
    return airport;
  }

  private FlightFareInventoryEntity mockInventory(
      long id,
      String fareFamily,
      int availableSeats,
      long price
  ) {
    return mockInventory(id, fareFamily, availableSeats, availableSeats, price);
  }

  private FlightFareInventoryEntity mockInventory(
      long id,
      String fareFamily,
      int availableSeats,
      int totalSeats,
      long price
  ) {
    FlightFareInventoryEntity inventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    lenient().when(inventory.getId()).thenReturn(id);
    lenient().when(inventory.getFareFamily()).thenReturn(fareFamily);
    lenient().when(inventory.getTotalSeats()).thenReturn(totalSeats);
    lenient().when(inventory.getAvailableSeats()).thenReturn(availableSeats);
    lenient().when(inventory.getPrice()).thenReturn(price);
    return inventory;
  }
}
