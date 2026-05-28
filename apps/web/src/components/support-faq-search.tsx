"use client";

import { useEffect, useMemo, useState } from "react";

import type { FaqEntry } from "@/lib/public-content";
import {
  findMatchingFaqs,
  getFaqQueryTokens,
  isCloseSupportToken,
  normalizeSupportText,
  tokenizeSupportText
} from "@/lib/support-faq-utils";

interface SupportFaqSearchProps {
  categories: string[];
  faqs: FaqEntry[];
}

function getFaqId(faq: FaqEntry) {
  return `faq-${normalizeSupportText(faq.question).replace(/\s+/g, "-").slice(0, 64)}`;
}

function shouldHighlightPart(part: string, queryTokens: string[]) {
  if (queryTokens.length === 0 || !part.trim()) {
    return false;
  }

  const partTokens = tokenizeSupportText(part);

  return partTokens.some((partToken) =>
    queryTokens.some((queryToken) => isCloseSupportToken(queryToken, partToken))
  );
}

function renderHighlightedText(text: string, queryTokens: string[]) {
  if (queryTokens.length === 0) {
    return text;
  }

  return text.split(/(\s+)/).map((part, index) => {
    if (!shouldHighlightPart(part, queryTokens)) {
      return part;
    }

    return (
      <mark key={`${part}-${index}`} className="support-faq-highlight">
        {part}
      </mark>
    );
  });
}

export function SupportFaqSearch({ categories, faqs }: SupportFaqSearchProps) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "Tất cả");
  const [query, setQuery] = useState("");
  const [openQuestion, setOpenQuestion] = useState<string | null>(faqs[0]?.question ?? null);

  const popularFaqs = useMemo(() => {
    const markedPopularFaqs = faqs.filter((faq) => faq.isPopular);

    return (markedPopularFaqs.length > 0 ? markedPopularFaqs : faqs).slice(0, 5);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    const categoryFaqs = faqs.filter((faq) => {
      return selectedCategory === "Tất cả" || faq.category === selectedCategory;
    });

    if (getFaqQueryTokens(query).length === 0) {
      return categoryFaqs;
    }

    return findMatchingFaqs(categoryFaqs, query).map((result) => result.faq);
  }, [faqs, query, selectedCategory]);

  const queryTokens = useMemo(() => getFaqQueryTokens(query), [query]);

  useEffect(() => {
    setOpenQuestion((currentQuestion) => {
      if (filteredFaqs.some((faq) => faq.question === currentQuestion)) {
        return currentQuestion;
      }

      return filteredFaqs[0]?.question ?? null;
    });
  }, [filteredFaqs]);

  function choosePopularFaq(faq: FaqEntry) {
    setSelectedCategory(faq.category);
    setQuery(faq.question);
    setOpenQuestion(faq.question);
  }

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
        </label>
        <div className="support-faq-count">
          <span>Kết quả</span>
          <strong>{filteredFaqs.length}/{faqs.length}</strong>
        </div>
      </div>

      <div className="support-faq-suggestion-list" aria-label="Câu hỏi phổ biến">
        <span>Gợi ý phổ biến</span>
        {popularFaqs.map((faq) => (
          <button key={faq.question} type="button" onClick={() => choosePopularFaq(faq)}>
            {faq.question}
          </button>
        ))}
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
                    <span className="pill">{faq.category}</span>
                    <h3>{renderHighlightedText(faq.question, queryTokens)}</h3>
                  </span>
                  <span className="support-faq-toggle-icon" aria-hidden="true">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p id={`${faqId}-answer`}>
                    {renderHighlightedText(faq.answer, queryTokens)}
                  </p>
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
