import { expect, test } from "@playwright/test";

import { jsonResponse, seedAuthSession, taoThoiDiemTuongLai } from "./e2e-helpers";

function taoBookingOverview(overrides: Record<string, unknown> = {}) {
  return {
    bookingCode: "A6C2P1",
    status: "held",
    paymentStatus: "pending",
    holdExpiresAt: taoThoiDiemTuongLai(30),
    ticketedAt: null,
    tripType: "one_way",
    steps: ["Chọn chuyến bay", "Giữ chỗ thành công"],
    segments: [
      {
        inventoryId: 101,
        code: "VN5201",
        from: "Thành phố Hồ Chí Minh",
        to: "Hà Nội",
        originCode: "SGN",
        destinationCode: "HAN",
        departureAt: taoThoiDiemTuongLai(24 * 60),
        arrivalAt: taoThoiDiemTuongLai(24 * 60 + 130),
        fareFamily: "pho_thong_tiet_kiem",
        fareTitle: "Phổ thông tiết kiệm",
        pricePerPassenger: 1490000,
        passengerCount: 1,
        subtotalAmount: 1490000,
        status: "scheduled",
        statusLabel: "Theo lịch",
        gate: "12A",
        note: "Đúng giờ"
      }
    ],
    contact: {
      fullName: "Nguyễn Văn A",
      email: "khach.hang@gmail.com",
      phone: "0900000001"
    },
    passengers: [
      {
        fullName: "Nguyễn Văn A",
        passengerType: "adult",
        dateOfBirth: "1995-05-12",
        documentType: "CCCD",
        documentNumber: "079123456789"
      }
    ],
    ancillaries: [],
    seatSelections: [],
    tickets: [],
    boardingPasses: [],
    refundRequest: null,
    paymentMethods: ["Chuyển khoản SePay"],
    priceSummary: {
      baseAmount: 1490000,
      ancillaryAmount: 0,
      discountAmount: 0,
      totalAmount: 1490000,
      currency: "VND",
      appliedVoucherCode: null
    },
    ...overrides
  };
}

function taoFlight(overrides: Record<string, unknown> = {}) {
  return {
    flightId: 18,
    code: "VN5201",
    from: "Thành phố Hồ Chí Minh",
    to: "Hà Nội",
    originCode: "SGN",
    destinationCode: "HAN",
    departureAt: taoThoiDiemTuongLai(24 * 60),
    arrivalAt: taoThoiDiemTuongLai(24 * 60 + 130),
    status: "on_time",
    statusLabel: "Đúng giờ",
    gate: "12A",
    note: "Khai thác ổn định",
    salesOpen: true,
    baseFare: 1490000,
    fareSummaries: [
      {
        fareFamily: "pho_thong_tiet_kiem",
        title: "Phổ thông tiết kiệm",
        totalSeats: 120,
        price: 1490000,
        rowStart: 9,
        rowEnd: 28
      }
    ],
    ...overrides
  };
}

function taoVoucher(overrides: Record<string, unknown> = {}) {
  return {
    voucherId: 501,
    userId: 18,
    memberEmail: "hoi.vien@gmail.com",
    memberDisplayName: "Hội viên Kim",
    voucherCode: "OPS52026",
    title: "Ưu đãi vận hành",
    description: "Áp dụng khi cần hỗ trợ sau bán.",
    discountAmount: 200000,
    currency: "VND",
    status: "AVAILABLE",
    expiresAt: taoThoiDiemTuongLai(14 * 24 * 60),
    usedAt: null,
    bookingCode: null,
    ...overrides
  };
}

