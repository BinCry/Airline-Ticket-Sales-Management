type QueryParamValue = string | string[] | undefined;

export const BACKOFFICE_SALES_FLOW_QUERY_KEY = "backofficeSales";
const BACKOFFICE_SALES_FLOW_ENABLED_VALUE = "1";

function readFirstQueryValue(value: QueryParamValue): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return typeof value === "string" ? value : null;
}

export function isBackofficeSalesFlowValue(value: string | null | undefined): boolean {
  return value === BACKOFFICE_SALES_FLOW_ENABLED_VALUE;
}

export function hasBackofficeSalesFlow(searchParams: Record<string, QueryParamValue>): boolean {
  return isBackofficeSalesFlowValue(readFirstQueryValue(searchParams[BACKOFFICE_SALES_FLOW_QUERY_KEY]));
}

export function appendBackofficeSalesFlow(url: string): string {
  const [urlWithoutHash, hashFragment] = url.split("#", 2);
  const [pathname, queryString] = urlWithoutHash.split("?", 2);
  const params = new URLSearchParams(queryString ?? "");

  params.set(BACKOFFICE_SALES_FLOW_QUERY_KEY, BACKOFFICE_SALES_FLOW_ENABLED_VALUE);

  const nextHash = hashFragment ? `#${hashFragment}` : "";
  return `${pathname}?${params.toString()}${nextHash}`;
}

export function createBackofficeSalesSearchHref(): string {
  return appendBackofficeSalesFlow("/search#dat-ve");
}

export function createBackofficeSalesLookupHref(bookingCode: string, email: string): string {
  const params = new URLSearchParams({
    bookingCode: bookingCode.trim().toUpperCase(),
    email: email.trim().toLowerCase()
  });

  return `/backoffice/sales?${params.toString()}`;
}
