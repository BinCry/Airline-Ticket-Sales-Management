package com.qlvmb.airticket.service;

import com.qlvmb.airticket.exception.BadRequestException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

  private static final int MIN_LENGTH = 10;
  private static final Pattern UPPERCASE = Pattern.compile("\\p{Lu}");
  private static final Pattern LOWERCASE = Pattern.compile("\\p{Ll}");
  private static final Pattern DIGIT = Pattern.compile("\\d");
  private static final Pattern SPECIAL = Pattern.compile("[^\\p{L}\\p{N}\\s]");
  private static final Pattern WHITESPACE = Pattern.compile("\\s");
  private static final List<String> COMMON_FRAGMENTS = List.of(
      "password",
      "passw0rd",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "matkhau",
      "matkhau123",
      "vietnamairlines"
  );

  public void validate(String password, String email, String displayName, String phone) {
    if (password == null || password.length() < MIN_LENGTH) {
      throw new BadRequestException("Mật khẩu phải có tối thiểu 10 ký tự.");
    }

    if (WHITESPACE.matcher(password).find()) {
      throw new BadRequestException("Mật khẩu không được chứa khoảng trắng.");
    }

    if (!UPPERCASE.matcher(password).find()) {
      throw new BadRequestException("Mật khẩu phải có ít nhất 1 chữ hoa.");
    }

    if (!LOWERCASE.matcher(password).find()) {
      throw new BadRequestException("Mật khẩu phải có ít nhất 1 chữ thường.");
    }

    if (!DIGIT.matcher(password).find()) {
      throw new BadRequestException("Mật khẩu phải có ít nhất 1 chữ số.");
    }

    if (!SPECIAL.matcher(password).find()) {
      throw new BadRequestException("Mật khẩu phải có ít nhất 1 ký tự đặc biệt.");
    }

    String normalizedPassword = normalizeForCompare(password);
    if (COMMON_FRAGMENTS.stream().anyMatch(normalizedPassword::contains)) {
      throw new BadRequestException("Mật khẩu quá phổ biến, vui lòng dùng mật khẩu khác.");
    }

    if (containsPersonalFragment(normalizedPassword, email, displayName, phone)) {
      throw new BadRequestException("Mật khẩu không được chứa email, số điện thoại hoặc tên của bạn.");
    }
  }

  private boolean containsPersonalFragment(
      String normalizedPassword,
      String email,
      String displayName,
      String phone
  ) {
    return personalFragments(email, displayName, phone).stream()
        .map(this::normalizeForCompare)
        .filter(fragment -> fragment.length() >= 4)
        .anyMatch(normalizedPassword::contains);
  }

  private List<String> personalFragments(String email, String displayName, String phone) {
    List<String> fragments = new ArrayList<>();
    if (email != null && !email.isBlank()) {
      String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
      fragments.add(normalizedEmail);
      int atIndex = normalizedEmail.indexOf('@');
      if (atIndex > 0) {
        fragments.add(normalizedEmail.substring(0, atIndex));
      }
    }
    if (displayName != null && !displayName.isBlank()) {
      for (String part : displayName.trim().split("\\s+")) {
        fragments.add(part);
      }
      fragments.add(displayName);
    }
    if (phone != null && !phone.isBlank()) {
      fragments.add(phone.replaceAll("\\D", ""));
    }
    return fragments;
  }

  private String normalizeForCompare(String value) {
    String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "");
    return noAccent.toLowerCase(Locale.ROOT);
  }
}
