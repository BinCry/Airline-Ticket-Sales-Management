"use client";

import { useEffect, useMemo, useState } from "react";

import type { FaqEntry } from "@/lib/public-content";
import {
  findMatchingFaqs,
  getFaqQueryTokens,
  normalizeSupportText
} from "@/lib/support-faq-utils";

interface SupportFaqSearchProps {
  categories: string[];
  faqs: FaqEntry[];
}

function getFaqId(faq: FaqEntry) {
  return `faq-${normalizeSupportText(faq.question).replace(/\s+/g, "-").slice(0, 64)}`;
}

export function SupportFaqSearch({ categories, faqs }: SupportFaqSearchProps) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "Tất cả");
  const [query, setQuery] = useState("");
  const [openQuestion, setOpenQuestion] = useState<string | null>(faqs[0]?.question ?? null);

  const filteredFaqs = useMemo(() => {
    const categoryFaqs = faqs.filter((faq) => {
      return selectedCategory === "Tất cả" || faq.category === selectedCategory;
    });

    if (getFaqQueryTokens(query).length === 0) {
      return categoryFaqs;
    }

    return findMatchingFaqs(categoryFaqs, query).map((result) => result.faq);
  }, [faqs, query, selectedCategory]);

  useEffect(() => {
    setOpenQuestion((currentQuestion) => {
      if (filteredFaqs.some((faq) => faq.question === currentQuestion)) {
        return currentQuestion;
      }

      return filteredFaqs[0]?.question ?? null;
    });
  }, [filteredFaqs]);

  return (
    <div className="support-faq-search">
      <div className="support-faq-toolbar">
        <label className="field support-faq-search-field">
          <span>Tìm câu hỏi</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập OTP, hoàn vé, hành lý, email vé..."
            type="search"
          />
          <small className="support-faq-result-text">
            Tìm thấy {filteredFaqs.length} kết quả phù hợp
          </small>
        </label>
      </div>

      <div className="support-faq-category-list" aria-label="Lọc câu hỏi thường gặp">
        {categories.map((category) => (
          <button
            key={category}
            className={`filter-chip-button ${selectedCategory === category ? "active" : ""}`}
            type="button"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="stack-list">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => {
            const isOpen = openQuestion === faq.question;
            const faqId = getFaqId(faq);

            return (
              <article key={faq.question} className="surface-card support-faq-card">
                <button
                  className="support-faq-toggle"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${faqId}-answer`}
                  onClick={() => setOpenQuestion(isOpen ? null : faq.question)}
                >
                  <span className="support-faq-title-wrap">
                    <h3>
                      <span className="support-faq-inline-tag">{faq.category}</span>
                      {faq.question}
                    </h3>
                  </span>
                  <span className="support-faq-toggle-icon" aria-hidden="true" />
                </button>
                {isOpen ? (
                  <p id={`${faqId}-answer`}>{faq.answer}</p>
                ) : null}
              </article>
            );
          })
        ) : (
          <article className="surface-card support-faq-card">
            <span className="pill">Không có kết quả</span>
            <h3>Chưa tìm thấy câu hỏi phù hợp</h3>
            <p>
              Hãy thử từ khóa khác như OTP, thanh toán, hoàn vé, hành lý, voucher
              hoặc liên hệ tổng đài để được hỗ trợ trực tiếp.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
