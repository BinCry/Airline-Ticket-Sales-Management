package com.qlvmb.airticket.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.qlvmb.airticket.repository.BirthdayVoucherRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class BirthdayVoucherPolicyConfigTest {
  private final ApplicationContextRunner runner = new ApplicationContextRunner()
      .withUserConfiguration(BirthdayVoucherPolicy.class);

  @Test
  void absentPropertiesKeepApprovedDefaults() {
    runner.run(context -> {
      assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherPolicy.class);
      var policy = context.getBean(BirthdayVoucherPolicy.class);
      assertThat(policy.discountAmount()).isEqualTo(100000);
      assertThat(policy.validDays()).isEqualTo(30);
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.enabled")).isNull();
    });
  }

  @Test
  void explicitPropertiesOverrideFutureIssuancePolicy() {
    runner.withPropertyValues("app.voucher.birthday.discount-amount=50000",
        "app.voucher.birthday.valid-days=14").run(context -> {
          assertThat(context).hasNotFailed();
          var policy = context.getBean(BirthdayVoucherPolicy.class);
          assertThat(policy.discountAmount()).isEqualTo(50000);
          assertThat(policy.validDays()).isEqualTo(14);
        });
  }

  @Test
  void smallestPositiveValuesAreAccepted() {
    runner.withPropertyValues("app.voucher.birthday.discount-amount=1",
        "app.voucher.birthday.valid-days=1").run(context -> {
          assertThat(context).hasNotFailed();
          assertThat(context.getBean(BirthdayVoucherPolicy.class).discountAmount()).isEqualTo(1);
          assertThat(context.getBean(BirthdayVoucherPolicy.class).validDays()).isEqualTo(1);
        });
  }

  @Test
  void repositoryReceivesConfiguredPolicyThroughSpring() {
    runner.withPropertyValues("app.voucher.birthday.discount-amount=50000",
        "app.voucher.birthday.valid-days=14")
        .withBean(JdbcTemplate.class, () -> org.mockito.Mockito.mock(JdbcTemplate.class))
        .withBean(BirthdayVoucherRepository.class)
        .run(context -> {
          assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherRepository.class);
          assertThat(ReflectionTestUtils.getField(context.getBean(BirthdayVoucherRepository.class), "policy"))
              .isSameAs(context.getBean(BirthdayVoucherPolicy.class));
        });
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "app.voucher.birthday.discount-amount=0",
      "app.voucher.birthday.discount-amount=-1",
      "app.voucher.birthday.discount-amount=100001",
      "app.voucher.birthday.discount-amount=9223372036854775807",
      "app.voucher.birthday.discount-amount=1.5",
      "app.voucher.birthday.discount-amount=bad",
      "app.voucher.birthday.valid-days=0",
      "app.voucher.birthday.valid-days=-1",
      "app.voucher.birthday.valid-days=31",
      "app.voucher.birthday.valid-days=bad"
  })
  void invalidOrUnapprovedPropertiesFailFast(String property) {
    runner.withPropertyValues(property).run(context -> {
      assertThat(context).hasFailed();
      assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(IllegalArgumentException.class);
    });
  }
}
