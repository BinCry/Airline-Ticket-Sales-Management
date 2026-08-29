"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteFocusManager() {
  const pathname = usePathname();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    if (initialPathname.current === pathname) {
      return;
    }

    initialPathname.current = pathname;
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  return null;
}
