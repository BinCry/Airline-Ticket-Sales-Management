import { ApiClientError, requestApi } from "@/lib/api-client";

export type BackofficeCmsSection = "banner" | "article" | "faq";

export interface BackofficeCmsBannerItem {
  title: string;
  subtitle: string | null;
  cta: string | null;
  locale: string;
}

export interface BackofficeCmsContentItem {
  title: string;
  category: string | null;
  summary: string | null;
  locale: string;
}

export interface BackofficeCmsEntryItem {
  id: number;
  section: BackofficeCmsSection;
  title: string;
  subtitle: string | null;
  cta: string | null;
  category: string | null;
  summary: string | null;
  locale: string;
  sortOrder: number;
  published: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackofficeCmsHomepagePayload {
  banners: BackofficeCmsBannerItem[];
  articles: BackofficeCmsContentItem[];
  faqCards: BackofficeCmsContentItem[];
  entries: BackofficeCmsEntryItem[];
}

export interface BackofficeCmsEntryUpsertInput {
  section: BackofficeCmsSection;
  title: string;
  subtitle?: string | null;
  cta?: string | null;
  category?: string | null;
  summary?: string | null;
  locale: "vi" | "en";
  sortOrder: number;
  published: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isBannerItem(value: unknown): value is BackofficeCmsBannerItem {
  return (
    isObject(value) &&
    typeof value.title === "string" &&
    (value.subtitle === null || typeof value.subtitle === "string") &&
    (value.cta === null || typeof value.cta === "string") &&
    typeof value.locale === "string"
  );
}

function isContentItem(value: unknown): value is BackofficeCmsContentItem {
  return (
    isObject(value) &&
    typeof value.title === "string" &&
    (value.category === null || typeof value.category === "string") &&
    (value.summary === null || typeof value.summary === "string") &&
    typeof value.locale === "string"
  );
}

function isEntryItem(value: unknown): value is BackofficeCmsEntryItem {
  return (
    isObject(value) &&
    typeof value.id === "number" &&
    typeof value.section === "string" &&
    typeof value.title === "string" &&
    (value.subtitle === null || typeof value.subtitle === "string") &&
    (value.cta === null || typeof value.cta === "string") &&
    (value.category === null || typeof value.category === "string") &&
    (value.summary === null || typeof value.summary === "string") &&
    typeof value.locale === "string" &&
    typeof value.sortOrder === "number" &&
    typeof value.published === "boolean" &&
    typeof value.archived === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isHomepagePayload(value: unknown): value is BackofficeCmsHomepagePayload {
  return (
    isObject(value) &&
    Array.isArray(value.banners) &&
    value.banners.every(isBannerItem) &&
    Array.isArray(value.articles) &&
    value.articles.every(isContentItem) &&
    Array.isArray(value.faqCards) &&
    value.faqCards.every(isContentItem) &&
    Array.isArray(value.entries) &&
    value.entries.every(isEntryItem)
  );
}

export async function fetchBackofficeCmsHomepage(
  accessToken: string
): Promise<BackofficeCmsHomepagePayload> {
  const payload = await requestApi<unknown>("/api/backoffice/cms/homepage", {
    accessToken,
    fallbackMessage: "Không thể tải nội dung công khai lúc này."
  });

  if (!isHomepagePayload(payload)) {
    throw new ApiClientError("Dữ liệu nội dung công khai trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function createBackofficeCmsEntry(
  input: BackofficeCmsEntryUpsertInput,
  accessToken: string
): Promise<BackofficeCmsEntryItem> {
  const payload = await requestApi<unknown>("/api/backoffice/cms/homepage", {
    accessToken,
    method: "POST",
    json: input,
    fallbackMessage: "Không thể tạo mục nội dung lúc này."
  });

  if (!isEntryItem(payload)) {
    throw new ApiClientError("Dữ liệu mục nội dung trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function updateBackofficeCmsEntry(
  entryId: number,
  input: BackofficeCmsEntryUpsertInput,
  accessToken: string
): Promise<BackofficeCmsEntryItem> {
  const payload = await requestApi<unknown>(`/api/backoffice/cms/homepage/${entryId}`, {
    accessToken,
    method: "PATCH",
    json: input,
    fallbackMessage: "Không thể cập nhật mục nội dung lúc này."
  });

  if (!isEntryItem(payload)) {
    throw new ApiClientError("Dữ liệu mục nội dung trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function publishBackofficeCmsEntry(
  entryId: number,
  accessToken: string
): Promise<BackofficeCmsEntryItem> {
  const payload = await requestApi<unknown>(`/api/backoffice/cms/homepage/${entryId}/publish`, {
    accessToken,
    method: "POST",
    fallbackMessage: "Không thể phát hành mục nội dung lúc này."
  });

  if (!isEntryItem(payload)) {
    throw new ApiClientError("Dữ liệu mục nội dung trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function archiveBackofficeCmsEntry(
  entryId: number,
  accessToken: string
): Promise<BackofficeCmsEntryItem> {
  const payload = await requestApi<unknown>(`/api/backoffice/cms/homepage/${entryId}/archive`, {
    accessToken,
    method: "POST",
    fallbackMessage: "Không thể lưu trữ mục nội dung lúc này."
  });

  if (!isEntryItem(payload)) {
    throw new ApiClientError("Dữ liệu mục nội dung trả về không hợp lệ.", 500);
  }

  return payload;
}