test("backoffice finance duyệt rồi ẩn yêu cầu hoàn vé", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["customer_support"],
    permissions: ["backoffice.finance"]
  });

  let refunds = [
    {
      id: 55,
      bookingCode: "A6C2P1",
      bookingStatus: "refund_pending",
      contactName: "Nguyễn Văn A",
      reason: "Không thể đi đúng lịch.",
      refundAmount: 1490000,
      status: "pending",
      createdAt: taoThoiDiemTuongLai(-120)
    }
  ];

  await page.route(/\/api\/backoffice\/finance\/refunds(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse(refunds));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/approve")) {
      refunds = refunds.map((refund) =>
        refund.id === 55
          ? {
              ...refund,
              bookingStatus: "cancelled",
              status: "approved"
            }
          : refund
      );
      await route.fulfill(jsonResponse(refunds[0]));
      return;
    }

    if (request.method() === "DELETE") {
      refunds = [];
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.abort();
  });

  await page.goto("/backoffice/finance");

  const row = page.locator("tr", { hasText: "A6C2P1" });
  await expect(row).toBeVisible();
  await row.locator(".finance-approve-button").click();
  await expect(row).toContainText("Đã duyệt");

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await row.getByRole("button").click();
  await expect(page.locator("tr", { hasText: "A6C2P1" })).toHaveCount(0);
});

test("backoffice support gửi lại email lỗi và đổi trạng thái", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["customer_support"],
    permissions: ["backoffice.support"]
  });

  let notifications: Array<{
    bookingCode: string;
    createdAt: string;
    id: number;
    lastError: string | null;
    recipientEmail: string;
    retryCount: number;
    sentAt: string | null;
    status: string;
    subject: string;
    type: string;
    updatedAt: string;
  }> = [
    {
      id: 71,
      type: "TICKET_EMAIL",
      bookingCode: "A6C2P1",
      recipientEmail: "guest@example.com",
      subject: "Email vé cho booking A6C2P1",
      status: "FAILED",
      retryCount: 0,
      lastError: "SMTP timeout",
      createdAt: taoThoiDiemTuongLai(-60),
      updatedAt: taoThoiDiemTuongLai(-55),
      sentAt: null
    }
  ];

  await page.route(/\/api\/backoffice\/support\/notifications(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse(notifications));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/retry")) {
      notifications = notifications.map((notification) =>
        notification.id === 71
          ? {
              ...notification,
              status: "SENT",
              retryCount: 1,
              lastError: null,
              sentAt: taoThoiDiemTuongLai(-5),
              updatedAt: taoThoiDiemTuongLai(-5)
            }
          : notification
      );
      await route.fulfill(jsonResponse(notifications[0]));
      return;
    }

    await route.abort();
  });

  await page.goto("/backoffice/support");

  const row = page.locator("tr", { hasText: "guest@example.com" });
  await expect(row).toBeVisible();
  await row.locator(".finance-approve-button").click();
  await expect(row).toContainText("Đã gửi");
  await expect(row).toContainText("Không cần thao tác thêm");
});

