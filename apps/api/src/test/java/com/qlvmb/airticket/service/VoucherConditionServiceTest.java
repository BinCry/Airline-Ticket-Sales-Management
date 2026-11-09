package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherUpdateRequest;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import java.time.OffsetDateTime;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class VoucherConditionServiceTest {
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
  private final AirportRepository airports = mock(AirportRepository.class);
  private VoucherConditionService service;
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-29T00:00:00Z");

  @BeforeEach
  void setUp() {
    when(airports.existsByCodeIgnoreCase(anyString())).thenReturn(true);
    service = new VoucherConditionService(mapper, airports, new ProductCatalogService());
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"routes\":[],\"fareFamilies\":[],\"minAmount\":null}", "null"})
  void emptyConditionsRemainUnconditional(String input) throws Exception {
    assertThat(service.validateAndEncode(mapper.readTree(input))).isNull();
    assertThat(service.present(null, "VND").conditionsValid()).isTrue();
    assertThat(service.present(null, "VND").conditionSummary()).isEqualTo("Không có điều kiện bổ sung.");
  }

  @Test
  void normalizesAndDescribesAllFourGroups() throws Exception {
    String encoded = encode("""
        {"routes":[{"from":" sgn ","to":"han"},{"from":"SGN","to":"HAN"}],
         "fareFamilies":["THUONG_GIA"],"departureFrom":"2026-11-01",
         "departureTo":"2026-11-30","minAmount":1500000}
        """);
    var view = service.present(encoded, "VND");
    assertThat(view.conditionsValid()).isTrue();
    assertThat(view.conditions().routes()).hasSize(1);
    assertThat(view.conditionSummary()).contains("SGN → HAN", "Thương gia", "01/11/2026",
        "30/11/2026", "1.500.000 VND", "đồng thời");
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "[]", "{\"unknown\":true}", "{\"routes\":{}}",
      "{\"routes\":[{\"from\":\"SGN\"}]}", "{\"routes\":[{\"from\":\"SGN\",\"to\":\"SGN\"}]}",
      "{\"routes\":[{\"from\":1,\"to\":\"HAN\"}]}",
      "{\"routes\":[{\"from\":\"SGN\",\"to\":\"HAN\",\"extra\":1}]}",
      "{\"fareFamilies\":[\"unknown\"]}", "{\"fareFamilies\":[1]}", "{\"fareFamilies\":\"thuong_gia\"}",
      "{\"departureFrom\":\"2026-02-30\"}", "{\"departureFrom\":\"01/11/2026\"}",
      "{\"departureFrom\":\"2026-12-01\",\"departureTo\":\"2026-11-30\"}",
      "{\"minAmount\":-1}", "{\"minAmount\":1.5}", "{\"minAmount\":\"1000\"}",
      "{\"minAmount\":true}", "{\"minAmount\":9223372036854775808}"
  })
  void rejectsInvalidInput(String input) {
    assertThatThrownBy(() -> encode(input)).isInstanceOf(BadRequestException.class);
  }

  @Test
  void validatesAirportAgainstRepository() {
    when(airports.existsByCodeIgnoreCase("ZZZ")).thenReturn(false);
    assertThatThrownBy(() -> encode("{\"routes\":[{\"from\":\"ZZZ\",\"to\":\"HAN\"}]}"))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("sân bay");
  }

  @ParameterizedTest
  @ValueSource(strings = {"not-json", "null", "[]", "{\"unknown\":true}", "{\"minAmount\":-1}", "{} {}"})
  void corruptedStoredJsonFailsClosedButListRemainsReadable(String json) {
    MemberVoucherEntity voucher = voucher(json, "VND");
    assertThatThrownBy(() -> service.requireEligible(voucher, booking()))
        .isInstanceOf(BadRequestException.class).hasMessage(VoucherConditionService.CONFIGURATION_ERROR);
    assertThat(service.present(json, "VND").conditionsValid()).isFalse();
  }

  @Test
  void oneSegmentMustMatchAllGroupsAndReturnLegCanQualify() throws Exception {
    String json = encode("""
        {"routes":[{"from":"HAN","to":"SGN"}],"fareFamilies":["thuong_gia"],
         "departureFrom":"2026-11-01","departureTo":"2026-11-30","minAmount":1200}
        """);
    BookingEntity booking = booking();
    booking.getSegments().add(segment("HAN", "SGN", "pho_thong_tiet_kiem", "2026-11-15T10:00:00Z"));
    booking.getSegments().add(segment("SGN", "DAD", "thuong_gia", "2026-11-15T10:00:00Z"));
    assertThatThrownBy(() -> service.requireEligible(voucher(json, "VND"), booking))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("đồng thời");
    booking.getSegments().add(segment("HAN", "SGN", "thuong_gia", "2026-11-15T10:00:00Z"));
    assertThatCode(() -> service.requireEligible(voucher(json, "VND"), booking)).doesNotThrowAnyException();
  }

  @Test
  void routesAndFareListsUseOr() throws Exception {
    String json = encode("""
        {"routes":[{"from":"SGN","to":"HAN"},{"from":"HAN","to":"SGN"}],
         "fareFamilies":["pho_thong_linh_hoat","thuong_gia"]}
        """);
    BookingEntity booking = booking();
    booking.getSegments().add(segment("HAN", "SGN", "thuong_gia", "2026-11-15T10:00:00Z"));
    assertThatCode(() -> service.requireEligible(voucher(json, "VND"), booking)).doesNotThrowAnyException();
  }

  @ParameterizedTest
  @MethodSource("boundaryDates")
  void departureUsesInclusiveVietnamDates(String departure, boolean accepted) throws Exception {
    String json = encode("{\"departureFrom\":\"2026-11-01\",\"departureTo\":\"2026-11-30\"}");
    BookingEntity booking = booking();
    booking.getSegments().add(segment("SGN", "HAN", "thuong_gia", departure));
    if (accepted) {
      assertThatCode(() -> service.requireEligible(voucher(json, "VND"), booking)).doesNotThrowAnyException();
    } else {
      assertThatThrownBy(() -> service.requireEligible(voucher(json, "VND"), booking))
          .isInstanceOf(BadRequestException.class);
    }
  }

  static Stream<Arguments> boundaryDates() {
    return Stream.of(
        Arguments.of("2026-10-31T17:00:00Z", true),
        Arguments.of("2026-11-30T16:59:59Z", true),
        Arguments.of("2026-10-31T16:59:59Z", false),
        Arguments.of("2026-11-30T17:00:00Z", false));
  }

  @Test
  void minimumUsesPreDiscountTotalAndIncludesEquality() throws Exception {
    BookingEntity booking = booking();
    booking.applyVoucher("OLD", 500, NOW);
    assertThatCode(() -> service.requireEligible(voucher(encode("{\"minAmount\":1200}"), "VND"), booking))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> service.requireEligible(voucher(encode("{\"minAmount\":1201}"), "VND"), booking))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("trước giảm");
    assertThat(service.present(encode("{\"minAmount\":0}"), "VND").conditions().minAmount()).isZero();
  }

  @Test
  void currencyGuardOnlyAppliesToConfiguredConditions() {
    assertThatCode(() -> service.requireEligible(voucher(null, "USD"), booking())).doesNotThrowAnyException();
    assertThatThrownBy(() -> service.requireEligible(voucher("{\"minAmount\":0}", "USD"), booking()))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("tiền tệ");
  }

  @Test
  void patchDistinguishesOmittedConditionsFromExplicitNull() throws Exception {
    var omitted = mapper.readValue("{}", BackofficeVoucherUpdateRequest.class);
    var cleared = mapper.readValue("{\"conditions\":null}", BackofficeVoucherUpdateRequest.class);
    assertThat(omitted.conditions()).isNull();
    assertThat(cleared.conditions()).isNotNull();
    assertThat(cleared.conditions().isNull()).isTrue();
  }

  private String encode(String json) throws Exception {
    return service.validateAndEncode(mapper.readTree(json));
  }

  private BookingEntity booking() {
    return BookingEntity.createHold("VC0001", "round_trip", 1000, 200, 1200, "VND", NOW, NOW.plusMinutes(15));
  }

  private MemberVoucherEntity voucher(String json, String currency) {
    MemberVoucherEntity voucher = MemberVoucherEntity.create(151L, "TEST", "Voucher", "Kiểm thử", 500,
        currency, NOW.plusDays(30), NOW);
    voucher.updateConditions(json);
    return voucher;
  }

  private BookingSegmentEntity segment(String from, String to, String fare, String departure) {
    BookingSegmentEntity segment = BeanUtils.instantiateClass(BookingSegmentEntity.class);
    ReflectionTestUtils.setField(segment, "originCode", from);
    ReflectionTestUtils.setField(segment, "destinationCode", to);
    ReflectionTestUtils.setField(segment, "fareFamily", fare);
    ReflectionTestUtils.setField(segment, "departureAt", OffsetDateTime.parse(departure));
    return segment;
  }
}
