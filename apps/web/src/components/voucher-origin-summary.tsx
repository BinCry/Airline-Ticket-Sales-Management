"use client";

import { useEffect, useState } from "react";
import { getVoucherSource, voucherExpiryMillis, type VoucherPresentation } from "@/lib/voucher-presentation";

export function VoucherOriginSummary({ voucher, showDescription = true }: {
  voucher: { source?: string | null; description: string }; showDescription?: boolean;
}) {
  const birthday = getVoucherSource(voucher.source) === "BIRTHDAY";
  const description = voucher.description.trim();
  const explainsOrigin = description.includes("ngày sinh") &&
    description.includes("hồ sơ hành khách chính") && description.includes("tự khai");
  const explainsVerification = description.includes("chưa") && description.includes("xác minh");
  return <>
    {birthday ? <span className="pill">Quà sinh nhật</span> : null}
    {showDescription && description ? <p>{description}{birthday && explainsOrigin && !explainsVerification
      ? " Thông tin ngày sinh chưa được hệ thống xác minh." : ""}</p> : null}
    {birthday && (!showDescription || !explainsOrigin) ? <p>
      Quà dựa trên ngày sinh tự khai của hồ sơ hành khách chính tại thời điểm xét cấp, chưa phải thông tin đã xác minh.
    </p> : null}
  </>;
}

export function useVoucherPresentationTime(vouchers: readonly VoucherPresentation[]): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const now = Date.now();
    let next = Infinity;
    for (const voucher of vouchers) {
      const expiry = voucherExpiryMillis(voucher.expiresAt);
      if (voucher.status === "AVAILABLE" && expiry !== null && expiry > now) next = Math.min(next, expiry);
    }
    const timer = Number.isFinite(next)
      ? window.setTimeout(refresh, Math.max(1, Math.min(next - now, 2_147_483_647))) : undefined;
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [vouchers, revision]);
  return Date.now();
}
