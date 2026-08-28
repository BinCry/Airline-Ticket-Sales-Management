package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class ProductCatalogService {

  public static final String FARE_SAVER = "pho_thong_tiet_kiem";
  public static final String FARE_FLEX = "pho_thong_linh_hoat";
  public static final String FARE_BUSINESS = "thuong_gia";
  public static final long FLEX_PRICE_OFFSET = 5_000L;
  public static final long BUSINESS_PRICE_OFFSET = 10_000L;
  public static final int FIXED_TOTAL_SEATS = 168;
  public static final List<String> FIXED_FARE_FAMILIES = List.of(
      FARE_SAVER,
      FARE_FLEX,
      FARE_BUSINESS
  );

  private static final Map<String, FareMeta> FARE_CATALOG = Map.of(
      FARE_SAVER,
      new FareMeta(FARE_SAVER, "Phổ thông tiết kiệm", List.of(
          "7kg hành lý xách tay",
          "Đổi vé có phí",
          "Chọn ghế khu tiết kiệm"
      ), 0L, 120, 9, 28),
      FARE_FLEX,
      new FareMeta(FARE_FLEX, "Phổ thông linh hoạt", List.of(
          "1 kiện 23kg",
          "Đổi vé linh hoạt hơn",
          "Chọn ghế khu linh hoạt"
      ), FLEX_PRICE_OFFSET, 36, 3, 8),
      FARE_BUSINESS,
      new FareMeta(FARE_BUSINESS, "Thương gia", List.of(
          "2 kiện 32kg",
          "Ưu tiên làm thủ tục",
          "Chọn ghế khu thương gia"
      ), BUSINESS_PRICE_OFFSET, 12, 1, 2)
  );

  private static final Map<String, AncillaryMeta> ANCILLARY_CATALOG = Map.of(
      "SEAT_PLUS",
      new AncillaryMeta("SEAT_PLUS", "Ghế hàng đầu", "Dữ liệu lịch sử ghế ưu tiên.", 320000),
      "BAG_23",
      new AncillaryMeta("BAG_23", "Hành lý ký gửi 23kg", "Mua trước khi thanh toán hoặc bổ sung sau đặt chỗ.", 290000),
      "MEAL_VN",
      new AncillaryMeta("MEAL_VN", "Suất ăn địa phương", "Tùy chọn món Việt và món chay trên tuyến trục.", 180000),
      "INSURE",
      new AncillaryMeta("INSURE", "Bảo hiểm du lịch", "Kích hoạt cùng lượt đặt chỗ và ghi nhận vào hóa đơn.", 95000)
  );

  public FareMeta requireFareMeta(String fareFamily) {
    FareMeta fareMeta = FARE_CATALOG.get(normalizeFareFamily(fareFamily));
    if (fareMeta == null) {
      throw new BadRequestException("Gói giá được chọn không hợp lệ.");
    }
    return fareMeta;
  }

  public List<FareMeta> getFixedFareMetas() {
    return FIXED_FARE_FAMILIES.stream()
        .map(this::requireFareMeta)
        .toList();
  }

  public long resolveFarePrice(String fareFamily, long baseFare) {
    return baseFare + requireFareMeta(fareFamily).priceOffset();
  }

  public long resolveBaseFare(Collection<FlightFareInventoryEntity> inventories) {
    return inventories.stream()
        .filter(inventory -> FARE_SAVER.equals(normalizeFareFamily(inventory.getFareFamily())))
        .findFirst()
        .map(FlightFareInventoryEntity::getPrice)
        .orElseGet(() -> inventories.stream()
            .mapToLong(FlightFareInventoryEntity::getPrice)
            .min()
            .orElseThrow(() -> new BadRequestException("Chuyến bay chưa có cấu hình giá vé hợp lệ.")));
  }

  public boolean isFixedFareFamily(String fareFamily) {
    return FARE_CATALOG.containsKey(normalizeFareFamily(fareFamily));
  }

  public boolean isSeatNumberAllowed(String fareFamily, String seatNumber) {
    FareMeta fareMeta = requireFareMeta(fareFamily);
    int seatRow = extractSeatRow(seatNumber);
    return seatRow >= fareMeta.rowStart() && seatRow <= fareMeta.rowEnd();
  }

  public String resolveFareFamilyBySeatNumber(String seatNumber) {
    int seatRow = extractSeatRow(seatNumber);
    return getFixedFareMetas().stream()
        .filter(fareMeta -> seatRow >= fareMeta.rowStart() && seatRow <= fareMeta.rowEnd())
        .map(FareMeta::fareFamily)
        .findFirst()
        .orElseThrow(() -> new BadRequestException("Ghế được chọn không thuộc sơ đồ hạng vé hiện tại."));
  }

  public AncillaryMeta requireAncillary(String code) {
    AncillaryMeta ancillaryMeta = ANCILLARY_CATALOG.get(normalizeAncillaryCode(code));
    if (ancillaryMeta == null) {
      throw new BadRequestException("Dịch vụ bổ trợ được chọn không hợp lệ.");
    }
    return ancillaryMeta;
  }

  public List<FlightSearchResponse.FareCard> buildFareCards(Collection<FlightSearchResponse.FlightCard> flightCards) {
    long lowestBaseFare = flightCards.stream()
        .mapToLong(FlightSearchResponse.FlightCard::baseFare)
        .min()
        .orElse(0L);

    return getFixedFareMetas().stream()
        .map(fareMeta -> new FlightSearchResponse.FareCard(
            fareMeta.fareFamily(),
            fareMeta.title(),
            flightCards.stream()
                .flatMap(flightCard -> flightCard.fares().stream())
                .filter(fareOption -> fareMeta.fareFamily().equals(normalizeFareFamily(fareOption.fareFamily())))
                .mapToLong(FlightSearchResponse.FareOption::price)
                .min()
                .orElseGet(() -> resolveFarePrice(fareMeta.fareFamily(), lowestBaseFare)),
            fareMeta.perks()
        ))
        .sorted(Comparator.comparingLong(FlightSearchResponse.FareCard::price))
        .toList();
  }

  public String normalizeFareFamily(String fareFamily) {
    if (fareFamily == null) {
      return null;
    }
    return fareFamily.trim().toLowerCase();
  }

  public String normalizeAncillaryCode(String code) {
    return Objects.requireNonNull(code).trim().toUpperCase();
  }

  private int extractSeatRow(String seatNumber) {
    String normalizedSeatNumber = seatNumber == null ? "" : seatNumber.trim().toUpperCase();
    if (!normalizedSeatNumber.matches("^[1-9][0-9]?[A-F]$")) {
      throw new BadRequestException("Ghế được chọn không hợp lệ.");
    }
    return Integer.parseInt(normalizedSeatNumber.substring(0, normalizedSeatNumber.length() - 1));
  }

  public record FareMeta(
      String fareFamily,
      String title,
      List<String> perks,
      long priceOffset,
      int totalSeats,
      int rowStart,
      int rowEnd
  ) {
  }

  public record AncillaryMeta(String code, String name, String description, long price) {
  }
}
