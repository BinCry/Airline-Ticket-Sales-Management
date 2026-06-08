import { notFound } from "next/navigation";

import { BackofficeAdminPageClient } from "@/components/backoffice-admin-page-client";
import { BackofficeCmsPageClient } from "@/components/backoffice-cms-page-client";
import { BackofficeFinancePageClient } from "@/components/backoffice-finance-page-client";
import { BackofficeOperationsPageClient } from "@/components/backoffice-operations-page-client";
import { BackofficeRevenuePageClient } from "@/components/backoffice-revenue-page-client";
import { BackofficeSalesPageClient } from "@/components/backoffice-sales-page-client";
import { BackofficeSupportPageClient } from "@/components/backoffice-support-page-client";
import { backofficeModules } from "@/lib/backoffice-content";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
};

export function generateStaticParams() {
  return backofficeModules.map((module) => ({ module: module.key }));
}

export default async function BackofficeModulePage({ params }: ModulePageProps) {
  const { module } = await params;

  if (!backofficeModules.some((item) => item.key === module)) {
    notFound();
  }

  switch (module) {
    case "sales":
      return <BackofficeSalesPageClient />;
    case "support":
      return <BackofficeSupportPageClient />;
    case "finance":
      return <BackofficeFinancePageClient />;
    case "operations":
      return <BackofficeOperationsPageClient />;
    case "revenue":
      return <BackofficeRevenuePageClient />;
    case "cms":
      return <BackofficeCmsPageClient />;
    case "admin":
      return <BackofficeAdminPageClient />;
    default:
      notFound();
  }
}
