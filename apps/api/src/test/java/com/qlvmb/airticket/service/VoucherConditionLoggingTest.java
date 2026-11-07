package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;

class VoucherConditionLoggingTest {
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
  private final VoucherConditionService service = new VoucherConditionService(
      mapper, mock(AirportRepository.class), new ProductCatalogService());
  private final Logger logger = (Logger) LoggerFactory.getLogger(VoucherConditionService.class);
  private final ListAppender<ILoggingEvent> logs = new ListAppender<>();
  private Level previousLevel;
  private boolean previousAdditive;

  @BeforeEach
  void captureLogs() {
    previousLevel = logger.getLevel();
    previousAdditive = logger.isAdditive();
    logger.setLevel(Level.WARN);
    logger.setAdditive(false);
    logs.start();
    logger.addAppender(logs);
  }

  @AfterEach
  void restoreLogger() {
    logger.detachAppender(logs);
    logs.stop();
    logger.setLevel(previousLevel);
    logger.setAdditive(previousAdditive);
  }

  @ParameterizedTest
  @ValueSource(strings = {"{", "{\"minAmount\":-1}", "{\"departureFrom\":\"2026-02-30\"}", "{\"routes\":{}}"})
  void invalidStoredConditionsRemainFailClosedAndProduceSafeDiagnostic(String json) {
    assertThat(service.present(json, "VND").conditionsValid()).isFalse();
    assertThat(service.present(json, "VND").conditionSummary()).isEqualTo(VoucherConditionService.CONFIGURATION_ERROR);
    var voucher = mock(MemberVoucherEntity.class);
    org.mockito.Mockito.when(voucher.getConditionJson()).thenReturn(json);
    var booking = mock(BookingEntity.class);
    assertThatThrownBy(() -> service.requireEligible(voucher, booking))
        .isInstanceOf(BadRequestException.class).hasMessage(VoucherConditionService.CONFIGURATION_ERROR);
    verifyNoInteractions(booking);
    assertThat(logs.list).hasSize(1);
    var event = logs.list.get(0);
    assertThat(event.getLevel()).isEqualTo(Level.WARN);
    assertThat(event.getFormattedMessage()).contains("mã đối chiếu").doesNotContain(json);
    assertThat(event.getThrowableProxy()).isNull();
  }

  @Test
  void rawSecretsAndCustomerDataAreNotLogged() {
    String json = "{\"token\":\"secret-token-fixture\",\"customer\":\"private@example.test\"}";
    service.present(json, "VND");
    assertThat(logs.list).hasSize(1);
    assertThat(logs.list.get(0).getFormattedMessage())
        .doesNotContain(json, "secret-token-fixture", "private@example.test", "customer", "token");
  }

  @Test
  void repeatedReadsOfSameCorruptionDoNotSpamLogs() {
    for (int index = 0; index < 20; index++) service.present("{\"minAmount\":-1}", "VND");
    assertThat(logs.list).hasSize(1);
  }

  @Test
  void validAndAbsentStoredConditionsDoNotWarn() {
    for (String json : new String[] {null, "{}", "{\"minAmount\":200000}"}) {
      assertThat(service.present(json, "VND").conditionsValid()).isTrue();
    }
    assertThat(logs.list).isEmpty();
  }

  @Test
  void invalidIncomingRequestIsNotReportedAsStoredCorruption() throws Exception {
    assertThatThrownBy(() -> service.validateAndEncode(mapper.readTree("{\"minAmount\":-1}")))
        .isInstanceOf(BadRequestException.class);
    assertThat(logs.list).isEmpty();
  }

  @Test
  void fingerprintMemoryIsBoundedAndEvictedErrorsCanBeReportedAgain() {
    for (int index = 0; index < 257; index++) service.present("{\"unknown" + index + "\":true}", "VND");
    assertThat(logs.list).hasSize(257);
    service.present("{\"unknown0\":true}", "VND");
    assertThat(logs.list).hasSize(258);
  }
}
