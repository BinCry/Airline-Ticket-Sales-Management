import type { UserRole } from "@qlvmb/shared-types";

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: "Khách vãng lai",
  customer: "Khách hàng",
  member: "Hội viên",
  customer_support: "Nhân viên chăm sóc khách hàng",
  operations_staff: "Nhân viên vận hành"
};

export const BACKOFFICE_PERMISSION_BY_MODULE = {
  sales: "backoffice.sales",
  support: "backoffice.support",
  operations: "backoffice.operations",
  finance: "backoffice.finance",
  cms: "backoffice.cms",
  admin: "backoffice.admin"
} as const;

export type BackofficeModuleKey = keyof typeof BACKOFFICE_PERMISSION_BY_MODULE;

export function canAccessBackofficeModule(
  permissions: string[],
  moduleKey: BackofficeModuleKey
): boolean {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  const requiredPermission = BACKOFFICE_PERMISSION_BY_MODULE[moduleKey];
  return permissions.includes(requiredPermission);
}

export function canAccessBackofficeModuleByPermissions(
  permissions: string[],
  moduleKey: BackofficeModuleKey
): boolean {
  return canAccessBackofficeModule(permissions, moduleKey);
}

export function getAllowedBackofficeModulesByPermissions(
  permissions: string[]
): BackofficeModuleKey[] {
  return (Object.keys(BACKOFFICE_PERMISSION_BY_MODULE) as BackofficeModuleKey[]).filter(
    (moduleKey) => canAccessBackofficeModule(permissions, moduleKey)
  );
}
