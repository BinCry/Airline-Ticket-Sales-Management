import { mainNavigation, type SiteLink } from "@/lib/public-content";

const STAFF_ROLE_CODES = new Set(["customer_support", "operations_staff"]);
const BACKOFFICE_PERMISSION_PREFIX = "backoffice.";
const DAT_VE_NAV_HREF = "/booking";

function hasBackofficeAccess(permissionsOrRoles: string[]) {
  return permissionsOrRoles.some((value) => {
    const normalizedValue = value.trim().toLowerCase();
    return (
      STAFF_ROLE_CODES.has(normalizedValue) ||
      normalizedValue.startsWith(BACKOFFICE_PERMISSION_PREFIX)
    );
  });
}

function normalizeNavigationPath(href: string) {
  const [pathWithoutHash] = href.split("#");
  const [pathWithoutQuery] = pathWithoutHash.split("?");
  return pathWithoutQuery || "/";
}

function isBookingFlowPath(pathname: string) {
  return pathname === "/booking" || pathname.startsWith("/booking/");
}

export function isMainNavigationLinkActive(pathname: string, link: SiteLink) {
  const normalizedPathname = pathname || "/";
  const normalizedLinkPath = normalizeNavigationPath(link.href);
  const isDatVeLink = link.href === DAT_VE_NAV_HREF;

  if (isBookingFlowPath(normalizedPathname)) {
    return isDatVeLink;
  }

  if (isDatVeLink) {
    return false;
  }

  if (normalizedLinkPath === "/") {
    return normalizedPathname === "/";
  }

  return (
    normalizedPathname === normalizedLinkPath ||
    normalizedPathname.startsWith(`${normalizedLinkPath}/`)
  );
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
