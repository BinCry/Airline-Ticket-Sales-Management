import { expect, test } from "@playwright/test";

function findStyleRule(styles: string[], selector: string) {
  for (const style of styles) {
    const ruleStart = style.indexOf(selector);

    if (ruleStart < 0) {
      continue;
    }

    const ruleEnd = style.indexOf("}", ruleStart);

    return style.slice(ruleStart, ruleEnd);
  }

  return "";
}

test("giữ trọn nội dung ảnh bài viết trên trang chủ và cẩm nang", async ({ page }) => {
  await page.goto("/");

  const homeStyles = await page.locator("style").allTextContents();
  const homeMediaRule = findStyleRule(homeStyles, ".home-latest-article-media {");
  const homeImageRule = findStyleRule(homeStyles, ".home-latest-article-media img {");

  expect(homeMediaRule).toContain("border-radius: 22px 22px 0 0");
  expect(homeMediaRule).not.toContain("aspect-ratio");
  expect(homeImageRule).toContain("height: auto");
  expect(homeImageRule).toContain("object-fit: contain");

  await page.goto("/blog");

  const blogStyles = await page.locator("style").allTextContents();
  const blogMediaRule = findStyleRule(blogStyles, ".travel-news-card-media {");
  const blogImageRule = findStyleRule(blogStyles, ".travel-news-card-media img {");

  expect(blogMediaRule).toContain("border-radius: 22px 22px 0 0");
  expect(blogMediaRule).not.toContain("aspect-ratio");
  expect(blogImageRule).toContain("height: auto");
  expect(blogImageRule).toContain("object-fit: contain");
});
