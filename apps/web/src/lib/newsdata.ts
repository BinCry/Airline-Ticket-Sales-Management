import { formatDate } from "@/lib/format";
import { rewriteNewsImageUrl } from "@/lib/news-images";
import { getNewsDataApiKey } from "@/lib/server-env";

const NEWSDATA_ENDPOINT = "https://newsdata.io/api/1/latest";
const NEWSDATA_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const ARTICLE_METADATA_REVALIDATE_SECONDS = 60 * 60 * 12;
const ARTICLE_METADATA_USER_AGENT =
  "Mozilla/5.0 (compatible; QLVMBArticleMetadata/1.0; +https://airticket.bincrydev.id.vn)";

const fallbackTravelArticles = [
  {
    title: "Phú Quốc đầu mùa nắng: lịch trình gọn cho kỳ nghỉ 3 ngày 2 đêm",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 11 phút",
    image: "/images/danang-coast.jpg",
    summary:
      "Gợi ý lịch trình ngắn ngày, điểm ăn chơi nổi bật và thời điểm bay phù hợp cho kỳ nghỉ biển.",
    href: "/blog",
    external: false
  },
  {
    title: "Mẹo đi sân bay buổi sáng sớm để làm thủ tục nhanh và ít chờ hơn",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 9 phút",
    image: "/images/airport-terminal.jpg",
    summary:
      "Những bước chuẩn bị gọn, từ check-in đến hành lý xách tay, giúp bạn vào nhà ga đỡ áp lực hơn.",
    href: "/blog",
    external: false
  },
  {
    title: "Đà Nẵng cuối tuần: ăn gì, đi đâu và nên chọn khung giờ bay nào",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 12 phút",
    image: "/images/danang-sunset.jpg",
    summary:
      "Một hành trình cuối tuần cân bằng giữa biển, ẩm thực và các khung giờ bay thuận tiện cho nhóm bạn.",
    href: "/blog",
    external: false
  },
  {
    title: "Nội Bài trong ngày cao điểm: các bước chuẩn bị giúp chuyến đi nhẹ hơn",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 8 phút",
    image: "/images/vietnam-airport.jpg",
    summary:
      "Từ chọn giờ đến sân bay đến kiểm tra giấy tờ, đây là checklist giúp chuyến đi trơn tru hơn.",
    href: "/blog",
    external: false
  },
  {
    title: "Huế mùa đẹp nhất: cách lên lịch bay và nghỉ ngơi để không bị gấp gáp",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 10 phút",
    image: "/images/airport-terminal.jpg",
    summary:
      "Kinh nghiệm chia lịch trình, chọn giờ bay và cân đối điểm tham quan khi đi Huế ngắn ngày.",
    href: "/blog",
    external: false
  },
  {
    title: "Nha Trang cho nhóm bạn: mẹo chọn chuyến bay và lịch trình 2 ngày 1 đêm",
    source: "Cẩm nang Vietnam Airlines",
    readTime: "Đọc trong khoảng 9 phút",
    image: "/images/danang-coast.jpg",
    summary:
      "Các gợi ý thực tế để đi nhanh, chơi gọn và tối ưu thời gian nghỉ ngơi khi bay cuối tuần.",
    href: "/blog",
    external: false
  }
] as const;

const preferredSourceIds = new Set([
  "cafef",
  "dantri",
  "laodong",
  "thanhnien",
  "tienphong",
  "tuoitre",
  "vietnamplus",
  "vneconomy",
  "vnexpress"
]);

const blockedSourceIds = new Set(["kenh14", "soha"]);

const travelKeywords = [
  "du lịch",
  "điểm đến",
  "cẩm nang",
  "khám phá",
  "nghỉ dưỡng",
  "resort",
  "sân bay",
  "check-in",
  "hành trình",
  "tour"
];

interface NewsDataArticle {
  category?: string[] | string | null;
  description?: string | null;
  image_url?: string | null;
  keywords?: string[] | string | null;
  link?: string | null;
  pubDate?: string | null;
  source_id?: string | null;
  source_name?: string | null;
  title?: string | null;
}

interface NewsDataResponse {
  results?: NewsDataArticle[];
  status?: string;
}

interface ArticleMetadata {
  description?: string;
  image?: string;
  siteName?: string;
  title?: string;
}

export interface TravelArticlePreview {
  title: string;
  source: string;
  readTime: string;
  image: string;
  summary: string;
  href: string;
  external: boolean;
}

const namedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "...",
  laquo: "\"",
  ldquo: "\"",
  lsquo: "'",
  lt: "<",
  nbsp: " ",
  ndash: "-",
  quot: "\"",
  raquo: "\"",
  rdquo: "\"",
  rsquo: "'"
};

function decodeNumericEntity(rawCode: string, radix: number) {
  const codePoint = Number.parseInt(rawCode, radix);

  if (!Number.isFinite(codePoint)) {
    return "";
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

function decodeHtmlEntities(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      decodeNumericEntity(code, 16)
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      decodeNumericEntity(code, 10)
    )
    .replace(/#x([0-9a-f]+);/gi, (_, code: string) =>
      decodeNumericEntity(code, 16)
    )
    .replace(/#(\d+);/g, (_, code: string) => decodeNumericEntity(code, 10))
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const normalizedName = name.toLowerCase();
      return namedHtmlEntities[normalizedName] ?? match;
    });
}

