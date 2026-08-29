import type { ReactNode } from "react";

import { BackofficeModuleNav } from "@/components/backoffice-module-nav";

type BackofficeModuleShellProps = {
  children: ReactNode;
};

export function BackofficeModuleShell({ children }: BackofficeModuleShellProps) {
  return (
    <div className="backoffice-module-shell">
      <div className="container backoffice-module-shell-nav">
        <BackofficeModuleNav />
      </div>
      {children}
    </div>
  );
}
