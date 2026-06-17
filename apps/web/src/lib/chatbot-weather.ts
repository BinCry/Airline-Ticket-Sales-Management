import { getOpenWeatherApiKey } from "@/lib/server-env";
import { formatDateTime } from "@/lib/format";

interface OpenWeatherResponse {
  dt?: number;
  main?: {
    feels_like?: number;
    humidity?: number;
    temp?: number;
  };
  message?: string;
  name?: string;
  weather?: Array<{
    description?: string;
  }>;
  wind?: {
    speed?: number;
  };
}

interface WeatherLocation {
  aliases: string[];
  city: string;
  query: string;
}

export interface WeatherSnapshot {
  city: string;
  description: string;
  feelsLikeC: number;
  humidity: number;
  observedAt: string;
  temperatureC: number;
  windSpeed: number;
}

const WEATHER_TIMEOUT_MS = 8000;

const weatherKeywords = [
  "thời tiết",
  "thoi tiet",
  "dự báo thời tiết",
  "du bao thoi tiet",
  "nhiệt độ",
  "nhiet do",
  "gió",
  "gio",
  "độ ẩm",
  "do am"
];

const weatherLocations: WeatherLocation[] = [
  {
    aliases: ["hà nội", "ha noi", "hanoi", "nội bài", "noi bai"],
    city: "Hà Nội",
    query: "Ha Noi,VN"
  },
  {
    aliases: ["đà nẵng", "da nang", "danang"],
    city: "Đà Nẵng",
    query: "Da Nang,VN"
  },
  {
    aliases: [
      "thành phố hồ chí minh",
      "thanh pho ho chi minh",
      "hồ chí minh",
      "ho chi minh",
      "ho chi minh city",
      "tp hồ chí minh",
      "tp hcm",
      "tp.hcm",
      "tphcm",
      "sài gòn",
      "sai gon",
      "saigon",
      "tân sơn nhất",
      "tan son nhat"
    ],
    city: "Thành phố Hồ Chí Minh",
    query: "Ho Chi Minh City,VN"
  },
  {
    aliases: ["phú quốc", "phu quoc"],
    city: "Phú Quốc",
    query: "Phu Quoc,VN"
  }
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLocaleLowerCase("vi-VN");
}

function buildSearchTexts(value: string | null | undefined) {
  const lowered = (value ?? "").toLocaleLowerCase("vi-VN").trim();
  const normalized = normalizeText(value);

  return Array.from(new Set([lowered, normalized].filter(Boolean)));
}

function formatObservedAt(unixTimeSeconds: number | undefined) {
  if (!unixTimeSeconds || !Number.isFinite(unixTimeSeconds)) {
    return "";
  }

  return formatDateTime(new Date(unixTimeSeconds * 1000));
}

function buildWeatherEndpoint(query: string, apiKey: string) {
  return (
    "https://api.openweathermap.org/data/2.5/weather" +
    `?q=${encodeURIComponent(query)}` +
    `&appid=${encodeURIComponent(apiKey)}` +
    "&units=metric&lang=vi"
  );
}

function roundWeatherValue(value: number) {
  return Math.round(value * 10) / 10;
}