function cleanArticleText(value: string | null | undefined) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html: string, metaKeys: string[]) {
  for (const metaKey of metaKeys) {
    const escapedMetaKey = escapeRegExp(metaKey);
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escapedMetaKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedMetaKey}["'][^>]*>`,
        "i"
      )
    ];

    for (const pattern of patterns) {
      const matchedContent = html.match(pattern)?.[1];

      if (matchedContent) {
        return cleanArticleText(matchedContent);
      }
    }
  }

  return "";
}

function extractDocumentTitle(html: string) {
  const matchedTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanArticleText(matchedTitle);
}

function extractArticleMetadata(html: string): ArticleMetadata {
  const title =
    extractMetaContent(html, ["og:title", "twitter:title"]) ||
    extractDocumentTitle(html);
  const description =
    extractMetaContent(html, ["og:description", "description", "twitter:description"]);
  const image = extractMetaContent(html, ["og:image", "twitter:image"]);
  const siteName =
    extractMetaContent(html, ["og:site_name", "application-name"]) ||
    extractMetaContent(html, ["twitter:site"]);

  return {
    description: description || undefined,
    image: image || undefined,
    siteName: siteName || undefined,
    title: title || undefined
  };
}

function getArticleHostLabel(articleUrl: string) {
  try {
    const hostname = new URL(articleUrl).hostname.replace(/^www\./i, "");
    const parts = hostname.split(".");
    const rootName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

    return rootName
      .split(/[-_]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

function normalizeLooseText(value: string | null | undefined) {
  return cleanArticleText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function hasAlignedSourceName(sourceName: string | null | undefined, articleUrl: string) {
  const normalizedSource = normalizeLooseText(sourceName);
  const normalizedHost = normalizeLooseText(getArticleHostLabel(articleUrl));

  if (!normalizedSource || !normalizedHost) {
    return false;
  }

  return (
    normalizedSource.includes(normalizedHost) ||
    normalizedHost.includes(normalizedSource)
  );
}

function buildTitleFromArticleUrl(articleUrl: string) {
  try {
    const pathname = new URL(articleUrl).pathname;
    const slug = pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.[a-z0-9]+$/i, "")
      ?.replace(/-\d{8,}$/i, "")
      ?.trim();

    if (!slug) {
      return "";
    }

    const replacements: Record<string, string> = {
      ai: "AI",
      hcmc: "HCMC",
      ite: "ITE",
      tphcm: "TP.HCM",
      tp: "TP"
    };

    return slug
      .split("-")
      .filter(Boolean)
      .map((segment) => {
        const normalizedSegment = segment.toLowerCase();

        if (replacements[normalizedSegment]) {
          return replacements[normalizedSegment];
        }

        if (/^\d+$/.test(segment)) {
          return segment;
        }

        return segment.charAt(0).toUpperCase() + segment.slice(1);
      })
      .join(" ");
  } catch {
    return "";
  }
}

function startsWithLowercaseLetter(value: string) {
  const firstCharacter = value.trim().charAt(0);

  if (!firstCharacter) {
    return false;
  }

  return (
    firstCharacter === firstCharacter.toLocaleLowerCase("vi-VN") &&
    firstCharacter !== firstCharacter.toLocaleUpperCase("vi-VN")
  );
}

async function fetchArticleMetadata(articleUrl: string) {
  const normalizedArticleUrl = articleUrl.trim();

  if (!normalizedArticleUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedArticleUrl);

    if (parsedUrl.protocol !== "https:") {
      return null;
    }

    const response = await fetch(normalizedArticleUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": ARTICLE_METADATA_USER_AGENT
      },
      next: {
        revalidate: ARTICLE_METADATA_REVALIDATE_SECONDS
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("text/html")) {
      return null;
    }

    return extractArticleMetadata(await response.text());
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined) {
  return cleanArticleText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLocaleLowerCase("vi-VN");
}

const normalizedTravelKeywords = travelKeywords.map((keyword) =>
  normalizeText(keyword)
);

function toTextList(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function hasTravelSignal(article: NewsDataArticle) {
  const searchableText = normalizeText(
    [
      article.title,
      article.description,
      ...toTextList(article.keywords),
      article.source_name,
      ...toTextList(article.category)
    ]
      .join(" ")
      .trim()
  );

  return normalizedTravelKeywords.some((keyword) =>
    searchableText.includes(keyword)
  );
}

function formatPublishedDate(value: string | null | undefined) {
  if (!value) {
    return "Tin mới cập nhật";
  }

  const publishedAt = new Date(value);

  if (Number.isNaN(publishedAt.getTime())) {
    return "Tin mới cập nhật";
  }

  return `Đăng ngày ${formatDate(publishedAt)}`;
}

function scoreArticle(article: NewsDataArticle) {
  let score = 0;

  if (article.source_id && preferredSourceIds.has(article.source_id)) {
    score += 4;
  }

  const titleText = normalizeText(article.title);
  const descriptionText = normalizeText(article.description);

  if (titleText.includes("du lich")) {
    score += 3;
  }

  if (titleText.includes("diem den") || titleText.includes("kham pha")) {
    score += 2;
  }

  if (
    descriptionText.includes("du lich") ||
    descriptionText.includes("nghi duong") ||
    descriptionText.includes("hanh trinh")
  ) {
    score += 1;
  }

  if (toTextList(article.category).includes("lifestyle")) {
    score += 1;
  }

  return score;
}

async function mapArticleToPreview(
  article: NewsDataArticle
): Promise<TravelArticlePreview | null> {
  if (!article.link) {
    return null;
  }

  const resolvedMetadata = await fetchArticleMetadata(article.link);
  const sourceLabelFromUrl = getArticleHostLabel(article.link);
  const titleFromNewsData = cleanArticleText(article.title);
  const titleFromUrl = buildTitleFromArticleUrl(article.link);
  const shouldUseTitleFromUrl =
    !resolvedMetadata?.title &&
    Boolean(titleFromUrl) &&
    (!titleFromNewsData || startsWithLowercaseLetter(titleFromNewsData));
  const title =
    resolvedMetadata?.title ||
    (shouldUseTitleFromUrl ? titleFromUrl : titleFromNewsData);
  const source = cleanArticleText(article.source_name) || "Nguồn du lịch";
  const summary =
    cleanArticleText(article.description) ||
    "Xem nhanh bài viết mới để cập nhật thêm kinh nghiệm du lịch.";

  const resolvedSource =
    resolvedMetadata?.siteName ||
    (hasAlignedSourceName(source, article.link) ? source : sourceLabelFromUrl || source);
  const resolvedSummary = resolvedMetadata?.description || summary;

  if (!title) {
    return null;
  }

  return {
    title,
    source: resolvedSource,
    readTime: formatPublishedDate(article.pubDate),
    image: rewriteNewsImageUrl(resolvedMetadata?.image || article.image_url),
    summary: resolvedSummary,
    href: article.link,
    external: true
  };
}

function mergeWithFallback(
  liveArticles: TravelArticlePreview[],
  limit: number
) {
  if (liveArticles.length > 0) {
    return liveArticles.slice(0, limit);
  }

  const mergedArticles = [...liveArticles];
  const seenTitles = new Set(
    liveArticles.map((article) => normalizeText(article.title))
  );

  for (const article of fallbackTravelArticles) {
    if (mergedArticles.length >= limit) {
      break;
    }

    const normalizedTitle = normalizeText(article.title);

    if (seenTitles.has(normalizedTitle)) {
      continue;
    }

    mergedArticles.push(article);
    seenTitles.add(normalizedTitle);
  }

  return mergedArticles;
}

async function filterLiveArticles(
  results: NewsDataArticle[],
  includeSecondarySources: boolean,
  limit: number
) {
  const prioritizedArticles = results
    .filter((article) => {
      const sourceId = article.source_id;

      if (!sourceId) {
        return false;
      }

      return includeSecondarySources || !blockedSourceIds.has(sourceId);
    })
    .filter(hasTravelSignal)
    .sort((left, right) => {
      const scoreDiff = scoreArticle(right) - scoreArticle(left);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const rightTime = new Date(right.pubDate ?? 0).getTime();
      const leftTime = new Date(left.pubDate ?? 0).getTime();

      return rightTime - leftTime;
    })
    .slice(0, Math.max(limit * 2, limit));

  const previews = await Promise.all(
    prioritizedArticles.map((article) => mapArticleToPreview(article))
  );

  return previews.filter(
    (article): article is TravelArticlePreview => article !== null
  );
}

export async function getTravelArticles(
  limit = 4,
  includeSecondarySources = false
) {
  const apiKey = getNewsDataApiKey();

  if (!apiKey) {
    return mergeWithFallback([], limit);
  }

  const searchParams = new URLSearchParams({
    apikey: apiKey,
    country: "vn",
    image: "1",
    language: "vi",
    q: "du lịch",
    removeduplicate: "1"
  });

  try {
    const response = await fetch(`${NEWSDATA_ENDPOINT}?${searchParams.toString()}`, {
      next: { revalidate: NEWSDATA_REVALIDATE_SECONDS }
    });

    if (!response.ok) {
      return mergeWithFallback([], limit);
    }

    const data = (await response.json()) as NewsDataResponse;
    const results = Array.isArray(data.results) ? data.results : [];
    const filteredArticles = (
      await filterLiveArticles(results, includeSecondarySources, limit)
    ).slice(0, limit);

    if (filteredArticles.length > 0) {
      return mergeWithFallback(filteredArticles, limit);
    }
  } catch {
    return mergeWithFallback([], limit);
  }

  return mergeWithFallback([], limit);
}

export async function getLatestTravelArticles(limit = 4) {
  return getTravelArticles(limit, false);
}
