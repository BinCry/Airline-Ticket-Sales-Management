package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.scheduling.support.SimpleTriggerContext;

class BirthdayVoucherSchedulerTest {
  private final ApplicationContextRunner runner = new ApplicationContextRunner()
      .withInitializer(context -> {
        var sources = context.getEnvironment().getPropertySources();
        sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
      })
      .withUserConfiguration(SchedulingTestConfig.class);

  private void assertDisabled(org.springframework.context.ApplicationContext context) {
    assertThat(context.getBeansOfType(BirthdayVoucherScheduler.class)).isEmpty();
    assertThat(context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks())
        .isEmpty();
    verifyNoInteractions(context.getBean(BirthdayVoucherIssuanceService.class));
    verifyNoInteractions(context.getBean(TaskScheduler.class));
  }

  @Test void missingPropertyDoesNotRegisterOrIssue() {
    runner.run(context -> {
      assertThat(context).hasNotFailed();
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.enabled")).isNull();
      assertDisabled(context);
    });
  }

  @Test void explicitFalseDoesNotRegisterOrIssue() {
    runner.withPropertyValues("app.voucher.birthday.enabled=false").run(context -> {
      assertThat(context).hasNotFailed();
      assertDisabled(context);
    });
  }

  @Test void nonTrueValueDoesNotEnableIssuance() {
    runner.withPropertyValues("app.voucher.birthday.enabled=yes").run(context -> {
      assertThat(context).hasNotFailed();
      assertDisabled(context);
    });
  }

  @Test void explicitTrueRegistersVietnamCronWithoutStartupIssuance() {
    runner.withPropertyValues("app.voucher.birthday.enabled=true").run(context -> {
      assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherScheduler.class);
      var tasks = context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks();
      assertThat(tasks).hasSize(1);
      verifyNoInteractions(context.getBean(BirthdayVoucherIssuanceService.class));
      var trigger = ArgumentCaptor.forClass(Trigger.class);
      verify(context.getBean(TaskScheduler.class)).schedule(any(Runnable.class), trigger.capture());
      assertThat(trigger.getValue()).isInstanceOf(CronTrigger.class);
      assertThat(((CronTrigger) trigger.getValue()).getExpression()).isEqualTo("0 5 0 * * *");
      var clock = Clock.fixed(Instant.parse("2026-11-03T17:04:59Z"), ZoneOffset.UTC);
      assertThat(trigger.getValue().nextExecution(new SimpleTriggerContext(clock)))
          .isEqualTo(Instant.parse("2026-11-03T17:05:00Z"));
    });
  }

  @Test void environmentVariableCanExplicitlyEnableScheduler() {
    runner.withInitializer(context -> context.getEnvironment().getPropertySources().addFirst(
        new SystemEnvironmentPropertySource("birthdayTestEnvironment",
            Map.<String, Object>of("APP_VOUCHER_BIRTHDAY_ENABLED", "true"))))
        .run(context -> {
          assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherScheduler.class);
          assertThat(context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks())
              .hasSize(1);
          verifyNoInteractions(context.getBean(BirthdayVoucherIssuanceService.class));
        });
  }

  @Test void scheduleHasFixedDailyCronAndVietnamTimezone() throws Exception {
    var schedule = BirthdayVoucherScheduler.class.getMethod("issueDaily")
        .getAnnotation(Scheduled.class);
    assertThat(schedule).isNotNull();
    assertThat(schedule.cron()).isEqualTo("0 5 0 * * *");
    assertThat(schedule.zone()).isEqualTo("Asia/Ho_Chi_Minh");
    assertThat(schedule.initialDelay()).isEqualTo(-1);
    assertThat(schedule.fixedDelay()).isEqualTo(-1);
    assertThat(schedule.fixedRate()).isEqualTo(-1);
  }

  @Test void scheduledRunDelegatesOnceWithCurrentInstant() {
    runner.withPropertyValues("app.voucher.birthday.enabled=true").run(context -> {
      var issuance = context.getBean(BirthdayVoucherIssuanceService.class);
      Instant before = Instant.now();
      context.getBean(BirthdayVoucherScheduler.class).issueDaily();
      Instant after = Instant.now();
      var now = ArgumentCaptor.forClass(Instant.class);
      verify(issuance).issueDue(now.capture());
      assertThat(now.getValue()).isBetween(before, after);
      verifyNoMoreInteractions(issuance);
    });
  }

  @Test void memberFailuresOrScanFailureDoNotCauseSchedulerRetry() {
    runner.withPropertyValues("app.voucher.birthday.enabled=true").run(context -> {
      var issuance = context.getBean(BirthdayVoucherIssuanceService.class);
      when(issuance.issueDue(any())).thenReturn(
          new BirthdayVoucherIssuanceService.Report(1, 0, 0, 1, 1, true));
      assertThatCode(() -> context.getBean(BirthdayVoucherScheduler.class).issueDaily())
          .doesNotThrowAnyException();
      verify(issuance).issueDue(any());
      verifyNoMoreInteractions(issuance);
    });
  }

  @Test void unexpectedServiceExceptionIsContainedWithoutRetry() {
    runner.withPropertyValues("app.voucher.birthday.enabled=true").run(context -> {
      var issuance = context.getBean(BirthdayVoucherIssuanceService.class);
      when(issuance.issueDue(any())).thenThrow(new IllegalStateException("Lỗi mô phỏng"));
      assertThatCode(() -> context.getBean(BirthdayVoucherScheduler.class).issueDaily())
          .doesNotThrowAnyException();
      verify(issuance).issueDue(any());
      verifyNoMoreInteractions(issuance);
    });
  }

  @Configuration(proxyBeanMethods = false)
  @EnableScheduling
  @Import(BirthdayVoucherScheduler.class)
  static class SchedulingTestConfig {
    @Bean BirthdayVoucherIssuanceService issuance() {
      var service = mock(BirthdayVoucherIssuanceService.class);
      when(service.issueDue(any())).thenReturn(
          new BirthdayVoucherIssuanceService.Report(0, 0, 0, 0, 0, false));
      return service;
    }

    @Bean TaskScheduler taskScheduler() {
      var scheduler = mock(TaskScheduler.class);
      doReturn(mock(ScheduledFuture.class)).when(scheduler)
          .schedule(any(Runnable.class), any(Trigger.class));
      return scheduler;
    }
  }
}