function cleanLocationCandidate(value: string) {
  return value
    .replace(/^[\s,:-]+|[\s?!.,;:]+$/g, "")
    .replace(
      /\b(hôm nay|hom nay|ngày mai|ngay mai|bây giờ|bay gio|hiện tại|hien tai|thế nào|the nao|ra sao|bao nhiêu|bao nhieu)\b/giu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildFreeformLocationQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFreeformWeatherLocation(question: string) {
  if (!isWeatherQuestion(question)) {
    return null;
  }

  const normalizedQuestion = normalizeText(question);
  const patterns = [
    /(?:thời tiết|thoi tiet|nhiệt độ|nhiet do|độ ẩm|do am|gió|gio)\s+(?:ở\s+)?(.+?)(?:\s+hôm nay|\s+hom nay|\s+ngày mai|\s+ngay mai|\s+bây giờ|\s+bay gio|\s+hiện tại|\s+hien tai|\s+thế nào|\s+the nao|\s+ra sao|\s+bao nhiêu|\s+bao nhieu|\?|$)/iu,
    /(?:ở|tai)\s+(.+?)(?:\s+hôm nay|\s+hom nay|\s+ngày mai|\s+ngay mai|\s+bây giờ|\s+bay gio|\s+hiện tại|\s+hien tai|\s+thế nào|\s+the nao|\s+ra sao|\s+bao nhiêu|\s+bao nhieu|\?|$)/iu
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    const candidate = cleanLocationCandidate(match?.[1] ?? "");

    if (candidate) {
      return {
        aliases: [normalizeText(candidate)],
        city: candidate,
        query: buildFreeformLocationQuery(candidate)
      } satisfies WeatherLocation;
    }
  }

  const properNouns = Array.from(
    question.matchAll(
      /(?:\p{Lu}|Đ)[\p{L}đĐ.-]*(?:\s+(?:\p{Lu}|Đ)[\p{L}đĐ.-]*){0,3}/gu
    )
  )
    .map((match) => cleanLocationCandidate(match[0] ?? ""))
    .filter(Boolean);

  const candidate = properNouns.find((value) => {
    const normalizedValue = normalizeText(value);

    return !["thoi tiet", "nhiet do", "do am", "gio"].includes(normalizedValue);
  });

  if (!candidate) {
    return null;
  }

  if (!normalizedQuestion.includes(normalizeText(candidate))) {
    return null;
  }

  return {
    aliases: [normalizeText(candidate)],
    city: candidate,
    query: buildFreeformLocationQuery(candidate)
  } satisfies WeatherLocation;
}

export function detectWeatherLocation(question: string) {
  const searchTexts = buildSearchTexts(question);

  return (
    weatherLocations.find((location) =>
      location.aliases.some((alias) =>
        searchTexts.some((searchText) => searchText.includes(alias))
      )
    ) ??
    extractFreeformWeatherLocation(question) ??
    null
  );
}

export function isWeatherQuestion(question: string) {
  const searchTexts = buildSearchTexts(question);

  return weatherKeywords.some((keyword) =>
    searchTexts.some((searchText) => searchText.includes(keyword))
  );
}

export function formatWeatherSummary(snapshot: WeatherSnapshot) {
  const observedSuffix = snapshot.observedAt
    ? ` (cập nhật ${snapshot.observedAt})`
    : "";

  return (
    `Thời tiết hiện tại tại ${snapshot.city}: ${snapshot.description}, ` +
    `${snapshot.temperatureC}°C, cảm giác như ${snapshot.feelsLikeC}°C, ` +
    `độ ẩm ${snapshot.humidity}%, gió ${snapshot.windSpeed} m/s${observedSuffix}.`
  );
}

export function buildWeatherPromptContext(snapshot: WeatherSnapshot) {
  return (
    `Dữ liệu thời tiết hiện tại đã xác thực: ${snapshot.city} có ` +
    `${snapshot.description}, nhiệt độ ${snapshot.temperatureC}°C, ` +
    `cảm giác như ${snapshot.feelsLikeC}°C, độ ẩm ${snapshot.humidity}%, ` +
    `gió ${snapshot.windSpeed} m/s` +
    `${snapshot.observedAt ? `, cập nhật ${snapshot.observedAt}` : ""}.`
  );
}

export async function getWeatherSnapshot(question: string) {
  const location = detectWeatherLocation(question);
  const apiKey = getOpenWeatherApiKey();

  if (!location || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(buildWeatherEndpoint(location.query, apiKey), {
      method: "GET",
      signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS)
    });

    const data = (await response.json().catch(() => null)) as OpenWeatherResponse | null;

    if (!response.ok || !data) {
      console.error(
        `[chatbot-weather] Không lấy được thời tiết cho ${location.city}: ${response.status} ${data?.message ?? ""}`.trim()
      );
      return null;
    }

    const temperature = data.main?.temp;
    const feelsLike = data.main?.feels_like;

    if (typeof temperature !== "number" || typeof feelsLike !== "number") {
      return null;
    }

    return {
      city: data.name?.trim() || location.city,
      description: data.weather?.[0]?.description?.trim() || "không rõ",
      feelsLikeC: roundWeatherValue(feelsLike),
      humidity: data.main?.humidity ?? 0,
      observedAt: formatObservedAt(data.dt),
      temperatureC: roundWeatherValue(temperature),
      windSpeed: roundWeatherValue(data.wind?.speed ?? 0)
    } satisfies WeatherSnapshot;
  } catch (error) {
    console.error("[chatbot-weather] Lỗi khi gọi OpenWeather.", error);
    return null;
  }
}
