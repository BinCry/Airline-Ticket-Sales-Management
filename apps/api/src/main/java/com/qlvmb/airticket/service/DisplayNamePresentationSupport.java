package com.qlvmb.airticket.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

final class DisplayNamePresentationSupport {

  private static final Map<String, String> SEEDED_DISPLAY_NAMES = Map.of(
      "khach hang kiem thu", "Khách hàng",
      "hoi vien kiem thu", "Hội viên",
      "nhan su ho tro kiem thu", "Nhân viên chăm sóc khách hàng",
      "nhan su van hanh kiem thu", "Nhân viên vận hành"
  );
  private static final String SEED_SUFFIX = " kiem thu";

  private DisplayNamePresentationSupport() {
  }

  static String present(String displayName) {
    if (displayName == null) {
      return null;
    }

    String normalizedDisplayName = displayName.trim();
    if (normalizedDisplayName.isBlank()) {
      return normalizedDisplayName;
    }

    String normalizedLookupKey = normalizeLookupKey(normalizedDisplayName);
    String mappedDisplayName = SEEDED_DISPLAY_NAMES.get(normalizedLookupKey);
    if (mappedDisplayName != null) {
      return mappedDisplayName;
    }

    if (normalizedLookupKey.endsWith(SEED_SUFFIX)) {
      return trimLastWords(normalizedDisplayName, 2);
    }

    return normalizedDisplayName;
  }

  static boolean isLegacySeedEmail(String email) {
    if (email == null || email.isBlank()) {
      return false;
    }

    return email.trim().toLowerCase(Locale.ROOT).endsWith("@qlvmb.local");
  }

  private static String normalizeLookupKey(String value) {
    String normalizedValue = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}+", "")
        .replace('đ', 'd')
        .replace('Đ', 'D')
        .toLowerCase(Locale.ROOT)
        .trim();
    return normalizedValue.replaceAll("\\s+", " ");
  }

  private static String trimLastWords(String value, int wordsToTrim) {
    String[] parts = value.trim().split("\\s+");
    if (parts.length <= wordsToTrim) {
      return value.trim();
    }

    return String.join(" ", java.util.Arrays.copyOf(parts, parts.length - wordsToTrim)).trim();
  }
}
