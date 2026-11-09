package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import java.io.IOException;
import java.io.Writer;

public final class AuditLogCsvWriter {

  private AuditLogCsvWriter() {
  }

  public static void writeHeader(Writer writer) throws IOException {
    writer.write('\ufeff');
    writeRow(writer, "id", "actorId", "actorEmail", "actorName", "action", "targetType",
        "targetId", "detail", "createdAt", "hidden");
  }

  public static void writeItem(Writer writer, AuditLogItemResponse item) throws IOException {
    writeRow(writer, item.id(), item.actorId(), item.actorEmail(), item.actorName(), item.action(),
        item.targetType(), item.targetId(), item.detail(), item.createdAt(), item.hidden());
  }

  private static void writeRow(Writer writer, Object... values) throws IOException {
    for (int index = 0; index < values.length; index++) {
      if (index > 0) {
        writer.write(',');
      }
      String value = values[index] == null ? "" : values[index].toString();
      int start = 0;
      // Kiểm tra cả khoảng trắng và ký tự ẩn trước dấu công thức, giữ nguyên nội dung gốc.
      while (start < value.length()) {
        int codePoint = value.codePointAt(start);
        if (!Character.isWhitespace(codePoint) && !Character.isSpaceChar(codePoint)
            && !Character.isISOControl(codePoint) && Character.getType(codePoint) != Character.FORMAT) {
          break;
        }
        start += Character.charCount(codePoint);
      }
      if (start < value.length() && "=+-@".indexOf(value.charAt(start)) >= 0) {
        value = "'" + value;
      }
      writer.write('"');
      writer.write(value.replace("\"", "\"\""));
      writer.write('"');
    }
    writer.write("\r\n");
  }
}
