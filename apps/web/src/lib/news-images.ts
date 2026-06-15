export const NEWS_IMAGE_FALLBACK_PATH = "/images/airport-terminal.jpg";

const allowedExactHosts = new Set([
  "cdnphoto.dantri.com.vn",
  "media.vietnamplus.vn"
]);

const allowedHostSuffixes = [
  "vnecdn.net",
  "tienphong.vn",
  "mediacdn.vn"
];

function hasAllowedNewsImageHost(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (!normalizedHostname) {
    return false;
  }

  if (allowedExactHosts.has(normalizedHostname)) {
    return true;
  }

  return allowedHostSuffixes.some((allowedSuffix) =>
    normalizedHostname === allowedSuffix ||
    normalizedHostname.endsWith(`.${allowedSuffix}`)
  );
}

export function isAllowedNewsImageUrl(value: string) {
  try {
    const imageUrl = new URL(value);

    if (imageUrl.protocol !== "https:") {
      return false;
    }

    return hasAllowedNewsImageHost(imageUrl.hostname);
  } catch {
    return false;
  }
}

export function buildNewsImageProxyUrl(sourceUrl: string) {
  return `/api/news-image?src=${encodeURIComponent(sourceUrl)}`;
}

export function rewriteNewsImageUrl(sourceUrl: string | null | undefined) {
  const normalizedSourceUrl = sourceUrl?.trim();

  if (!normalizedSourceUrl) {
    return NEWS_IMAGE_FALLBACK_PATH;
  }

  if (normalizedSourceUrl.startsWith("/")) {
    return normalizedSourceUrl;
  }

  if (!isAllowedNewsImageUrl(normalizedSourceUrl)) {
    return NEWS_IMAGE_FALLBACK_PATH;
  }

  return buildNewsImageProxyUrl(normalizedSourceUrl);
}
