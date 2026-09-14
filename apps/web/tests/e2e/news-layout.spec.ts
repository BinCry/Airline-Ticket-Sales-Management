import { expect, test, type Page } from "@playwright/test";

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

async function getMediaDimensions(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements, mediaSelector) =>
    elements.slice(0, 3).map((element) => {
      const mediaRect = element.getBoundingClientRect();
      const image = element.querySelector("img");

      if (!image) {
        throw new Error(`Không tìm thấy ảnh trong ${mediaSelector}`);
      }

      const imageRect = image.getBoundingClientRect();

      return {
        mediaHeight: mediaRect.height,
        mediaWidth: mediaRect.width,
        imageHeight: imageRect.height,
        imageWidth: imageRect.width
      };
    }),
    selector
  );
}

test("ảnh bài viết phủ kín khung đồng nhất trên trang chủ và cẩm nang", async ({ page }) => {
  await page.goto("/");

  const homeStyles = await page.locator("style").allTextContents();
  const homeMediaRule = findStyleRule(homeStyles, ".home-latest-article-media {");
  const homeImageRule = findStyleRule(homeStyles, ".home-latest-article-media img {");

  expect(homeMediaRule).toContain("border-radius: 22px 22px 0 0");
  expect(homeMediaRule).toContain("aspect-ratio: 16 / 9");
  expect(homeMediaRule).toContain("width: 100%");
  expect(homeImageRule).toContain("height: 100%");
  expect(homeImageRule).toContain("object-fit: cover");

  for (const dimensions of await getMediaDimensions(page, ".home-latest-article-media")) {
    expect(dimensions.mediaWidth / dimensions.mediaHeight).toBeCloseTo(16 / 9, 1);
    expect(Math.abs(dimensions.imageWidth - dimensions.mediaWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(dimensions.imageHeight - dimensions.mediaHeight)).toBeLessThanOrEqual(1);
  }

  await page.goto("/blog");

  const blogStyles = await page.locator("style").allTextContents();
  const blogMediaRule = findStyleRule(blogStyles, ".travel-news-card-media {");
  const blogImageRule = findStyleRule(blogStyles, ".travel-news-card-media img {");

  expect(blogMediaRule).toContain("border-radius: 22px 22px 0 0");
  expect(blogMediaRule).toContain("aspect-ratio: 16 / 9");
  expect(blogMediaRule).toContain("width: 100%");
  expect(blogImageRule).toContain("height: 100%");
  expect(blogImageRule).toContain("object-fit: cover");

  for (const dimensions of await getMediaDimensions(page, ".travel-news-card-media")) {
    expect(dimensions.mediaWidth / dimensions.mediaHeight).toBeCloseTo(16 / 9, 1);
    expect(Math.abs(dimensions.imageWidth - dimensions.mediaWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(dimensions.imageHeight - dimensions.mediaHeight)).toBeLessThanOrEqual(1);
  }
});
