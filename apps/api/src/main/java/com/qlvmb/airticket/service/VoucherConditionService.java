package com.qlvmb.airticket.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.VoucherConditions;
import com.qlvmb.airticket.domain.dto.VoucherConditions.Route;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class VoucherConditionService {
  private static final Logger LOGGER = LoggerFactory.getLogger(VoucherConditionService.class);
  private final Set<String> loggedInvalidConditions = new LinkedHashSet<>();
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final Set<String> FIELDS = Set.of(
      "routes", "fareFamilies", "departureFrom", "departureTo", "minAmount");
  public static final String CONFIGURATION_ERROR =
      "Voucher đang cấu hình lỗi, vui lòng liên hệ hỗ trợ.";

  private final ObjectMapper mapper;
  private final AirportRepository airports;
  private final ProductCatalogService catalog;

  public VoucherConditionService(ObjectMapper mapper, AirportRepository airports, ProductCatalogService catalog) {
    this.mapper = mapper;
    this.airports = airports;
    this.catalog = catalog;
  }

  public String validateAndEncode(JsonNode input) {
    if (input == null || input.isNull()) {
      return null;
    }
    VoucherConditions conditions = decode(input, true);
    if (conditions == null) {
      return null;
    }
    try {
      return mapper.writeValueAsString(conditions);
    } catch (java.io.IOException exception) {
      throw new IllegalStateException("Không thể lưu điều kiện voucher.");
    }
  }

  public Presentation present(String json, String currency) {
    try {
      VoucherConditions conditions = readStored(json);
      return new Presentation(conditions, describe(conditions, currency), true);
    } catch (BadRequestException exception) {
      return new Presentation(null, CONFIGURATION_ERROR, false);
    }
  }

  public void requireEligible(MemberVoucherEntity voucher, BookingEntity booking) {
    VoucherConditions conditions = readStored(voucher.getConditionJson());
    if (conditions == null) {
      return;
    }
    if (voucher.getCurrency() == null || booking.getCurrency() == null
        || !voucher.getCurrency().equalsIgnoreCase(booking.getCurrency())) {
      throw new BadRequestException("Voucher có điều kiện chỉ áp dụng cho booking cùng đơn vị tiền tệ ("
          + voucher.getCurrency() + "). Không thực hiện quy đổi tiền tệ.");
    }
    long subtotal;
    try {
      subtotal = Math.addExact(booking.getBaseAmount(), booking.getAncillaryAmount());
    } catch (ArithmeticException exception) {
      throw new BadRequestException("Giá trị booking trước giảm không hợp lệ.");
    }
    if (conditions.minAmount() != null && subtotal < conditions.minAmount()) {
      throw new BadRequestException("Giá trị booking trước giảm chưa đạt mức tối thiểu "
          + formatAmount(conditions.minAmount()) + " " + voucher.getCurrency() + ". "
          + describe(conditions, voucher.getCurrency()));
    }
    boolean hasSegmentConditions = !conditions.routes().isEmpty() || !conditions.fareFamilies().isEmpty()
        || conditions.departureFrom() != null || conditions.departureTo() != null;
    if (hasSegmentConditions && booking.getSegments().stream().noneMatch(segment -> matches(segment, conditions))) {
      throw new BadRequestException("Booking chưa có chặng đồng thời đáp ứng điều kiện voucher. "
          + describe(conditions, voucher.getCurrency()));
    }
  }

  private boolean matches(BookingSegmentEntity segment, VoucherConditions conditions) {
    if (!conditions.routes().isEmpty() && conditions.routes().stream().noneMatch(route ->
        route.from().equalsIgnoreCase(segment.getOriginCode())
            && route.to().equalsIgnoreCase(segment.getDestinationCode()))) {
      return false;
    }
    if (!conditions.fareFamilies().isEmpty() && conditions.fareFamilies().stream()
        .noneMatch(fare -> fare.equalsIgnoreCase(segment.getFareFamily()))) {
      return false;
    }
    if (conditions.departureFrom() != null || conditions.departureTo() != null) {
      if (segment.getDepartureAt() == null) {
        return false;
      }
      LocalDate date = segment.getDepartureAt().atZoneSameInstant(ZONE).toLocalDate();
      if (conditions.departureFrom() != null && date.isBefore(conditions.departureFrom())) {
        return false;
      }
      if (conditions.departureTo() != null && date.isAfter(conditions.departureTo())) {
        return false;
      }
    }
    return true;
  }

  private VoucherConditions readStored(String json) {
    if (json == null) {
      return null;
    }
    try {
      JsonNode node = mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(json);
      if (node == null || !node.isObject()) {
        throw invalid("Điều kiện phải là một đối tượng JSON.");
      }
      return decode(node, false);
    } catch (java.io.IOException | IllegalArgumentException | BadRequestException exception) {
      warnInvalidStoredConditions(json, exception);
      throw new BadRequestException(CONFIGURATION_ERROR);
    }
  }

  private void warnInvalidStoredConditions(String json, Exception cause) {
    final String fingerprint;
    try {
      fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(json.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      return;
    }
    // Không ghi JSON hoặc thông điệp lỗi; giới hạn 256 dấu vết để tránh spam và tăng bộ nhớ.
    synchronized (loggedInvalidConditions) {
      if (!loggedInvalidConditions.add(fingerprint)) {
        return;
      }
      if (loggedInvalidConditions.size() > 256) {
        var oldest = loggedInvalidConditions.iterator();
        oldest.next();
        oldest.remove();
      }
    }
    LOGGER.warn("Điều kiện voucher lưu trữ không hợp lệ; mã đối chiếu {}, loại lỗi {}.",
        fingerprint, cause.getClass().getSimpleName());
  }

  private VoucherConditions decode(JsonNode node, boolean validateAirports) {
    if (!node.isObject()) {
      throw invalid("Điều kiện phải là một đối tượng JSON.");
    }
    node.fieldNames().forEachRemaining(field -> {
      if (!FIELDS.contains(field)) {
        throw invalid("Trường điều kiện không được hỗ trợ: " + field + ".");
      }
    });
    LinkedHashSet<Route> routes = new LinkedHashSet<>();
    JsonNode routeNodes = node.get("routes");
    if (routeNodes != null && !routeNodes.isNull()) {
      if (!routeNodes.isArray()) {
        throw invalid("Danh sách tuyến bay không hợp lệ.");
      }
      for (JsonNode route : routeNodes) {
        if (!route.isObject() || route.size() != 2 || !route.has("from") || !route.has("to")) {
          throw invalid("Mỗi tuyến bay phải có đúng sân bay đi và sân bay đến.");
        }
        String from = airportCode(route.get("from"));
        String to = airportCode(route.get("to"));
        if (from.equals(to)) {
          throw invalid("Sân bay đi và sân bay đến phải khác nhau.");
        }
        if (validateAirports && (!airports.existsByCodeIgnoreCase(from) || !airports.existsByCodeIgnoreCase(to))) {
          throw invalid("Mã sân bay trong điều kiện không tồn tại.");
        }
        routes.add(new Route(from, to));
      }
    }
    LinkedHashSet<String> fares = new LinkedHashSet<>();
    JsonNode fareNodes = node.get("fareFamilies");
    if (fareNodes != null && !fareNodes.isNull()) {
      if (!fareNodes.isArray()) {
        throw invalid("Danh sách hạng vé không hợp lệ.");
      }
      for (JsonNode value : fareNodes) {
        if (!value.isTextual()) {
          throw invalid("Mã hạng vé không hợp lệ.");
        }
        String fare = value.textValue().trim().toLowerCase(Locale.ROOT);
        if (!catalog.isFixedFareFamily(fare)) {
          throw invalid("Hạng vé trong điều kiện không tồn tại.");
        }
        fares.add(fare);
      }
    }
    LocalDate fromDate = parseDate(node.get("departureFrom"));
    LocalDate toDate = parseDate(node.get("departureTo"));
    if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
      throw invalid("Ngày khởi hành bắt đầu không được sau ngày kết thúc.");
    }
    Long minAmount = null;
    JsonNode amount = node.get("minAmount");
    if (amount != null && !amount.isNull()) {
      if (!amount.isIntegralNumber() || !amount.canConvertToLong() || amount.longValue() < 0) {
        throw invalid("Giá trị booking tối thiểu phải là số nguyên không âm.");
      }
      minAmount = amount.longValue();
    }
    if (routes.isEmpty() && fares.isEmpty() && fromDate == null && toDate == null && minAmount == null) {
      return null;
    }
    return new VoucherConditions(List.copyOf(routes), List.copyOf(fares), fromDate, toDate, minAmount);
  }

  private String airportCode(JsonNode node) {
    if (node == null || !node.isTextual()) {
      throw invalid("Mã sân bay không hợp lệ.");
    }
    String code = node.textValue().trim().toUpperCase(Locale.ROOT);
    if (!code.matches("[A-Z0-9]{1,8}")) {
      throw invalid("Mã sân bay không hợp lệ.");
    }
    return code;
  }

  private LocalDate parseDate(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    if (!node.isTextual() || !node.textValue().matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
      throw invalid("Ngày khởi hành phải có định dạng yyyy-MM-dd.");
    }
    try {
      return LocalDate.parse(node.textValue());
    } catch (DateTimeParseException exception) {
      throw invalid("Ngày khởi hành không hợp lệ.");
    }
  }

  private String describe(VoucherConditions conditions, String currency) {
    if (conditions == null) {
      return "Không có điều kiện bổ sung.";
    }
    List<String> segmentRules = new ArrayList<>();
    if (!conditions.routes().isEmpty()) {
      segmentRules.add("tuyến " + String.join(" hoặc ", conditions.routes().stream()
          .map(route -> route.from() + " → " + route.to()).toList()));
    }
    if (!conditions.fareFamilies().isEmpty()) {
      segmentRules.add("hạng " + String.join(" hoặc ", conditions.fareFamilies().stream()
          .map(fare -> catalog.requireFareMeta(fare).title()).toList()));
    }
    if (conditions.departureFrom() != null || conditions.departureTo() != null) {
      String dates = "khởi hành";
      if (conditions.departureFrom() != null) {
        dates += " từ " + conditions.departureFrom().format(DISPLAY_DATE);
      }
      if (conditions.departureTo() != null) {
        dates += " đến " + conditions.departureTo().format(DISPLAY_DATE);
      }
      segmentRules.add(dates + " (gồm ngày biên)");
    }
    List<String> rules = new ArrayList<>();
    if (!segmentRules.isEmpty()) {
      rules.add("Có ít nhất một chặng đồng thời đáp ứng: " + String.join("; ", segmentRules));
    }
    if (conditions.minAmount() != null) {
      rules.add("Giá trị booking trước giảm (vé và dịch vụ) từ " + formatAmount(conditions.minAmount())
          + " " + currency);
    }
    return String.join(". ", rules) + ".";
  }

  private String formatAmount(long amount) {
    return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount);
  }

  private BadRequestException invalid(String message) {
    return new BadRequestException(message);
  }

  public record Presentation(VoucherConditions conditions, String conditionSummary, boolean conditionsValid) {
  }
}
