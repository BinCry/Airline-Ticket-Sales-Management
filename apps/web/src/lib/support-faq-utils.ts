import type { FaqEntry } from "@/lib/public-content";

export interface FaqSearchResult {
  faq: FaqEntry;
  matchedTokens: string[];
  score: number;
}

const SEARCH_STOP_WORDS = new Set([
  "a",
  "anh",
  "ban",
  "bay",
  "bi",
  "cach",
  "can",
  "cap",
  "chuyen",
  "cua",
  "duoc",
  "em",
  "gi",
  "hay",
  "hoi",
  "khach",
  "khong",
  "kiem",
  "la",
  "lam",
  "minh",
  "muon",
  "nao",
  "neu",
  "sao",
  "thai",
  "thi",
  "toi",
  "tra",
  "trang",
  "trong",
  "va",
  "ve",
  "voi"
]);

export function normalizeSupportText(value: string | null | undefined) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi-VN");

  return expandCommonShortcuts(normalized);
}

export function tokenizeSupportText(value: string) {
  return normalizeSupportText(value)
    .split(/[\s-]+/)
    .filter(Boolean);
}

export function getFaqQueryTokens(query: string) {
  return tokenizeSupportText(query).filter((token) => {
    return token.length >= 2 && !SEARCH_STOP_WORDS.has(token);
  });
}

export function isCloseSupportToken(keywordToken: string, textToken: string) {
  if (keywordToken === textToken) {
    return true;
  }

  const allowedDistance = getAllowedTokenDistance(keywordToken);

  if (allowedDistance === 0 || textToken.length < 4) {
    return false;
  }

  if (hasSingleAdjacentTransposition(keywordToken, textToken)) {
    return true;
  }

  return getEditDistanceWithinLimit(keywordToken, textToken, allowedDistance) <= allowedDistance;
}

export function getFaqSearchText(faq: FaqEntry) {
  return [faq.category, faq.question, faq.answer, ...faq.keywords].join(" ");
}

export function findMatchingFaqs(faqs: FaqEntry[], query: string, limit = faqs.length) {
  const normalizedQuery = normalizeSupportText(query);
  const queryTokens = getFaqQueryTokens(query);

  if (!normalizedQuery || queryTokens.length === 0) {
    return faqs.slice(0, limit).map((faq) => ({
      faq,
      matchedTokens: [],
      score: 0
    }));
  }

  return faqs
    .map((faq) => scoreFaq(faq, normalizedQuery, queryTokens))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function scoreFaq(faq: FaqEntry, normalizedQuery: string, queryTokens: string[]) {
  const normalizedQuestion = normalizeSupportText(faq.question);
  const normalizedAnswer = normalizeSupportText(faq.answer);
  const normalizedCategory = normalizeSupportText(faq.category);
  const normalizedKeywords = faq.keywords.map((keyword) => normalizeSupportText(keyword));
  const searchableTokens = tokenizeSupportText(getFaqSearchText(faq));
  const matchedTokens = queryTokens.filter((queryToken) => {
    return searchableTokens.some((searchToken) => isCloseSupportToken(queryToken, searchToken));
  });
  const matchedSignificantTokens = matchedTokens.filter((token) => token.length >= 4);

  if (matchedTokens.length === 0) {
    return { faq, matchedTokens, score: 0 };
  }

  let score = matchedTokens.reduce((total, token) => {
    return total + (token.length >= 4 ? 2 : 1);
  }, 0);

  if (normalizedQuestion.includes(normalizedQuery)) {
    score += 12;
  }

  if (normalizedAnswer.includes(normalizedQuery)) {
    score += 6;
  }

  if (normalizedCategory.includes(normalizedQuery)) {
    score += 4;
  }

  if (normalizedKeywords.some((keyword) => keyword.includes(normalizedQuery))) {
    score += 5;
  }

  if (matchedTokens.length >= Math.max(1, Math.ceil(queryTokens.length * 0.6))) {
    score += 4;
  }

  if (matchedSignificantTokens.length >= 2) {
    score += 3;
  }

  return { faq, matchedTokens, score };
}

function expandCommonShortcuts(value: string) {
  return value
    .replace(/\b(k|ko|khg|khongg)\b/g, "khong")
    .replace(/\bdc\b/g, "duoc")
    .replace(/\bmk\b/g, "mat khau")
    .replace(/\btk\b/g, "tai khoan")
    .replace(/\btt\b/g, "thanh toan")
    .replace(/\bhd\b/g, "hoa don");
}

function getAllowedTokenDistance(token: string) {
  if (token.length >= 7) {
    return 2;
  }

  if (token.length >= 4) {
    return 1;
  }

  return 0;
}

function hasSingleAdjacentTransposition(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length - 1; index++) {
    if (
      left[index] !== right[index] &&
      left[index] === right[index + 1] &&
      left[index + 1] === right[index]
    ) {
      return (
        left.slice(0, index) === right.slice(0, index) &&
        left.slice(index + 2) === right.slice(index + 2)
      );
    }
  }

  return false;
}

function getEditDistanceWithinLimit(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) {
    return limit + 1;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );

      current[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > limit) {
      return limit + 1;
    }

    for (let index = 0; index < current.length; index++) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}
