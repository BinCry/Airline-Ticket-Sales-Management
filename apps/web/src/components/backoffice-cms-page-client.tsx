"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  archiveBackofficeCmsEntry,
  createBackofficeCmsEntry,
  fetchBackofficeCmsHomepage,
  publishBackofficeCmsEntry,
  updateBackofficeCmsEntry,
  type BackofficeCmsEntryItem,
  type BackofficeCmsEntryUpsertInput,
  type BackofficeCmsHomepagePayload,
  type BackofficeCmsSection
} from "@/lib/backoffice-cms-api";
import { formatDateTime as formatDateTimeText } from "@/lib/format";
import { footerSections, mainNavigation } from "@/lib/public-content";
import { pushToast } from "@/lib/toast";

type CmsState = "idle" | "loading" | "success" | "error";

const EMPTY_FORM: BackofficeCmsEntryUpsertInput = {
  section: "banner",
  title: "",
  subtitle: "",
  cta: "",
  category: "",
  summary: "",
  locale: "vi",
  sortOrder: 100,
  published: false
};

function formatDateTime(value: string) {
  return formatDateTimeText(value);
}

function formatSectionLabel(section: BackofficeCmsSection) {
  switch (section) {
    case "banner":
      return "Banner";
    case "article":
      return "Bài viết";
    case "faq":
      return "FAQ";
    default:
      return section;
  }
}

function normalizePayload(input: BackofficeCmsEntryUpsertInput): BackofficeCmsEntryUpsertInput {
  return {
    ...input,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    cta: input.cta?.trim() || null,
    category: input.category?.trim() || null,
    summary: input.summary?.trim() || null
  };
}

