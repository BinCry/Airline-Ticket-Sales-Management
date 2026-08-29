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

  it("khong lap lai dat ve trong dieu huong chinh", () => {
    expect(mainNavigation.some((item) => item.href === "/booking")).toBe(false);
  });

  it("route booking khong to xanh nham tab tim chuyen bay", () => {
    const timChuyenBayLink = layLienKetTheoHref("/search");

    expect(isMainNavigationLinkActive("/booking", timChuyenBayLink)).toBe(false);
  });

  it("route search to xanh tab tim chuyen bay", () => {
    const timChuyenBayLink = layLienKetTheoHref("/search");

    expect(isMainNavigationLinkActive("/search", timChuyenBayLink)).toBe(true);
  });

  it("route quan ly dat cho van to xanh dung tab", () => {
    const quanLyDatChoLink = layLienKetTheoHref("/manage-booking");
    const timChuyenBayLink = layLienKetTheoHref("/search");

    expect(isMainNavigationLinkActive("/manage-booking", quanLyDatChoLink)).toBe(true);
    expect(isMainNavigationLinkActive("/manage-booking", timChuyenBayLink)).toBe(false);
  });
});
