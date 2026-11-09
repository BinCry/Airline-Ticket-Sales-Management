package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class AuditLogCsvWriterTest {

  @Test
  void writesUtf8BomApprovedColumnsAndEscapedVietnameseContent() throws Exception {
    StringWriter writer = new StringWriter();
    AuditLogCsvWriter.writeHeader(writer);
    AuditLogCsvWriter.writeItem(writer, item("Đổi, vé \"mới\"\r\nDòng hai"));
    byte[] bytes = writer.toString().getBytes(StandardCharsets.UTF_8);
    assertThat(bytes).startsWith((byte) 0xef, (byte) 0xbb, (byte) 0xbf);
    assertThat(writer.toString()).startsWith("\ufeff\"id\",\"actorId\",\"actorEmail\",\"actorName\",\"action\",\"targetType\",\"targetId\",\"detail\",\"createdAt\",\"hidden\"\r\n")
        .contains("\"Đổi, vé \"\"mới\"\"\r\nDòng hai\"")
        .contains("\"7\",\"\",\"\",\"\"").endsWith("\"true\"\r\n");
  }

  static Stream<String> formulas() {
    return Stream.of("", " ", "\t", "\r\n", "\u0000\u0001", "\u00a0", "\ufeff", "\u200b")
        .flatMap(prefix -> Stream.of("=SUM(1,2)", "+cmd", "-cmd", "@SUM(1,2)")
            .map(formula -> prefix + formula));
  }

  @ParameterizedTest
  @MethodSource("formulas")
  void neutralizesFormulasAfterWhitespaceAndControlCharacters(String value) throws Exception {
    StringWriter writer = new StringWriter();
    AuditLogCsvWriter.writeItem(writer, item(value));
    assertThat(writer.toString()).contains("\"'" + value + "\"");
  }

  @Test
  void appliesInjectionProtectionToEveryTextColumn() throws Exception {
    StringWriter writer = new StringWriter();
    AuditLogCsvWriter.writeItem(writer, new AuditLogItemResponse(1L, 2L, "=email", "+name", "-action",
        "@type", "\t=target", " =detail", OffsetDateTime.parse("2026-10-24T00:00:00Z"), false));
    assertThat(writer.toString()).contains("\"'=email\"", "\"'+name\"", "\"'-action\"", "\"'@type\"",
        "\"'\t=target\"", "\"' =detail\"");
  }

  @Test
  void preservesSafeTextWithoutSilentlyTruncatingIt() throws Exception {
    StringWriter writer = new StringWriter();
    AuditLogCsvWriter.writeItem(writer, item("Nội dung = 1\t" + "x".repeat(1000)));
    assertThat(writer.toString()).contains("\"Nội dung = 1\t" + "x".repeat(1000) + "\"");
  }

  private AuditLogItemResponse item(String detail) {
    return new AuditLogItemResponse(7L, null, null, null, "system.action", "flight", "VN1", detail,
        OffsetDateTime.parse("2026-10-24T00:00:00Z"), true);
  }
}
