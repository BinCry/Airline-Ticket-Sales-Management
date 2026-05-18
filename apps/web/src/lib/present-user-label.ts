function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/giu, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const SEEDED_DISPLAY_NAMES: Record<string, string> = {
  "khach hang kiem thu": "Khách hàng",
  "hoi vien kiem thu": "Hội viên",
  "nhan su ho tro kiem thu": "Nhân viên chăm sóc khách hàng",
  "nhan su van hanh kiem thu": "Nhân viên vận hành"
};

export function presentUserDisplayName(displayName: string) {
  const normalizedDisplayName = displayName.trim();
  const normalizedLookupKey = normalizeLookupKey(normalizedDisplayName);
  const mappedDisplayName = SEEDED_DISPLAY_NAMES[normalizedLookupKey];

  if (mappedDisplayName) {
    return mappedDisplayName;
  }

  if (normalizedLookupKey.endsWith(" kiem thu")) {
    const words = normalizedDisplayName.split(/\s+/);
    return words.length > 2 ? words.slice(0, -2).join(" ").trim() : normalizedDisplayName;
  }

  return normalizedDisplayName;
}

export function isLegacySeedEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@qlvmb.local");
}
