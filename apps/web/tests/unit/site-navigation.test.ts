import { describe, expect, it } from "vitest";

import { mainNavigation } from "@/lib/public-content";
import { buildMainNavigation, isMainNavigationLinkActive } from "@/lib/site-navigation";

function layLienKetTheoHref(href: string) {
  const link = mainNavigation.find((item) => item.href === href);
  expect(link).toBeTruthy();
  return link!;
}

describe("site-navigation", () => {
  it("khong hien lien ket backoffice voi khach thuong", () => {
    expect(buildMainNavigation(["customer.self_service"]).some((item) => item.href === "/backoffice")).toBe(false);
  });

  it("hien lien ket backoffice voi nhan vien cham soc khach hang", () => {
    expect(buildMainNavigation(["backoffice.support"]).some((item) => item.href === "/backoffice")).toBe(true);
  });

  it("hien lien ket backoffice voi nhan vien van hanh", () => {
    expect(buildMainNavigation(["backoffice.admin"]).some((item) => item.href === "/backoffice")).toBe(true);
  });

  it("dieu huong dat ve cong khai di qua route booking", () => {
    expect(layLienKetTheoHref("/booking")).toMatchObject({
      href: "/booking"
    });
  });

  it("to xanh dat ve tai route booking", () => {
    const datVeLink = layLienKetTheoHref("/booking");
    const timChuyenBayLink = layLienKetTheoHref("/search");

    expect(isMainNavigationLinkActive("/booking", datVeLink)).toBe(true);
    expect(isMainNavigationLinkActive("/booking", timChuyenBayLink)).toBe(false);
  });

  it("to xanh dat ve tai route con cua booking", () => {
    const datVeLink = layLienKetTheoHref("/booking");

    expect(isMainNavigationLinkActive("/booking/QC5001/checkout", datVeLink)).toBe(true);
  });

  it("route search chi to xanh tab tim chuyen bay", () => {
    const datVeLink = layLienKetTheoHref("/booking");
    const timChuyenBayLink = layLienKetTheoHref("/search");

    expect(isMainNavigationLinkActive("/search", timChuyenBayLink)).toBe(true);
    expect(isMainNavigationLinkActive("/search", datVeLink)).toBe(false);
  });

  it("route quan ly dat cho van to xanh dung tab", () => {
    const quanLyDatChoLink = layLienKetTheoHref("/manage-booking");
    const timChuyenBayLink = layLienKetTheoHref("/search");
    const datVeLink = layLienKetTheoHref("/booking");

    expect(isMainNavigationLinkActive("/manage-booking", quanLyDatChoLink)).toBe(true);
    expect(isMainNavigationLinkActive("/manage-booking", timChuyenBayLink)).toBe(false);
    expect(isMainNavigationLinkActive("/manage-booking", datVeLink)).toBe(false);
  });
});
