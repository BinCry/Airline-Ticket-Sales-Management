import type { ReactNode } from "react";

import { BackofficeModuleNav } from "@/components/backoffice-module-nav";

type BackofficeModuleShellProps = {
  children: ReactNode;
  navigation?: ReactNode;
};

export function BackofficeModuleShell({
  children,
  navigation = <BackofficeModuleNav />
}: BackofficeModuleShellProps) {
  return (
    <div className="backoffice-module-shell">
      <div className="container backoffice-module-shell-nav">
        {navigation}
      </div>
      {children}
    </div>
  );
}