test("backoffice sales tạo booking hộ rồi xuất vé", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["customer_support"],
    permissions: ["backoffice.sales"]
  });

  let createPayload: Record<string, unknown> | null = null;
  let bookings = [] as Array<Record<string, unknown>>;

  const createdHold = {
    bookingCode: "A6C2P1",
    status: "held",
    expiresAt: taoThoiDiemTuongLai(30),
    createdAt: taoThoiDiemTuongLai(-1),
    tripType: "one_way",
    contact: {
      fullName: "Nguyễn Văn A",
      email: "khach.hang@gmail.com",
      phone: "0900000001"
    },
    passengers: [
      {
        fullName: "Nguyễn Văn A",
        passengerType: "adult",
        dateOfBirth: "1995-05-12",
        documentType: "CCCD",
        documentNumber: "079123456789"
      }
    ],
    selectedSegments: [],
    selectedAncillaries: [],
    priceSummary: {
      baseAmount: 1490000,
      ancillaryAmount: 0,
      discountAmount: 0,
      totalAmount: 1490000,
      currency: "VND",
      appliedVoucherCode: null
    }
  };

  await page.route(/\/api\/backoffice\/sales\/bookings(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse(bookings));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/bookings")) {
      createPayload = request.postDataJSON() as Record<string, unknown>;
      bookings = [taoBookingOverview()];
      await route.fulfill(jsonResponse(createdHold));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/issue-ticket")) {
      bookings = [
        taoBookingOverview({
          status: "ticketed",
          paymentStatus: "paid",
          ticketedAt: taoThoiDiemTuongLai(-2),
          steps: ["Chọn chuyến bay", "Giữ chỗ thành công", "Thanh toán thành công"],
          tickets: [
            {
              ticketNumber: "7380000000001",
              passengerName: "Nguyễn Văn A",
              status: "issued",
              issuedAt: taoThoiDiemTuongLai(-2)
            }
          ]
        })
      ];
      await route.fulfill(jsonResponse(bookings[0]));
      return;
    }

    await route.abort();
  });

  await page.goto("/backoffice/sales");

  const createForm = page.locator("form").filter({ hasText: "Đặt vé hộ tối thiểu" });
  await createForm.getByLabel("Inventory đi").fill("101");
  await createForm.getByLabel("Tên liên hệ").fill("Nguyễn Văn A");
  await createForm.getByLabel("Email liên hệ").fill("khach.hang@gmail.com");
  await createForm.getByLabel("Số điện thoại").fill("0900000001");
  await createForm.getByLabel("Họ tên hành khách").fill("Nguyễn Văn A");
  await createForm.getByLabel("Ngày sinh").fill("1995-05-12");
  await createForm.getByLabel("Số giấy tờ").fill("079123456789");
  await createForm.getByRole("button", { name: "Tạo booking hộ" }).click();

  await expect.poll(() => createPayload).not.toBeNull();
  await expect(page.locator("tr", { hasText: "A6C2P1" })).toBeVisible();
  await expect
    .poll(() => (createPayload as { tripType?: string } | null)?.tripType)
    .toBe("one_way");
  await expect
    .poll(() => (createPayload as { segments?: Array<{ inventoryId: number }> } | null)?.segments?.[0]?.inventoryId)
    .toBe(101);

  const row = page.locator("tr", { hasText: "A6C2P1" });
  await row.getByRole("button", { name: "Xuất vé hộ" }).click();
  await expect(row).toContainText("Đã xuất vé");
  await expect(row.getByRole("button", { name: "Xuất vé hộ" })).toHaveCount(0);
});

test("backoffice operations hủy rồi ẩn chuyến đã hủy", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["operations_staff"],
    permissions: ["backoffice.operations"]
  });

  let flights = [taoFlight()];

  await page.route(/\/api\/backoffice\/operations\/flights(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse({
        queryCode: null,
        queryDate: null,
        flights
      }));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/cancel")) {
      flights = flights.map((flight) =>
        flight.flightId === 18
          ? taoFlight({
              status: "cancelled",
              statusLabel: "Đã hủy",
              salesOpen: false,
              note: "Hủy do điều hành"
            })
          : flight
      );
      await route.fulfill(jsonResponse(flights[0]));
      return;
    }

    if (request.method() === "DELETE") {
      flights = [];
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.abort();
  });

  await page.route(/\/api\/backoffice\/operations\/vouchers(?:\/.*)?(?:\?.*)?$/, async (route) => {
    await route.fulfill(jsonResponse({
      queryEmail: null,
      queryCode: null,
      queryStatus: null,
      vouchers: []
    }));
  });

  await page.goto("/backoffice/operations");

  const flightCard = page.locator("article", { hasText: "VN5201" }).first();
  await expect(flightCard).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await flightCard.getByRole("button", { name: "Hủy chuyến bay" }).click();
  await expect(flightCard).toContainText("Đã hủy");
  await expect(flightCard.getByRole("button", { name: "Ẩn chuyến đã hủy" })).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await flightCard.getByRole("button", { name: "Ẩn chuyến đã hủy" }).click();
  await expect(page.locator("article", { hasText: "VN5201" })).toHaveCount(0);
});

