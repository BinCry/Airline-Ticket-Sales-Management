package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.mapper.FlightSearchMapper;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FlightSearchServiceTest {

  @Mock
  private AirportRepository airportRepository;

  @Mock
  private FlightRepository flightRepository;

  private FlightSearchService flightSearchService;

  @BeforeEach
  void setUp() {
    flightSearchService = new FlightSearchService(
        airportRepository,
        flightRepository,
        new ProductCatalogService(),
        new FlightSearchMapper()
    );
  }

  @Test
  void searchFlights_shouldReturnOutboundFlightsForOneWayTrip() {
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        201L,
        "AU201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        "2026-03-20T06:10:00+07:00",
        "2026-03-20T08:20:00+07:00",
        "on_time",
        List.of(mockInventory(2001L, "pho_thong_tiet_kiem", 8, 1490000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "sgn",
        "han",
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        null,
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
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        215L,
        "AU215",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        "2026-03-20T09:45:00+07:00",
        "2026-03-20T11:55:00+07:00",
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
        "2026-03-23T14:20:00+07:00",
        "2026-03-23T16:30:00+07:00",
        "on_time",
        List.of(mockInventory(2003L, "pho_thong_linh_hoat", 4, 1920000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));
    when(flightRepository.searchRoute(eq("HAN"), eq("SGN"), any(), any())).thenReturn(List.of(returnFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        LocalDate.of(2026, 3, 20),
        LocalDate.of(2026, 3, 23),
        "round_trip",
        null,
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.returnFlights()).hasSize(1);
    assertThat(response.flights()).hasSize(2);
    assertThat(response.fares()).hasSize(1);
    assertThat(response.criteria().returnDate()).isEqualTo("2026-03-23");
  }

  @Test
  void searchFlights_shouldFilterByFareFamily() {
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        233L,
        "AU233",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        "2026-03-20T18:20:00+07:00",
        "2026-03-20T20:35:00+07:00",
        "scheduled",
        List.of(
            mockInventoryForFilterOnly("pho_thong_tiet_kiem"),
            mockInventory(2005L, "thuong_gia", 3, 3490000L)
        )
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        "thuong_gia",
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.outboundFlights().getFirst().fareFamily()).isEqualTo("thuong_gia");
    assertThat(response.fares()).extracting(FlightSearchResponse.FareCard::fareFamily).containsExactly("thuong_gia");
  }

  @Test
  void searchFlights_shouldRejectUnknownAirportCode() {
    when(airportRepository.existsByCodeIgnoreCase("XXX")).thenReturn(false);

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "XXX",
        "HAN",
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        null,
        1,
        0,
        0
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Mã sân bay đi không hợp lệ.");
  }

  @Test
  void searchFlights_shouldRejectReturnDateBeforeDepartureDate() {
    mockAirportExists("SGN", "HAN");

    assertThatThrownBy(() -> flightSearchService.searchFlights(
        "SGN",
        "HAN",
        LocalDate.of(2026, 3, 20),
        LocalDate.of(2026, 3, 19),
        "round_trip",
        null,
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
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        null,
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
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        null,
        1,
        -1,
        0
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Số lượng hành khách không hợp lệ.");
  }

  @Test
  void searchFlights_shouldUseAvailableSeatsInsteadOfTotalSeats() {
    mockAirportExists("SGN", "HAN");
    FlightEntity outboundFlight = mockFlight(
        450L,
        "AU450",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        "2026-03-20T21:00:00+07:00",
        "2026-03-20T23:10:00+07:00",
        "scheduled",
        List.of(mockInventory(2450L, "pho_thong_tiet_kiem", 2, 18, 1590000L))
    );
    when(flightRepository.searchRoute(eq("SGN"), eq("HAN"), any(), any())).thenReturn(List.of(outboundFlight));

    FlightSearchResponse response = flightSearchService.searchFlights(
        "SGN",
        "HAN",
        LocalDate.of(2026, 3, 20),
        null,
        "one_way",
        null,
        1,
        0,
        0
    );

    assertThat(response.outboundFlights()).hasSize(1);
    assertThat(response.outboundFlights().getFirst().seatsLeft()).isEqualTo(2);
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
    FlightEntity flight = org.mockito.Mockito.mock(FlightEntity.class);
    AirportEntity originAirport = mockAirport(originCode, originCity);
    AirportEntity destinationAirport = mockAirport(destinationCode, destinationCity);
    when(flight.getId()).thenReturn(flightId);
    when(flight.getCode()).thenReturn(flightCode);
    when(flight.getOriginAirport()).thenReturn(originAirport);
    when(flight.getDestinationAirport()).thenReturn(destinationAirport);
    when(flight.getDepartureAt()).thenReturn(OffsetDateTime.parse(departureAt));
    when(flight.getArrivalAt()).thenReturn(OffsetDateTime.parse(arrivalAt));
    when(flight.getStatus()).thenReturn(status);
    when(flight.isSalesOpen()).thenReturn(true);
    when(flight.getFareInventories()).thenReturn(inventories);
    for (FlightFareInventoryEntity inventory : inventories) {
      lenient().when(inventory.getFlight()).thenReturn(flight);
    }
    return flight;
  }

  private AirportEntity mockAirport(String code, String cityName) {
    AirportEntity airport = org.mockito.Mockito.mock(AirportEntity.class);
    when(airport.getCode()).thenReturn(code);
    when(airport.getCityName()).thenReturn(cityName);
    return airport;
  }

  private FlightFareInventoryEntity mockInventory(long id, String fareFamily, int availableSeats, long price) {
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
    when(inventory.getId()).thenReturn(id);
    when(inventory.getFareFamily()).thenReturn(fareFamily);
    lenient().when(inventory.getTotalSeats()).thenReturn(totalSeats);
    when(inventory.getAvailableSeats()).thenReturn(availableSeats);
    when(inventory.getPrice()).thenReturn(price);
    return inventory;
  }

  private FlightFareInventoryEntity mockInventoryForFilterOnly(String fareFamily) {
    FlightFareInventoryEntity inventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    when(inventory.getFareFamily()).thenReturn(fareFamily);
    return inventory;
  }
}
