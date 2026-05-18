package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.exception.BadRequestException;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ProductCatalogService {

  private static final Map<String, FareMeta> FARE_CATALOG = Map.of(
      "pho_thong_tiet_kiem",
      new FareMeta("Phổ thông tiết kiệm", List.of("7kg hành lý xách tay", "Đổi vé có phí", "Chọn ghế tính phí")),
      "pho_thong_linh_hoat",
      new FareMeta("Phổ thông linh hoạt", List.of("1 kiện 23kg", "Đổi vé ít phí hơn", "Ưu tiên giữ giá 24 giờ")),
      "thuong_gia",
      new FareMeta("Thương gia", List.of("2 kiện 32kg", "Phòng chờ", "Hoàn đổi linh hoạt"))
  );

  private static final Map<String, AncillaryMeta> ANCILLARY_CATALOG = Map.of(
      "SEAT_PLUS",
      new AncillaryMeta("SEAT_PLUS", "Ghế hàng đầu", "Thêm chỗ duỗi chân và ưu tiên xuống tàu.", 320000),
      "BAG_23",
      new AncillaryMeta("BAG_23", "Hành lý ký gửi 23kg", "Mua trước khi thanh toán hoặc bổ sung sau đặt chỗ.", 290000),
      "MEAL_VN",
      new AncillaryMeta("MEAL_VN", "Suất ăn địa phương", "Tùy chọn món Việt và món chay trên tuyến trực.", 180000),
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

  public AncillaryMeta requireAncillary(String code) {
    AncillaryMeta ancillaryMeta = ANCILLARY_CATALOG.get(normalizeAncillaryCode(code));
    if (ancillaryMeta == null) {
      throw new BadRequestException("Dịch vụ bổ trợ được chọn không hợp lệ.");
    }
    return ancillaryMeta;
  }

  public List<FlightSearchResponse.FareCard> buildFareCards(Collection<FlightSearchResponse.FlightCard> flightCards) {
    return flightCards.stream()
        .collect(Collectors.groupingBy(
            FlightSearchResponse.FlightCard::fareFamily,
            Collectors.minBy(Comparator.comparingLong(FlightSearchResponse.FlightCard::price))
        ))
        .entrySet()
        .stream()
        .map(entry -> {
          FareMeta fareMeta = requireFareMeta(entry.getKey());
          long price = entry.getValue().map(FlightSearchResponse.FlightCard::price).orElse(0L);
          return new FlightSearchResponse.FareCard(entry.getKey(), fareMeta.title(), price, fareMeta.perks());
        })
        .sorted(Comparator.comparing(FlightSearchResponse.FareCard::price))
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

  public record FareMeta(String title, List<String> perks) {
  }

  public record AncillaryMeta(String code, String name, String description, long price) {
  }
}
