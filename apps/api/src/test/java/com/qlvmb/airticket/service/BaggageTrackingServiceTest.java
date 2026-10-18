package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.qlvmb.airticket.domain.entity.BaggageTrackingEntity;
import com.qlvmb.airticket.domain.entity.BookingAncillaryEntity;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.ConflictException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BaggageTrackingRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import com.qlvmb.airticket.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;

class BaggageTrackingServiceTest {
  private final BaggageTrackingRepository repository = mock(BaggageTrackingRepository.class);
  private final AuditLogRepository audits = mock(AuditLogRepository.class);
  private final UserAccountRepository users = mock(UserAccountRepository.class);
  private final BaggageTrackingService service = new BaggageTrackingService(repository, audits, users, 60);

  @Test
  void refundableAmount_excludesBaggageDeliveredAtDestination() {
    var ancillary = mock(BookingAncillaryEntity.class);
    var piece = mock(BaggageTrackingEntity.class);
    when(ancillary.getId()).thenReturn(41L);
    when(ancillary.getSubtotalAmount()).thenReturn(100_000L);
    when(ancillary.getUnitPrice()).thenReturn(100_000L);
    when(repository.findByAncillaryId(41L)).thenReturn(List.of(piece));
    when(piece.getStatus()).thenReturn("DELIVERED");
    when(piece.getTagCode()).thenReturn("BG12345678");
    when(audits.existsByTargetTypeAndTargetIdAndActionAndDetail(
        "baggage", "BG12345678", "operations.baggage.deliver", "RETURN_PENDING -> DELIVERED"))
        .thenReturn(false);

    assertThat(service.refundableAmount(ancillary)).isZero();
  }

  @Test
  void refundableAmount_includesBaggageReturnedAtOrigin() {
    var ancillary = mock(BookingAncillaryEntity.class);
    var piece = mock(BaggageTrackingEntity.class);
    when(ancillary.getId()).thenReturn(42L);
    when(ancillary.getSubtotalAmount()).thenReturn(100_000L);
    when(ancillary.getUnitPrice()).thenReturn(100_000L);
    when(repository.findByAncillaryId(42L)).thenReturn(List.of(piece));
    when(piece.getStatus()).thenReturn("DELIVERED");
    when(piece.getTagCode()).thenReturn("BG87654321");
    when(audits.existsByTargetTypeAndTargetIdAndActionAndDetail(
        "baggage", "BG87654321", "operations.baggage.deliver", "RETURN_PENDING -> DELIVERED"))
        .thenReturn(true);

    assertThat(service.refundableAmount(ancillary)).isEqualTo(100_000L);
  }

  @Test
  void refundableAmount_refundsOnlyPiecesNotDeliveredAtDestination() {
    var ancillary = mock(BookingAncillaryEntity.class);
    var deliveredPiece = mock(BaggageTrackingEntity.class);
    var returnedPiece = mock(BaggageTrackingEntity.class);
    when(ancillary.getId()).thenReturn(43L);
    when(ancillary.getSubtotalAmount()).thenReturn(200_000L);
    when(ancillary.getUnitPrice()).thenReturn(100_000L);
    when(repository.findByAncillaryId(43L)).thenReturn(List.of(deliveredPiece, returnedPiece));
    when(deliveredPiece.getStatus()).thenReturn("DELIVERED");
    when(deliveredPiece.getTagCode()).thenReturn("BG11111111");
    when(returnedPiece.getStatus()).thenReturn("DELIVERED");
    when(returnedPiece.getTagCode()).thenReturn("BG22222222");
    when(audits.existsByTargetTypeAndTargetIdAndActionAndDetail(
        "baggage", "BG11111111", "operations.baggage.deliver", "RETURN_PENDING -> DELIVERED"))
        .thenReturn(false);
    when(audits.existsByTargetTypeAndTargetIdAndActionAndDetail(
        "baggage", "BG22222222", "operations.baggage.deliver", "RETURN_PENDING -> DELIVERED"))
        .thenReturn(true);

    assertThat(service.refundableAmount(ancillary)).isEqualTo(100_000L);
  }

  @Test
  void searchPassesTagAndBookingFiltersInRepositoryOrder() {
    when(repository.search("BG12345", "PNR678", "VN5201", "ACCEPTED")).thenReturn(List.of());

    assertThat(service.search(" PNR678 ", " BG12345 ", " VN5201 ", " ACCEPTED ")).isEmpty();

    verify(repository).search("BG12345", "PNR678", "VN5201", "ACCEPTED");
  }

