import { normalizeVoucherConditionInfo, type VoucherConditionInfo } from "@/lib/voucher-conditions";
import styles from "@/components/voucher-conditions.module.css";

export function VoucherConditionSummary({ voucher }: { voucher: VoucherConditionInfo }) {
  const info = normalizeVoucherConditionInfo(voucher);
  return <div className={styles.summary} role={info.conditionsValid ? undefined : "status"}>
    <strong>{info.conditionsValid ? "Điều kiện áp dụng" : "Cần kiểm tra cấu hình"}</strong>
    <p>{info.conditionSummary}</p>
  </div>;
}
