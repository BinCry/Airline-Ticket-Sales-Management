"use client";

import { useEffect, useState } from "react";

import { StatusChip } from "@/components/status-chip";
import {
  AUTH_SESSION_UPDATED_EVENT,
  loadActiveAuthSession
} from "@/lib/auth-session";
import type { BackofficeModuleKey } from "@/lib/access-control";
import { canAccessBackofficeModule } from "@/lib/access-control";

type BackofficeAccessChipProps = {
  moduleKey: BackofficeModuleKey;
};

export function BackofficeAccessChip({ moduleKey }: BackofficeAccessChipProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    function sync() {
      const authSession = loadActiveAuthSession();
      const permissions = authSession?.user.permissions ?? [];
      setHasAccess(authSession ? canAccessBackofficeModule(permissions, moduleKey) : false);
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, sync);
    };
  }, [moduleKey]);

  if (hasAccess === null) {
    return <StatusChip tone="neutral" label="Đang kiểm tra" />;
  }

  return hasAccess ? (
    <StatusChip tone="success" label="Có quyền" />
  ) : (
    <StatusChip tone="warning" label="Không có quyền" />
  );
}
