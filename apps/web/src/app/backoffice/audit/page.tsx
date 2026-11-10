import { BackofficeAuditPageClient } from "@/components/backoffice-audit-page-client";
import { BackofficeModuleShell } from "@/components/backoffice-module-shell";
import "@/styles/audit-log.css";

export default function BackofficeAuditPage() {
  return <BackofficeModuleShell><BackofficeAuditPageClient /></BackofficeModuleShell>;
}