test("backoffice operations thu hồi rồi xóa voucher đã thu hồi", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["operations_staff"],
    permissions: ["backoffice.operations"]
  });

  let vouchers = [taoVoucher()];

  await page.route(/\/api\/backoffice\/operations\/flights(?:\/.*)?(?:\?.*)?$/, async (route) => {
    await route.fulfill(jsonResponse({
      queryCode: null,
      queryDate: null,
      flights: []
    }));
  });

  await page.route(/\/api\/backoffice\/operations\/vouchers(?:\/.*)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse({
        queryEmail: null,
        queryCode: null,
        queryStatus: null,
        vouchers
      }));
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/revoke")) {
      vouchers = vouchers.map((voucher) =>
        voucher.voucherId === 501
          ? taoVoucher({
              status: "REVOKED"
            })
          : voucher
      );
      await route.fulfill(jsonResponse(vouchers[0]));
      return;
    }

    if (request.method() === "DELETE") {
      vouchers = [];
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.abort();
  });

  await page.goto("/backoffice/operations");

  const voucherCard = page.locator("article", { hasText: "OPS52026" }).first();
  await expect(voucherCard).toBeVisible();
  await voucherCard.getByRole("button", { name: "Thu hồi voucher" }).click();
  await expect(voucherCard).toContainText("Đã thu hồi");
  await expect(voucherCard.getByRole("button", { name: "Xóa khỏi danh sách" })).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await voucherCard.getByRole("button", { name: "Xóa khỏi danh sách" }).click();
  await expect(page.locator("article", { hasText: "OPS52026" })).toHaveCount(0);
});

test("backoffice admin cập nhật role, trạng thái và xóa nhật ký", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["operations_staff"],
    permissions: ["backoffice.admin"]
  });

  const dashboard = {
    metrics: [
      {
        label: "Booking đang mở",
        value: "12",
        trend: "+2 so với hôm qua"
      }
    ],
    modules: [
      {
        key: "admin",
        title: "Quản trị hệ thống",
        summary: "Theo dõi người dùng và nhật ký thao tác.",
        roles: ["operations_staff"]
      }
    ],
    auditTrail: [
      {
        id: 81,
        actor: "Ops Lead",
        action: "Đổi role người dùng",
        target: "ops@vna.vn",
        time: "22:00"
      }
    ]
  };

  let users: Array<{
    avatarUrl: string | null;
    displayName: string;
    email: string;
    emailVerified: boolean;
    id: number;
    lastLoginAt: string;
    lockedAt: string | null;
    phone: string;
    roles: string[];
    status: string;
  }> = [
    {
      id: 9,
      email: "ops@vna.vn",
      displayName: "Điều hành A",
      phone: "0900000002",
      status: "active",
      emailVerified: true,
      avatarUrl: null,
      lockedAt: null,
      lastLoginAt: taoThoiDiemTuongLai(-30),
      roles: ["operations_staff"]
    }
  ];
  let auditTrail = [...dashboard.auditTrail];

  await page.route("**/api/admin/dashboard", async (route) => {
    await route.fulfill(jsonResponse({
      ...dashboard,
      auditTrail
    }));
  });

  await page.route("**/api/admin/users**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill(jsonResponse(users));
      return;
    }

    if (request.method() === "PATCH" && url.pathname.endsWith("/roles")) {
      const payload = request.postDataJSON() as { roles?: string[] };
      users = users.map((user) =>
        user.id === 9
          ? {
              ...user,
              roles: payload.roles ?? user.roles
            }
          : user
      );
      await route.fulfill(jsonResponse(users[0]));
      return;
    }

    if (request.method() === "PATCH" && url.pathname.endsWith("/status")) {
      const payload = request.postDataJSON() as { status?: string };
      users = users.map((user) =>
        user.id === 9
          ? {
              ...user,
              status: payload.status ?? user.status,
              lockedAt: payload.status === "locked" ? taoThoiDiemTuongLai(-1) : null
            }
          : user
      );
      await route.fulfill(jsonResponse(users[0]));
      return;
    }

    await route.abort();
  });

  await page.route("**/api/admin/audit-logs/**", async (route) => {
    auditTrail = [];
    await route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/backoffice/admin");

  const row = page.locator("tr", { hasText: "ops@vna.vn" });
  await expect(row).toBeVisible();

  await row.locator("select").nth(0).selectOption("customer_support");
  await row.getByRole("button", { name: "Lưu role" }).click();
  await expect(row).toContainText("Chăm sóc khách hàng");

  await row.locator("select").nth(1).selectOption("locked");
  await row.getByRole("button", { name: "Lưu trạng thái" }).click();
  await expect(row).toContainText("Đã khóa");

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.locator(".admin-audit-delete-button").click();
  await expect(page.locator("article", { hasText: "Ops Lead" })).toHaveCount(0);
});
