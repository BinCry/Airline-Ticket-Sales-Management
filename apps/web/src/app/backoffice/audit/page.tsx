import Link from "next/link";

import { BackofficeAuditPageClient } from "@/components/backoffice-audit-page-client";
import { BackofficeModuleShell } from "@/components/backoffice-module-shell";
import "@/styles/audit-log.css";

export default function BackofficeAuditPage() {
  return (
    <BackofficeModuleShell
      navigation={
        <Link href="/backoffice/admin#admin-audit-trail" prefetch={false} className="button button-secondary">
          Quay lại Quản trị hệ thống
        </Link>
      }
    >
      <BackofficeAuditPageClient />
    </BackofficeModuleShell>
  );
}
