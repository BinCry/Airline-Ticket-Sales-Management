"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  AUTH_SESSION_UPDATED_EVENT,
  loadValidAuthSession
} from "@/lib/auth-session";
import {
  getAllowedBackofficeModulesByPermissions,
  type BackofficeModuleKey
} from "@/lib/access-control";
import { backofficeModules } from "@/lib/backoffice-content";

const hiddenModuleKeys = new Set<BackofficeModuleKey>(["cms"]);

export function BackofficeModuleNav() {
  const pathname = usePathname();
  const [allowedModules, setAllowedModules] = useState<BackofficeModuleKey[] | null>(null);

  useEffect(() => {
    function syncPermissions() {
      const permissions = loadValidAuthSession()?.user.permissions ?? [];
      setAllowedModules(getAllowedBackofficeModulesByPermissions(permissions));
    }

    syncPermissions();
    window.addEventListener("storage", syncPermissions);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncPermissions);

    return () => {
      window.removeEventListener("storage", syncPermissions);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncPermissions);
    };
  }, []);

  const visibleModules = useMemo(
    () =>
      allowedModules === null
        ? []
        :
      backofficeModules.filter(
        (module) => allowedModules.includes(module.key) && !hiddenModuleKeys.has(module.key)
      ),
    [allowedModules]
  );

  if (allowedModules === null) {
    return <div className="backoffice-module-nav backoffice-module-nav-loading" aria-hidden="true" />;
  }

  if (visibleModules.length === 0) {
    return null;
  }

  return (
    <nav className="backoffice-module-nav" aria-label="Điều hướng phân hệ backoffice">
      <Link href="/backoffice" className="backoffice-module-nav-home" prefetch={false}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m12.5 5-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tổng quan
      </Link>
      <div className="backoffice-module-nav-links">
        {visibleModules.map((module) => {
          const active = pathname === module.href;

          return (
            <Link
              key={module.key}
              href={module.href}
              className={active ? "backoffice-module-nav-link active" : "backoffice-module-nav-link"}
              aria-current={active ? "page" : undefined}
              prefetch={false}
            >
              {module.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
