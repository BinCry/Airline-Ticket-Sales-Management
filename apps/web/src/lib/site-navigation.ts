import { mainNavigation, type SiteLink } from "@/lib/public-content";

const STAFF_ROLE_CODES = new Set(["customer_support", "operations_staff"]);
const BACKOFFICE_PERMISSION_PREFIX = "backoffice.";

function hasBackofficeAccess(permissionsOrRoles: string[]) {
  return permissionsOrRoles.some((value) => {
    const normalizedValue = value.trim().toLowerCase();
    return (
      STAFF_ROLE_CODES.has(normalizedValue) ||
      normalizedValue.startsWith(BACKOFFICE_PERMISSION_PREFIX)
    );
  });
}

export function buildMainNavigation(permissionsOrRoles: string[]): SiteLink[] {
  const normalizedNavigation = mainNavigation.filter(
    (item) => item.href !== "/backoffice"
  );

  if (!hasBackofficeAccess(permissionsOrRoles)) {
    return normalizedNavigation;
  }

  return [...normalizedNavigation, { href: "/backoffice", label: "Backoffice" }];
}
