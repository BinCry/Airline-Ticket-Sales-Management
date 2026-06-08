package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.FlightStatusResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FlightStatusServiceTest {

  @Mock
  private FlightRepository flightRepository;

  private FlightStatusService flightStatusService;

  @BeforeEach
  void setUp() {
    flightStatusService = new FlightStatusService(flightRepository);
  }

  @Test
  void getFlightStatus_shouldReturnFlightByCode() {
    LocalDate ngayBay = PublicFlightWindowPolicy.currentTime().toLocalDate().plusDays(7);
    FlightEntity flight = mockFlight("VN5201", "on_time", thoiDiem(ngayBay, 6, 10));
    when(flightRepository.findStatusByCode("VN5201")).thenReturn(Optional.of(flight));

    FlightStatusResponse response = flightStatusService.getFlightStatus("vn5201", null);

    assertThat(response.flights()).hasSize(1);
    assertThat(response.flights().getFirst().code()).isEqualTo("VN5201");
    assertThat(response.flights().getFirst().departureTime()).isEqualTo("06:10");
    assertThat(response.flights().getFirst().statusLabel()).isEqualTo("Đúng giờ");
  }

  @Test
  void getFlightStatus_shouldReturnEmptyWhenDateDoesNotMatchCode() {
    LocalDate ngayBay = PublicFlightWindowPolicy.currentTime().toLocalDate().plusDays(7);
    FlightEntity flight = mockFlight("VN5201", "scheduled", thoiDiem(ngayBay, 6, 10));
    when(flightRepository.findStatusByCode("VN5201")).thenReturn(Optional.of(flight));

    FlightStatusResponse response = flightStatusService.getFlightStatus("VN5201", ngayBay.plusDays(1));

    assertThat(response.flights()).isEmpty();
  }

  @Test
  void getFlightStatus_shouldHideFlightByCodeWhenPastPublicCutoff() {
    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    FlightEntity flight = mockFlight("VN5201", "scheduled", currentTime.plusMinutes(10).toString());
    when(flightRepository.findStatusByCode("VN5201")).thenReturn(Optional.of(flight));

    FlightStatusResponse response = flightStatusService.getFlightStatus("VN5201", null);

    assertThat(response.flights()).isEmpty();
  }

  @Test
  void getFlightStatus_shouldReturnUpcomingFlightsOnly() {
    LocalDate ngayBay = PublicFlightWindowPolicy.currentTime().toLocalDate().plusDays(7);
    FlightEntity flightVisible = mockFlight("VN5201", "scheduled", thoiDiem(ngayBay, 6, 10));
    FlightEntity flightPastCutoff = mockFlight("VN5202", "scheduled", PublicFlightWindowPolicy.currentTime().plusMinutes(20).toString());
    when(flightRepository.findStatusesByDepartureWindow(any(), any()))
        .thenReturn(List.of(flightVisible, flightPastCutoff));

    FlightStatusResponse response = flightStatusService.getFlightStatus(null, ngayBay);

    assertThat(response.queryDate()).isEqualTo(ngayBay.toString());
    assertThat(response.flights())
        .extracting(FlightStatusResponse.FlightStatusItem::code)
        .containsExactly("VN5201");
  }

  @Test
  void getFlightStatus_shouldRejectUnknownCode() {
    when(flightRepository.findStatusByCode("VN9999")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> flightStatusService.getFlightStatus("VN9999", null))
        .isInstanceOf(NotFoundException.class)
        .hasMessage("Không tìm thấy chuyến bay theo mã đã nhập.");
  }

  private String thoiDiem(LocalDate ngayBay, int gio, int phut) {
    return String.format("%sT%02d:%02d:00+07:00", ngayBay, gio, phut);
  }

  private FlightEntity mockFlight(String code, String status, String departureAt) {
    FlightEntity flight = org.mockito.Mockito.mock(FlightEntity.class);
    AirportEntity originAirport = org.mockito.Mockito.mock(AirportEntity.class);
    AirportEntity destinationAirport = org.mockito.Mockito.mock(AirportEntity.class);
    OffsetDateTime departureTime = OffsetDateTime.parse(departureAt);

    lenient().when(originAirport.getCode()).thenReturn("SGN");
    lenient().when(originAirport.getCityName()).thenReturn("Thành phố Hồ Chí Minh");
    lenient().when(destinationAirport.getCode()).thenReturn("HAN");
    lenient().when(destinationAirport.getCityName()).thenReturn("Hà Nội");
    lenient().when(flight.getId()).thenReturn(5201L);
    lenient().when(flight.getCode()).thenReturn(code);
    lenient().when(flight.getOriginAirport()).thenReturn(originAirport);
    lenient().when(flight.getDestinationAirport()).thenReturn(destinationAirport);
    lenient().when(flight.getStatus()).thenReturn(status);
    lenient().when(flight.getDepartureAt()).thenReturn(departureTime);
    lenient().when(flight.getArrivalAt()).thenReturn(departureTime.plusHours(2).plusMinutes(10));
    lenient().when(flight.getGate()).thenReturn("G3");
    lenient().when(flight.getOperationsNote()).thenReturn(null);

    return flight;
  }
}