export function BackofficeCmsPageClient() {
  const [state, setState] = useState<CmsState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [homepage, setHomepage] = useState<BackofficeCmsHomepagePayload | null>(null);
  const [createForm, setCreateForm] = useState<BackofficeCmsEntryUpsertInput>(EMPTY_FORM);
  const [drafts, setDrafts] = useState<Record<number, BackofficeCmsEntryUpsertInput>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void loadHomepageContent(accessToken);
  }, [accessToken]);

  async function loadHomepageContent(nextAccessToken: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const payload = await fetchBackofficeCmsHomepage(nextAccessToken);
      setHomepage(payload);
      setDrafts(
        Object.fromEntries(
          payload.entries.map((entry) => [
            entry.id,
            {
              section: entry.section,
              title: entry.title,
              subtitle: entry.subtitle,
              cta: entry.cta,
              category: entry.category,
              summary: entry.summary,
              locale: entry.locale === "en" ? "en" : "vi",
              sortOrder: entry.sortOrder,
              published: entry.published
            }
          ])
        )
      );
      setState("success");
    } catch (error) {
      setHomepage(null);
      setDrafts({});
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tải nội dung công khai lúc này."));
      setState("error");
    }
  }

  async function handleCreate() {
    if (!accessToken || pendingAction !== null) {
      return;
    }

    setPendingAction("create");
    setErrorMessage(null);
    try {
      await createBackofficeCmsEntry(normalizePayload(createForm), accessToken);
      await loadHomepageContent(accessToken);
      setCreateForm(EMPTY_FORM);
      pushToast({
        title: "Đã tạo mục nội dung",
        message: "Mục nội dung mới đã được thêm vào danh sách biên tập.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tạo mục nội dung lúc này."));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUpdate(entryId: number) {
    if (!accessToken || pendingAction !== null) {
      return;
    }

    const draft = drafts[entryId];
    if (!draft) {
      return;
    }

    setPendingAction(`update-${entryId}`);
    setErrorMessage(null);
    try {
      await updateBackofficeCmsEntry(entryId, normalizePayload(draft), accessToken);
      await loadHomepageContent(accessToken);
      pushToast({
        title: "Đã lưu nội dung",
        message: "Mục nội dung đã được cập nhật.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật mục nội dung."));
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePublish(entryId: number) {
    if (!accessToken || pendingAction !== null) {
      return;
    }

    setPendingAction(`publish-${entryId}`);
    setErrorMessage(null);
    try {
      await publishBackofficeCmsEntry(entryId, accessToken);
      await loadHomepageContent(accessToken);
      pushToast({
        title: "Đã phát hành",
        message: "Mục nội dung đã được mở cho website công khai.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể phát hành mục nội dung."));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleArchive(entryId: number) {
    if (!accessToken || pendingAction !== null) {
      return;
    }

    setPendingAction(`archive-${entryId}`);
    setErrorMessage(null);
    try {
      await archiveBackofficeCmsEntry(entryId, accessToken);
      await loadHomepageContent(accessToken);
      pushToast({
        title: "Đã lưu trữ",
        message: "Mục nội dung đã được đưa khỏi danh sách phát hành.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể lưu trữ mục nội dung."));
    } finally {
      setPendingAction(null);
    }
  }

  const publishedSummary = useMemo(() => {
    if (!homepage) {
      return [];
    }
    return [
      {
        title: "Điều hướng chính",
        description: "Các lối vào đang hiển thị trên website công khai.",
        items: mainNavigation.map((item) => item.label)
      },
      {
        title: "Banner trang chủ",
        description: "Các thông điệp chính đang phát hành cho hành khách.",
        items: homepage.banners.map((item) =>
          item.subtitle?.trim() ? `${item.title} · ${item.subtitle}` : item.title
        )
      },
      {
        title: "Nội dung hỗ trợ và cẩm nang",
        description: "Bài viết và FAQ đang phát hành cho khách tự tra cứu.",
        items: [...homepage.articles, ...homepage.faqCards].map((item) =>
          item.category?.trim() ? `${item.category} · ${item.title}` : item.title
        )
      }
    ];
  }, [homepage]);

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice nội dung"
          title="Biên tập và phát hành nội dung công khai"
          description="Tạo mới, chỉnh sửa, phát hành hoặc lưu trữ mềm các mục banner, bài viết và FAQ đang dùng cho website."
        />

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể xử lý nội dung</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        {state === "loading" ? (
          <article className="booking-inline-info">
            <strong>Đang tải nội dung</strong>
            <p>Đang lấy danh sách mục nội dung và trạng thái phát hành hiện tại.</p>
          </article>
        ) : null}

        <div className="section-split">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Tạo mục mới"
              title="Thêm nội dung mới vào danh sách biên tập"
              description="Mỗi mục có thể được lưu nháp trước khi phát hành ra website công khai."
            />
            <div className="field-grid compact-grid">
              <label className="field">
                <span>Nhóm nội dung</span>
                <select
                  value={createForm.section}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      section: event.target.value as BackofficeCmsSection
                    }))
                  }
                >
                  <option value="banner">Banner</option>
                  <option value="article">Bài viết</option>
                  <option value="faq">FAQ</option>
                </select>
              </label>
              <label className="field">
                <span>Ngôn ngữ</span>
                <select
                  value={createForm.locale}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      locale: event.target.value as "vi" | "en"
                    }))
                  }
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                </select>
              </label>
              <label className="field">
                <span>Thứ tự hiển thị</span>
                <input
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="field result-grid-span-full">
                <span>Tiêu đề</span>
                <input
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Phụ đề</span>
                <input
                  value={createForm.subtitle ?? ""}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      subtitle: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Nhãn CTA</span>
                <input
                  value={createForm.cta ?? ""}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      cta: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Danh mục</span>
                <input
                  value={createForm.category ?? ""}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field result-grid-span-full">
                <span>Tóm tắt</span>
                <textarea
                  className="booking-textarea"
                  rows={4}
                  value={createForm.summary ?? ""}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      summary: event.target.value
                    }))
                  }
                />
              </label>
            </div>
            <div className="booking-action-list">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={createForm.published}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      published: event.target.checked
                    }))
                  }
                />
                <span>Tạo và bật ngay cho website công khai</span>
              </label>
              <button
                type="button"
                className="button button-primary"
                onClick={() => void handleCreate()}
                disabled={pendingAction !== null}
              >
                {pendingAction === "create" ? "Đang tạo..." : "Tạo mục nội dung"}
              </button>
            </div>
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Đang phát hành"
              title="Tóm tắt nội dung hiện đang mở"
              description="Dùng để rà nhanh các khối đang hiển thị công khai trước khi tiếp tục chỉnh sửa."
            />
            <div className="card-grid card-grid-3">
              {publishedSummary.map((group) => (
                <article key={group.title} className="surface-card promo-card">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                  <ul className="list-clean">
                    {group.items.length > 0 ? (
                      group.items.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>Chưa có nội dung đang phát hành.</li>
                    )}
                  </ul>
                </article>
              ))}
            </div>
          </article>
        </div>

        <div className="section-gap" />
        <article className="table-card cms-table-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Danh sách biên tập</span>
              <h3>Mục nội dung theo dõi và cập nhật trực tiếp</h3>
              <p>Mỗi mục có thể lưu chỉnh sửa, phát hành lại hoặc lưu trữ mềm để tránh hard delete.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => accessToken ? void loadHomepageContent(accessToken) : undefined}
              disabled={!accessToken || state === "loading" || pendingAction !== null}
            >
              {state === "loading" ? "Đang tải..." : "Tải lại nội dung"}
            </button>
          </div>
          <div className="stack-list">
            {homepage?.entries.length ? (
              homepage.entries.map((entry) => {
                const draft = drafts[entry.id] ?? EMPTY_FORM;
                const isWorking = pendingAction?.includes(String(entry.id)) ?? false;

                return (
                  <article key={entry.id} className="surface-card admin-nested-card">
                    <div className="result-top">
                      <div>
                        <span className="section-eyebrow">
                          {formatSectionLabel(entry.section)} · {entry.locale.toUpperCase()}
                        </span>
                        <h3>{entry.title}</h3>
                        <p>
                          {entry.published ? "Đang phát hành" : "Đang lưu nháp"} · Cập nhật {formatDateTime(entry.updatedAt)}
                        </p>
                      </div>
                      <span className="pill">{entry.archived ? "Đã lưu trữ" : `Thứ tự ${entry.sortOrder}`}</span>
                    </div>

                    <div className="field-grid compact-grid">
                      <label className="field">
                        <span>Nhóm nội dung</span>
                        <select
                          value={draft.section}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                section: event.target.value as BackofficeCmsSection
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        >
                          <option value="banner">Banner</option>
                          <option value="article">Bài viết</option>
                          <option value="faq">FAQ</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Ngôn ngữ</span>
                        <select
                          value={draft.locale}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                locale: event.target.value as "vi" | "en"
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">Tiếng Anh</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Thứ tự</span>
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                sortOrder: Number(event.target.value)
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                      <label className="field result-grid-span-full">
                        <span>Tiêu đề</span>
                        <input
                          value={draft.title}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                title: event.target.value
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                      <label className="field">
                        <span>Phụ đề</span>
                        <input
                          value={draft.subtitle ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                subtitle: event.target.value
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                      <label className="field">
                        <span>Nhãn CTA</span>
                        <input
                          value={draft.cta ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                cta: event.target.value
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                      <label className="field">
                        <span>Danh mục</span>
                        <input
                          value={draft.category ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                category: event.target.value
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                      <label className="field result-grid-span-full">
                        <span>Tóm tắt</span>
                        <textarea
                          className="booking-textarea"
                          rows={3}
                          value={draft.summary ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                summary: event.target.value
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                      </label>
                    </div>

                    <div className="booking-action-list">
                      <label className="field-checkbox">
                        <input
                          type="checkbox"
                          checked={draft.published}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [entry.id]: {
                                ...draft,
                                published: event.target.checked
                              }
                            }))
                          }
                          disabled={entry.archived || isWorking}
                        />
                        <span>Đánh dấu là đang phát hành</span>
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => void handleUpdate(entry.id)}
                        disabled={entry.archived || isWorking}
                      >
                        {pendingAction === `update-${entry.id}` ? "Đang lưu..." : "Lưu chỉnh sửa"}
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => void handlePublish(entry.id)}
                        disabled={entry.archived || isWorking}
                      >
                        {pendingAction === `publish-${entry.id}` ? "Đang phát hành..." : "Phát hành"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => void handleArchive(entry.id)}
                        disabled={entry.archived || isWorking}
                      >
                        {pendingAction === `archive-${entry.id}` ? "Đang lưu trữ..." : "Lưu trữ mềm"}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <article className="booking-inline-info">
                <strong>{state === "loading" ? "Đang tải..." : "Chưa có nội dung"}</strong>
                <p>
                  {state === "loading"
                    ? "Đang lấy danh sách biên tập."
                    : "Chưa có mục nội dung nào để hiển thị trong bảng biên tập."}
                </p>
              </article>
            )}
          </div>
        </article>

        <div className="section-gap" />
        <article className="surface-card">
          <SectionHeading
            eyebrow="Liên kết công khai"
            title="Các nhóm liên kết cuối trang"
            description="Mọi liên kết dưới đây đang trỏ đúng vào các màn hoặc anchor sử dụng được."
          />
          <div className="card-grid card-grid-3">
            {footerSections.map((section) => (
              <article key={section.title} className="surface-card admin-nested-card">
                <h3>{section.title}</h3>
                <div className="stack-list">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} className="text-button">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
