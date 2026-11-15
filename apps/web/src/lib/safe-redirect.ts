// Kiểm tra đường dẫn chuyển hướng sau đăng nhập chỉ trỏ về trang nội bộ.
// Thay thế điều kiện cũ (chỉ chặn "//") vì trình duyệt coi "/\example.org" là "//example.org".
const INTERNAL_ORIGIN = "http://noi-bo.invalid";

export function layDuongDanNoiBoAnToan(value: string | null | undefined): string | null {
  const duongDan = value?.trim();

  if (!duongDan || !duongDan.startsWith("/")) {
    return null;
  }

  // Chặn dấu "\" và ký tự điều khiển vì trình duyệt có thể chuẩn hóa chúng thành "/".
  if (/[\\\u0000-\u001f\u007f]/.test(duongDan) || duongDan.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(duongDan, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolveSafeRedirectTarget(value: string | null | undefined, macDinh = "/"): string {
  return layDuongDanNoiBoAnToan(value) ?? macDinh;
}
