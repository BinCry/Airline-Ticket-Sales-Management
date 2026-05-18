package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.AuthSummaryResponse;
import com.qlvmb.airticket.security.RoleCode;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthSummaryService {

  private static final List<String> PRODUCT_ROLE_ORDER = List.of(
      RoleCode.GUEST,
      RoleCode.CUSTOMER,
      RoleCode.MEMBER,
      RoleCode.CUSTOMER_SUPPORT,
      RoleCode.OPERATIONS_STAFF
  );

  private static final Map<String, List<String>> ROLE_CAPABILITIES = Map.of(
      RoleCode.GUEST,
      List.of(
          "Tra cứu chuyến bay, hỗ trợ, tình trạng chuyến bay và quản lý đặt chỗ ở mức công khai.",
          "Không truy cập hồ sơ tài khoản, loyalty hoặc backoffice."
      ),
      RoleCode.CUSTOMER,
      List.of(
          "Đăng nhập, quản lý hồ sơ, hành khách thường dùng, đặt vé, thanh toán và làm thủ tục.",
          "Theo dõi đặt chỗ, email vé và các thông báo liên quan đến hành trình."
      ),
      RoleCode.MEMBER,
      List.of(
          "Dùng toàn bộ luồng của khách hàng đã đăng ký.",
          "Theo dõi điểm thưởng, xem voucher hiện có và quản lý quyền lợi hội viên trên cùng tài khoản."
      ),
      RoleCode.CUSTOMER_SUPPORT,
      List.of(
          "Tra cứu booking nội bộ, xử lý hỗ trợ sau bán, theo dõi hoàn vé và gửi lại email vé lỗi.",
          "Rà soát nội dung hỗ trợ, FAQ và các kênh CMS công khai trong phạm vi được giao."
      ),
      RoleCode.OPERATIONS_STAFF,
      List.of(
          "Quản lý vai trò và trạng thái tài khoản, theo dõi audit log và dữ liệu vận hành hệ thống.",
          "Cập nhật thông tin điều hành chuyến bay, kiểm tra bất thường thanh toán và xử lý tình huống hệ thống."
      )
  );

  private static final Map<String, String> ROLE_LABELS = Map.of(
      RoleCode.GUEST, "Khách vãng lai",
      RoleCode.CUSTOMER, "Khách hàng",
      RoleCode.MEMBER, "Hội viên",
      RoleCode.CUSTOMER_SUPPORT, "Nhân viên chăm sóc khách hàng",
      RoleCode.OPERATIONS_STAFF, "Nhân viên vận hành"
  );

  @Transactional(readOnly = true)
  public AuthSummaryResponse getSummary() {
    List<AuthSummaryResponse.RoleItem> roles = PRODUCT_ROLE_ORDER.stream()
        .map(roleCode -> new AuthSummaryResponse.RoleItem(
            roleCode,
            ROLE_LABELS.getOrDefault(roleCode, roleCode),
            ROLE_CAPABILITIES.getOrDefault(roleCode, List.of())
        ))
        .toList();

    return new AuthSummaryResponse(
        roles,
        List.of(
            "Sản phẩm chỉ có 5 vai trò: guest, customer, member, customer_support và operations_staff.",
            "Khách vãng lai không vào hồ sơ tài khoản hoặc backoffice.",
            "Chỉ operations_staff được đổi vai trò hoặc trạng thái tài khoản người dùng.",
            "Customer_support không được mở khóa tài khoản hay thay đổi dữ liệu điều hành."
        )
    );
  }
}
