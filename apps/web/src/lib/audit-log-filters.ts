export interface AuditLogFilters {
  actorId: string;
  actorKeyword: string;
  actionPrefix: string;
  action: string;
  targetType: string;
  targetId: string;
  from: string;
  to: string;
  keyword: string;
  includeHidden: boolean;
}

const TEXT_LIMITS = {
  actorKeyword: [160, "Email hoặc tên người thao tác"],
  actionPrefix: [120, "Nhóm hành động"],
  action: [120, "Hành động"],
  targetType: [80, "Loại đối tượng"],
  targetId: [120, "Mã đối tượng"],
  keyword: [1000, "Từ khóa"]
} as const;

function dateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date : null;
}

export function createDefaultAuditLogFilters(now = new Date()): AuditLogFilters {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  const to = `${part("year")}-${part("month")}-${part("day")}`;
  const fromDate = dateValue(to)!;
  fromDate.setUTCDate(fromDate.getUTCDate() - 6);
  return {
    actorId: "", actorKeyword: "", actionPrefix: "", action: "", targetType: "",
    targetId: "", keyword: "", includeHidden: false, from: fromDate.toISOString().slice(0, 10), to
  };
}

export function normalizeAuditLogFilters(filters: AuditLogFilters): AuditLogFilters {
  return Object.fromEntries(Object.entries(filters).map(([key, value]) =>
    [key, typeof value === "string" ? value.trim() : value]
  )) as unknown as AuditLogFilters;
}

export function validateAuditLogFilters(filters: AuditLogFilters, exporting = false): string | null {
  const normalized = normalizeAuditLogFilters(filters);
  if (normalized.actorId && normalized.actorId !== "none") {
    if (!/^\d{1,19}$/.test(normalized.actorId) || BigInt(normalized.actorId) < 1n
      || BigInt(normalized.actorId) > 9223372036854775807n) {
      return "Người thao tác phải là ID dương hoặc giá trị none.";
    }
  }
  for (const [key, [limit, label]] of Object.entries(TEXT_LIMITS)) {
    if ([...normalized[key as keyof typeof TEXT_LIMITS]].length > limit) {
      return `${label} không được vượt quá ${limit} ký tự.`;
    }
  }
  if ((normalized.from && !dateValue(normalized.from)) || (normalized.to && !dateValue(normalized.to))) {
    return "Ngày phải hợp lệ và có định dạng yyyy-MM-dd.";
  }
  if (normalized.from && normalized.to && normalized.from > normalized.to) {
    return "Từ ngày không được lớn hơn đến ngày.";
  }
  if (exporting) {
    if (!normalized.from || !normalized.to) return "Xuất CSV bắt buộc có từ ngày và đến ngày.";
    const days = (dateValue(normalized.to)!.getTime() - dateValue(normalized.from)!.getTime()) / 86400000 + 1;
    if (days > 90) return "Mỗi lần xuất CSV tối đa 90 ngày, tính cả ngày đầu và ngày cuối.";
  }
  return null;
}

export function buildAuditLogSearchParams(filters: AuditLogFilters, pagination?: { page: number; size: number }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeAuditLogFilters(filters))) {
    if (typeof value === "string" && value) params.set(key, value);
    if (key === "includeHidden" && value === true) params.set(key, "true");
  }
  if (pagination) {
    params.set("page", String(pagination.page));
    params.set("size", String(pagination.size));
  }
  return params;
}

export function getAuditActionGroups(actions: string[]) {
  return [...new Set(actions.filter((action) => action.indexOf(".") > 0)
    .map((action) => action.slice(0, action.indexOf("."))))].sort();
}

export function getAuditActionsInGroup(actions: string[], group: string) {
  const prefix = group.endsWith(".") ? group : `${group}.`;
  return actions.filter((action) => !group || action.startsWith(prefix));
}
