package com.qlvmb.airticket.service;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.SeatMapResponse;
import com.qlvmb.airticket.domain.entity.*;
import java.util.*;
import org.springframework.test.util.ReflectionTestUtils;

final class SeatMapTestFixtures {
  static final SeatMapResponse.Layout LAYOUT = new SeatMapResponse.Layout(
      List.of("A","B","C","D","E","F"), List.of("C"),
      java.util.stream.IntStream.rangeClosed(1,28).mapToObj(row -> new SeatMapResponse.Row(row,
          row <= 2 ? ProductCatalogService.FARE_BUSINESS : row <= 8 ? ProductCatalogService.FARE_FLEX : ProductCatalogService.FARE_SAVER,
          List.of("A","B","C","D","E","F"))).toList(), List.of());
  static final SeatMapService VALIDATOR = new SeatMapService(null, new ObjectMapper(), null, null, null, null);

  static void stubValidation(SeatMapService service) {
    lenient().when(service.normalizeSeat(any())).thenAnswer(a -> VALIDATOR.normalizeSeat(a.getArgument(0)));
    lenient().doAnswer(a -> { VALIDATOR.validateSeat(a.getArgument(0), a.getArgument(1), a.getArgument(2)); return null; })
        .when(service).validateSeat(any(), anyString(), anyString());
    lenient().when(service.parseLayout(anyString(), anyInt())).thenAnswer(a -> VALIDATOR.parseLayout(a.getArgument(0), a.getArgument(1)));
    lenient().when(service.capacity(any(), anyString())).thenAnswer(a -> VALIDATOR.capacity(a.getArgument(0), a.getArgument(1)));
  }
  static SeatMapResponse map(long flightId, Set<String> occupied) {
    return new SeatMapResponse(flightId,1L,"VN-TEST","A321","Airbus A321",LAYOUT,VALIDATOR.seatItems(LAYOUT,occupied));
  }
  static AircraftEntity aircraft() {
    String json;
    try { json = new ObjectMapper().writeValueAsString(LAYOUT); } catch (Exception ex) { throw new IllegalStateException(ex); }
    var type = AircraftTypeEntity.create("A321","Airbus A321",28,json);
    ReflectionTestUtils.setField(type,"id",1L);
    var plane = AircraftEntity.create(type,"VN-TEST","ACTIVE");
    ReflectionTestUtils.setField(plane,"id",1L);
    return plane;
  }
}
