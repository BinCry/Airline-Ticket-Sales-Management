package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class OtpDeliveryServiceTest {

  private static final String FROM_EMAIL = "sender@example.com";

  @Test
  void sendForgotPasswordOtp_shouldSendEmailWhenMailEnabled() {
    JavaMailSender mailSender = mock(JavaMailSender.class);
    OtpDeliveryService otpDeliveryService = new OtpDeliveryService(
        mailSender,
        true,
        FROM_EMAIL
    );

    otpDeliveryService.sendForgotPasswordOtp("khach@example.com", "123456");

    ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mailSender).send(messageCaptor.capture());

    SimpleMailMessage message = messageCaptor.getValue();
    assertThat(message.getTo()).containsExactly("khach@example.com");
    assertThat(message.getFrom()).isEqualTo(FROM_EMAIL);
    assertThat(message.getSubject()).isEqualTo("Ma OTP dat lai mat khau");
    assertThat(message.getText()).contains("123456");
  }

  @Test
  void sendForgotPasswordOtp_shouldNotSendEmailWhenMailDisabled() {
    JavaMailSender mailSender = mock(JavaMailSender.class);
    OtpDeliveryService otpDeliveryService = new OtpDeliveryService(
        mailSender,
        false,
        FROM_EMAIL
    );

    otpDeliveryService.sendForgotPasswordOtp("khach@example.com", "123456");

    verifyNoInteractions(mailSender);
  }

  @Test
  void sendForgotPasswordOtp_shouldFailWhenMailEnabledButSenderMissing() {
    OtpDeliveryService otpDeliveryService = new OtpDeliveryService(
        null,
        true,
        FROM_EMAIL
    );

    assertThatThrownBy(() -> otpDeliveryService.sendForgotPasswordOtp("khach@example.com", "123456"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Chua cau hinh dich vu gui email.");
  }
}
