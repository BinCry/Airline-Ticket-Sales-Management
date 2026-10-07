package com.qlvmb.airticket.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.SeatMapResponse;
import com.qlvmb.airticket.domain.dto.SeatMapResponse.*;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.exception.*;
import com.qlvmb.airticket.repository.*;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatMapService {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final EntityManager em;
  private final FlightRepository flights;
  private final AircraftRepository aircraft;
  private final BookingSeatSelectionRepository selections;

  public SeatMapService(JdbcTemplate jdbc, ObjectMapper mapper, EntityManager em,
      FlightRepository flights, AircraftRepository aircraft, BookingSeatSelectionRepository selections) {
    this.jdbc = jdbc; this.mapper = mapper; this.em = em; this.flights = flights;
    this.aircraft = aircraft; this.selections = selections;
  }

  @Transactional
  public SeatMapResponse getSeatMap(long flightId) {
    lockConfiguration(false);
    return getSeatMapForFlight(flightId);
  }

  public SeatMapResponse getSeatMapForFlight(long flightId) {
    List<SeatMapResponse> maps = jdbc.query("""
        select f.id, a.id aircraft_id, a.registration_code, t.code, t.name,
            t.total_rows, t.seat_layout_json::text layout
        from flight f left join aircraft a on a.id=f.aircraft_id
        left join aircraft_type t on t.id=a.aircraft_type_id
        where f.id=? and f.hidden_at is null
        """, (rs, n) -> {
          if (rs.getObject("aircraft_id") == null) {
            throw new ConflictException("Chuyến bay chưa được cấu hình tàu bay.");
          }
          Layout layout = parseLayout(rs.getString("layout"), rs.getInt("total_rows"));
          return new SeatMapResponse(flightId, rs.getLong("aircraft_id"), rs.getString("registration_code"),
              rs.getString("code"), rs.getString("name"), layout, List.of());
        }, flightId);
    if (maps.isEmpty()) throw new NotFoundException("Không tìm thấy chuyến bay được chọn.");
    SeatMapResponse map = maps.getFirst();
    Set<String> occupied = occupiedSeats(flightId, OffsetDateTime.now(), null, null);
    return new SeatMapResponse(flightId, map.aircraftId(), map.aircraftRegistration(),
        map.aircraftTypeCode(), map.aircraftTypeName(), map.layout(), seatItems(map.layout(), occupied));
  }

  public List<Seat> seatItems(Layout layout, Set<String> occupied) {
    return layout.rows().stream().flatMap(row -> row.seats().stream().map(column -> {
      String number = row.row() + column;
      return new Seat(number, row.fareFamily(), occupied.contains(number), layout.disabledSeats().contains(number));
    })).toList();
  }

  public Layout parseLayout(String json, int totalRows) {
    try { return validateLayout(mapper.readTree(json), totalRows); }
    catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
      throw new BadRequestException("Cấu hình sơ đồ cabin không phải JSON hợp lệ.");
    }
  }

  public Layout validateLayout(JsonNode json, int totalRows) {
    if (json == null || !json.isObject() || totalRows < 1 || totalRows > 200) invalidLayout();
    requireFields(json, Set.of("columns", "aislesAfter", "rows", "disabledSeats"));
    List<String> columns = strings(json.get("columns"));
    if (columns.isEmpty() || columns.size() > 26 || columns.stream().anyMatch(c -> !c.matches("[A-Z]"))) invalidLayout();
    List<String> aisles = strings(json.get("aislesAfter"));
    if (!columns.containsAll(aisles) || aisles.contains(columns.getLast())) invalidLayout();
    JsonNode rowNodes = json.get("rows");
    if (rowNodes == null || !rowNodes.isArray() || rowNodes.size() != totalRows) invalidLayout();
    List<Row> rows = new ArrayList<>();
    Set<Integer> numbers = new HashSet<>();
    Set<String> seatNumbers = new HashSet<>();
    int previousRow = 0;
    for (JsonNode node : rowNodes) {
      requireFields(node, Set.of("row", "fareFamily", "seats"));
      JsonNode row = node.get("row");
      JsonNode fare = node.get("fareFamily");
      if (row == null || !row.isIntegralNumber() || !row.canConvertToInt() || row.intValue() < 1
          || row.intValue() > 999 || row.intValue() <= previousRow || !numbers.add(row.intValue())
          || fare == null || !fare.isTextual() || !ProductCatalogService.FIXED_FARE_FAMILIES.contains(fare.textValue())) invalidLayout();
      List<String> seats = strings(node.get("seats"));
      if (seats.isEmpty() || !columns.containsAll(seats)) invalidLayout();
      int previousColumn = -1;
      for (String column : seats) {
        int index = columns.indexOf(column);
        if (index <= previousColumn) invalidLayout();
        previousColumn = index;
        seatNumbers.add(row.intValue() + column);
      }
      previousRow = row.intValue();
      rows.add(new Row(row.intValue(), fare.textValue(), seats));
    }
    List<String> disabled = strings(json.get("disabledSeats"));
    if (!seatNumbers.containsAll(disabled)) invalidLayout();
    return new Layout(List.copyOf(columns), List.copyOf(aisles), List.copyOf(rows), List.copyOf(disabled));
  }

  private List<String> strings(JsonNode array) {
    if (array == null || !array.isArray()) invalidLayout();
    List<String> values = new ArrayList<>();
    for (JsonNode item : array) {
      if (!item.isTextual() || values.contains(item.textValue())) invalidLayout();
      values.add(item.textValue());
    }
    return values;
  }

  private void requireFields(JsonNode object, Set<String> allowed) {
    if (object == null || !object.isObject() || object.size() != allowed.size()) invalidLayout();
    object.fieldNames().forEachRemaining(field -> { if (!allowed.contains(field)) invalidLayout(); });
  }

  private void invalidLayout() {
    throw new BadRequestException("Sơ đồ cabin không hợp lệ: kiểm tra hàng, cột, lối đi, hạng vé và ghế khóa.");
  }

  public String normalizeSeat(String seat) {
    String normalized = seat == null ? "" : seat.trim().toUpperCase(Locale.ROOT);
    if (!normalized.matches("[1-9][0-9]{0,2}[A-Z]")) throw new BadRequestException("Ghế được chọn không hợp lệ.");
    return normalized;
  }

  public void validateSeat(Layout layout, String seatNumber, String fareFamily) {
    boolean exists = layout.rows().stream().anyMatch(row -> row.fareFamily().equals(fareFamily)
        && row.seats().stream().anyMatch(column -> (row.row() + column).equals(seatNumber)));
    if (!exists || layout.disabledSeats().contains(seatNumber)) {
      throw new BadRequestException("Ghế " + seatNumber + " không tồn tại, bị khóa hoặc không đúng hạng vé.");
    }
  }

  public Set<String> occupiedSeats(long flightId, OffsetDateTime now, Long passengerId, Long segmentId) {
    Set<String> occupied = new LinkedHashSet<>();
    selections.findActiveSeatOccupants(flightId, now).stream()
        .filter(s -> passengerId == null || segmentId == null
            || !passengerId.equals(s.getPassengerId()) || !segmentId.equals(s.getSegmentId()))
        .map(BookingSeatSelectionRepository.SeatOccupant::getSeatNumber).forEach(occupied::add);
    return occupied;
  }

  public void requireAvailable(long flightId, String seat, Long passengerId, Long segmentId) {
    if (occupiedSeats(flightId, OffsetDateTime.now(), passengerId, segmentId).contains(seat)) {
      throw new ConflictException("Ghế " + seat + " không còn trống. Vui lòng tải lại sơ đồ và chọn ghế khác.");
    }
  }

  public void validateCompatibility(long flightId, Layout layout) {
    Set<String> conflicts = new TreeSet<>();
    for (var occupant : selections.findActiveSeatOccupants(flightId, OffsetDateTime.now())) {
      try { validateSeat(layout, occupant.getSeatNumber(), occupant.getFareFamily()); }
      catch (BadRequestException ex) { conflicts.add(occupant.getSeatNumber()); }
    }
    if (!conflicts.isEmpty()) throw new ConflictException("Sơ đồ tàu bay xung đột với ghế đang giữ: " + String.join(", ", conflicts));
  }

  @Transactional
  public void lockConfiguration(boolean write) {
    // ponytail: khóa cấu hình chung; tách theo loại tàu khi tần suất sửa cabin cao.
    jdbc.execute(write ? "select pg_advisory_xact_lock(72444, 1)"
        : "select pg_advisory_xact_lock_shared(72444, 1)");
  }

  @Transactional
  public void lockFlights(Collection<Long> ids) {
    lockConfiguration(false);
    ids.stream().filter(Objects::nonNull).distinct().sorted().forEach(id -> {
      if (jdbc.queryForList("select id from flight where id=? for update", Long.class, id).isEmpty()) {
        throw new NotFoundException("Không tìm thấy chuyến bay được chọn.");
      }
    });
  }

  @Transactional
  public FlightEntity lockFlight(long id) {
    lockFlights(List.of(id));
    FlightEntity flight = flights.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay."));
    em.refresh(flight);
    return flight;
  }

  @Transactional
  public void lockBookingFlights(String bookingCode) {
    lockConfiguration(false);
    lockFlights(jdbc.queryForList("""
        select distinct i.flight_id from booking b join booking_segment s on s.booking_id=b.id
        join flight_fare_inventory i on i.id=s.inventory_id where upper(b.booking_code)=upper(?)
        """, Long.class, bookingCode));
  }

  @Transactional
  public void lockCancellationFlights(long flightId) {
    lockConfiguration(false);
    List<Long> ids = new ArrayList<>(jdbc.queryForList("""
        select distinct other_i.flight_id from booking_segment s
        join flight_fare_inventory i on i.id=s.inventory_id
        join booking_segment other_s on other_s.booking_id=s.booking_id
        join flight_fare_inventory other_i on other_i.id=other_s.inventory_id
        where i.flight_id=?
        """, Long.class, flightId));
    ids.add(flightId);
    lockFlights(ids);
  }

  @Transactional
  public void lockRefundFlights(long refundId) {
    lockConfiguration(false);
    lockFlights(jdbc.queryForList("""
        select distinct i.flight_id from refund_request r join booking b on b.booking_code=r.booking_code
        join booking_segment s on s.booking_id=b.id join flight_fare_inventory i on i.id=s.inventory_id
        where r.id=?
        """, Long.class, refundId));
  }

  @Transactional
  public void lockInventoryFlights(Collection<Long> inventoryIds, OffsetDateTime now) {
    lockConfiguration(false);
    if (inventoryIds.isEmpty()) return;
    String placeholders = String.join(",", Collections.nCopies(inventoryIds.size(), "?"));
    List<Object> args = new ArrayList<>(inventoryIds);
    args.add(now);
    // Khóa đủ chặng của các hold hết hạn liên quan trước khi khóa inventory/booking.
    lockFlights(jdbc.queryForList("""
        with recursive related(id) as (
          select flight_id from flight_fare_inventory where id in (%s)
          union
          select other_i.flight_id from related r
          join flight_fare_inventory i on i.flight_id=r.id
          join booking_segment s on s.inventory_id=i.id
          join booking b on b.id=s.booking_id and b.status='HOLD' and b.expires_at<=?
          join booking_segment other_s on other_s.booking_id=b.id
          join flight_fare_inventory other_i on other_i.id=other_s.inventory_id
        ) select id from related
        """.formatted(placeholders), Long.class, args.toArray()));
  }

  @Transactional
  public AircraftEntity requireActiveAircraft(Long id) {
    lockConfiguration(false);
    if (id == null) throw new BadRequestException("Chuyến bay chưa được cấu hình tàu bay. Vui lòng chọn tàu ACTIVE.");
    AircraftEntity chosen = aircraft.findById(id).orElseThrow(() -> new BadRequestException("Không tìm thấy tàu bay."));
    em.refresh(chosen);
    em.refresh(chosen.getAircraftType());
    if (!"ACTIVE".equals(chosen.getStatus())) throw new BadRequestException("Chỉ được gán mới tàu bay ACTIVE.");
    return chosen;
  }

  public int capacity(Layout layout, String fareFamily) {
    return (int) seatItems(layout, Set.of()).stream()
        .filter(s -> s.fareFamily().equals(fareFamily) && !s.disabled()).count();
  }
}
