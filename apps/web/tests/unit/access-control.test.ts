import { describe, expect, it } from "vitest";

import {
  canAccessBackofficeModule,
  canAccessBackofficeModuleByRoles,
  getAllowedBackofficeModulesByPermissions
} from "@/lib/access-control";

describe("access-control", () => {
  it("cho nhan vien cham soc khach hang truy cap cac module da duoc gop", () => {
    expect(
      getAllowedBackofficeModulesByPermissions([
        "backoffice.sales",
        "backoffice.support",
        "backoffice.finance",
        "backoffice.cms"
      ])
    ).toEqual([
      "sales",
      "support",
      "finance",
      "cms"
    ]);
  });

  it("cho nhan vien van hanh truy cap dieu hanh va kiem soat", () => {
    expect(
      getAllowedBackofficeModulesByPermissions([
        "backoffice.operations",
        "backoffice.admin"
      ])
    ).toEqual([
      "operations",
      "revenue",
      "admin"
    ]);
  });

  it("chan nhan vien cham soc khach hang vao module dieu hanh", () => {
    expect(canAccessBackofficeModule(["backoffice.support"], "operations")).toBe(false);
  });

  it("chan khach vang lai vao backoffice", () => {
    expect(getAllowedBackofficeModulesByPermissions([])).toEqual([]);
  });

  it("khong fallback sang role khi kiem tra permission o web", () => {
    expect(canAccessBackofficeModule(["customer_support"], "sales")).toBe(false);
  });

  it("van co the suy ra module theo role khi can hien nhan vai tro", () => {
    expect(canAccessBackofficeModuleByRoles(["customer_support"], "sales")).toBe(true);
  });
});
