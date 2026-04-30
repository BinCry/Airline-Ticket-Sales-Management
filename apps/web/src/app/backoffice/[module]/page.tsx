import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { ROLE_LABELS } from "@/lib/access-control";
import { backofficeModuleDetails, backofficeModules } from "@/lib/backoffice-content";

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
  const moduleConfig = backofficeModules.find((item) => item.key === module);
  const detail = backofficeModuleDetails[module as keyof typeof backofficeModuleDetails];

  if (!moduleConfig || !detail) {
    notFound();
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Phân hệ nội bộ"
          title={detail.title}
          description={detail.summary}
        />
        <div className="surface-card">
          <strong>Nhóm được cấp quyền:</strong>{" "}
          {moduleConfig.roles
            .map((role) => ROLE_LABELS[role as keyof typeof ROLE_LABELS])
            .join(", ")}
        </div>
        <div className="section-gap" />
        <div className="card-grid">
          {detail.panels.map((panel) => (
            <article key={panel.title} className="surface-card">
              <h3>{panel.title}</h3>
              <ul className="list-clean">
                {panel.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
