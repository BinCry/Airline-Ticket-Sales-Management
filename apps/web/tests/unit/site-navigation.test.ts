import { describe, expect, it } from "vitest";

import { mainNavigation } from "@/lib/public-content";
import { buildMainNavigation } from "@/lib/site-navigation";

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

  it("khong con lien ket dat ve cong khai tro thang vao buoc booking", () => {
    expect(
      mainNavigation.find((item) => item.label === "Đặt vé")
    ).toMatchObject({
      href: "/search#dat-ve"
    });
  });
});
