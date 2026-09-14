import { expect, test } from "@playwright/test";

test("giữ trọn nội dung ảnh bài viết trên trang chủ và cẩm nang", async ({ page }) => {
  await page.goto("/");

  const homeStyles = await page.locator("style").allTextContents();
  expect(homeStyles.some((style) => {
    const ruleStart = style.indexOf(".home-latest-article-media img");
    const ruleEnd = style.indexOf("}", ruleStart);

    return ruleStart >= 0 && style.slice(ruleStart, ruleEnd).includes("object-fit: contain");
  })).toBe(true);

  await page.goto("/blog");

  const blogStyles = await page.locator("style").allTextContents();
  expect(blogStyles.some((style) => {
    const ruleStart = style.indexOf(".travel-news-card-media img");
    const ruleEnd = style.indexOf("}", ruleStart);

    return ruleStart >= 0 && style.slice(ruleStart, ruleEnd).includes("object-fit: contain");
  })).toBe(true);
});
