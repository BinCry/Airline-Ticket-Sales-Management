import { readFile } from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isAllowedNewsImageUrl,
  NEWS_IMAGE_FALLBACK_PATH
} from "@/lib/news-images";

const NEWS_IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
const fallbackImageRelativePath = NEWS_IMAGE_FALLBACK_PATH.replace(/^\/+/, "");
const fallbackImagePathCandidates = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "public", fallbackImageRelativePath),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "apps", "web", "public", fallbackImageRelativePath)
];

let fallbackImageBufferPromise: Promise<Buffer> | null = null;

async function readFallbackImageBuffer() {
  if (!fallbackImageBufferPromise) {
    fallbackImageBufferPromise = (async () => {
      for (const fallbackImagePath of fallbackImagePathCandidates) {
        try {
          return await readFile(fallbackImagePath);
        } catch {
          continue;
        }
      }

      throw new Error("Không tìm thấy ảnh dự phòng cho bài báo.");
    })();
  }

  return fallbackImageBufferPromise;
}

async function buildFallbackResponse() {
  const fallbackImageBuffer = await readFallbackImageBuffer();

  return new NextResponse(fallbackImageBuffer, {
    status: 200,
    headers: {
      "Cache-Control": DEFAULT_CACHE_CONTROL,
      "Content-Type": "image/jpeg"
    }
  });
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("src")?.trim();

  if (!sourceUrl || !isAllowedNewsImageUrl(sourceUrl)) {
    return buildFallbackResponse();
  }

  try {
    const upstreamResponse = await fetch(sourceUrl, {
      cache: "force-cache",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; QLVMBNewsImageProxy/1.0; +https://airplane.id.vn)"
      },
      next: {
        revalidate: NEWS_IMAGE_REVALIDATE_SECONDS
      },
      referrerPolicy: "no-referrer"
    });

    if (!upstreamResponse.ok) {
      return buildFallbackResponse();
    }

    const contentType = upstreamResponse.headers.get("content-type")?.trim() ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return buildFallbackResponse();
    }

    const imageBuffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Cache-Control":
          upstreamResponse.headers.get("cache-control")?.trim() || DEFAULT_CACHE_CONTROL,
        "Content-Type": contentType
      }
    });
  } catch {
    return buildFallbackResponse();
  }
}
