package com.qlvmb.airticket.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class OtpDeliveryService {

  private static final Logger LOGGER = LoggerFactory.getLogger(OtpDeliveryService.class);
  private final @Nullable JavaMailSender mailSender;
  private final boolean mailEnabled;
  private final String fromEmail;

  public OtpDeliveryService(
      @Nullable JavaMailSender mailSender,
      @Value("${app.mail.enabled}") boolean mailEnabled,
      @Value("${app.mail.from-email:}") String fromEmail
  ) {
    this.mailSender = mailSender;
    this.mailEnabled = mailEnabled;
    this.fromEmail = fromEmail;
  }

  public void sendForgotPasswordOtp(String email, String otp) {
    if (!mailEnabled) {
      LOGGER.info("Ma OTP dat lai mat khau cho {} la {}", maskEmail(email), otp);
      return;
    }

    if (mailSender == null) {
      throw new IllegalStateException("Chua cau hinh dich vu gui email.");
    }
    if (fromEmail == null || fromEmail.isBlank()) {
      throw new IllegalStateException("Chua cau hinh email gui OTP.");
    }

    SimpleMailMessage message = new SimpleMailMessage();
    message.setTo(email);
    message.setFrom(fromEmail);
    message.setSubject("Ma OTP dat lai mat khau");
    message.setText(buildForgotPasswordMessage(otp));
    mailSender.send(message);
    LOGGER.info("Da gui OTP dat lai mat khau den {}", maskEmail(email));
  }

  private String maskEmail(String email) {
    int atIndex = email.indexOf("@");
    if (atIndex <= 1) {
      return "***" + email.substring(Math.max(0, atIndex));
    }
    return email.substring(0, 1) + "***" + email.substring(atIndex);
  }

  private String buildForgotPasswordMessage(String otp) {
    return """
        Ma OTP dat lai mat khau cua ban la: %s

        Ma nay co hieu luc trong 5 phut.
        Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.
        """.formatted(otp);
  }
}