  @Test
  void emptySearchFiltersArePassedAsNull() {
    when(repository.search(null, null, null, null)).thenReturn(List.of());

    assertThat(service.search(" ", null, "", "  ")).isEmpty();

    verify(repository).search(null, null, null, null);
  }

  @Test
  void staleExpectedStatusIsRejectedBeforeAnyModification() {
    BaggageTrackingEntity baggage = mock(BaggageTrackingEntity.class);
    when(baggage.getStatus()).thenReturn("LOADED");
    when(repository.lockById(17L)).thenReturn(Optional.of(baggage));

    assertThatThrownBy(() -> service.changeStatus(
        null, 17L, new BaggageTrackingService.StatusRequest(
            "DELIVER", "ACCEPTED", null, null, false)))
        .isInstanceOf(ConflictException.class);

    verify(baggage, never()).transition(
        anyString(), any(), any(), any(), any());
    verifyNoInteractions(audits, users);
  }

  @Test
  void acceptedBaggageCanBeLoadedAndAudited() {
    var baggage = mock(BaggageTrackingEntity.class);
    var ticket = mock(TicketEntity.class);
    var segment = mock(BookingSegmentEntity.class);
    var inventory = mock(FlightFareInventoryEntity.class);
    var flight = mock(FlightEntity.class);
    var booking = mock(BookingEntity.class);
    var passenger = mock(BookingPassengerEntity.class);
    var account = mock(UserAccountEntity.class);
    var actor = new AuthenticatedUser(19L, "ops@example.test", "Ops", List.of("operator"), List.of());

    when(repository.lockById(17L)).thenReturn(Optional.of(baggage));
    when(baggage.getStatus()).thenReturn("ACCEPTED");
    when(baggage.getTicket()).thenReturn(ticket);
    when(baggage.getTagCode()).thenReturn("BG12345678");
    when(baggage.getPurchasedWeightKg()).thenReturn(23);
    when(ticket.getSegment()).thenReturn(segment);
    when(ticket.getBooking()).thenReturn(booking);
    when(ticket.getPassenger()).thenReturn(passenger);
    when(segment.getInventory()).thenReturn(inventory);
    when(inventory.getFlight()).thenReturn(flight);
    when(flight.isCancelled()).thenReturn(false);
    when(flight.getStatus()).thenReturn("scheduled");
    when(booking.getBookingCode()).thenReturn("AB1234");
    when(segment.getFlightCode()).thenReturn("VN123");
    when(ticket.getTicketNumber()).thenReturn("TICKET123");
    when(passenger.getFullName()).thenReturn("Passenger");
    when(users.findOneWithRolesById(19L)).thenReturn(Optional.of(account));

    var result = service.changeStatus(actor, 17L,
        new BaggageTrackingService.StatusRequest("LOAD", "ACCEPTED", null, "Loaded", false));

    verify(baggage).transition(eq("LOADED"), isNull(), eq("Loaded"), eq(19L), any(OffsetDateTime.class));
    verify(audits).save(any(AuditLogEntity.class));
    assertThat(result.bookingCode()).isEqualTo("AB1234");
    assertThat(result.flightCode()).isEqualTo("VN123");
  }

  @Test
  void registeredBaggageCannotSkipAcceptanceAndCheckIn() {
    var baggage = mock(BaggageTrackingEntity.class);
    var ticket = mock(TicketEntity.class);
    var segment = mock(BookingSegmentEntity.class);
    var inventory = mock(FlightFareInventoryEntity.class);
    var flight = mock(FlightEntity.class);
    when(repository.lockById(17L)).thenReturn(Optional.of(baggage));
    when(baggage.getStatus()).thenReturn("REGISTERED");
    when(baggage.getTicket()).thenReturn(ticket);
    when(ticket.getSegment()).thenReturn(segment);
    when(segment.getInventory()).thenReturn(inventory);
    when(inventory.getFlight()).thenReturn(flight);

    assertThatThrownBy(() -> service.changeStatus(null, 17L,
        new BaggageTrackingService.StatusRequest("LOAD", "REGISTERED", null, null, false)))
        .isInstanceOf(BadRequestException.class);

    verify(baggage, never()).transition(anyString(), any(), any(), any(), any());
    verifyNoInteractions(audits, users);
  }
}
