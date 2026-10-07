package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.exception.BadRequestException;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class SeatLayoutValidationTest {
  private final SeatMapService service = new SeatMapService(null,new ObjectMapper(),null,null,null,null);
  private static final String VALID = """
      {"columns":["A","C","D","F"],"aislesAfter":["C"],
       "rows":[{"row":45,"fareFamily":"thuong_gia","seats":["A","F"]}],"disabledSeats":["45F"]}
      """;

  @Test void supportsSparseRowsColumnsFareZonesAndDisabledSeats() {
    var layout = service.parseLayout(VALID,1);
    service.validateSeat(layout,"45A","thuong_gia");
    assertThatThrownBy(() -> service.validateSeat(layout,"45F","thuong_gia")).isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> service.validateSeat(layout,"45C","thuong_gia")).isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> service.validateSeat(layout,"45A","pho_thong_tiet_kiem")).isInstanceOf(BadRequestException.class);
    assertThat(service.normalizeSeat(" 45a ")).isEqualTo("45A");
    assertThat(service.capacity(layout,"thuong_gia")).isEqualTo(1);
  }

  @ParameterizedTest @MethodSource("invalidLayouts")
  void rejectsInvalidJsonStructure(String json) {
    assertThatThrownBy(() -> service.parseLayout(json,1)).isInstanceOf(BadRequestException.class);
  }

  static Stream<String> invalidLayouts() {
    return Stream.of("not json","null","[]", VALID.replace("45F","99F"),
        VALID.replace("[\"A\",\"C\",\"D\",\"F\"]","[\"A\",\"A\"]"),
        VALID.replace("[\"C\"]","[\"Z\"]"), VALID.replace("[\"C\"]","[\"F\"]"),
        VALID.replace("\"row\":45","\"row\":0"), VALID.replace("\"row\":45","\"row\":1.5"),
        VALID.replace("thuong_gia","unknown"), VALID.replace("[\"A\",\"F\"]","[\"A\",\"A\"]"),
        VALID.replace("[\"A\",\"F\"]","[\"F\",\"A\"]"),
        VALID.replace("\"disabledSeats\":[\"45F\"]","\"disabledSeats\":[\"45F\"],\"unknown\":true"));
  }
}
