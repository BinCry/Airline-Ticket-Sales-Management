"use client";

import { useEffect, useRef } from "react";

import { refreshStoredAuthSession } from "@/lib/api-client";
import {
  AUTH_SESSION_REFRESH_WINDOW_MS,
  loadStoredAuthSession,
  loadValidAuthSession,
  readAuthSessionExpirationTime,
  willAuthSessionExpireWithin
} from "@/lib/auth-session";

const AUTH_SESSION_MIN_DELAY_MS = 5_000;
const AUTH_SESSION_RETRY_DELAY_MS = 30_000;
const AUTH_SESSION_MAX_DELAY_MS = 24 * 60 * 60 * 1000;

export function AuthSessionKeeper() {
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let isDisposed = false;

    function clearRefreshTimer() {
      if (refreshTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    function scheduleNextRefresh(delayMs: number) {
      if (isDisposed) {
        return;
      }

      clearRefreshTimer();
      refreshTimeoutRef.current = window.setTimeout(() => {
        void maintainSession();
      }, Math.max(AUTH_SESSION_MIN_DELAY_MS, delayMs));
    }

    function scheduleByStoredSession() {
      const storedAuthSession = loadStoredAuthSession();

      if (!storedAuthSession) {
        clearRefreshTimer();
        return;
      }

      const expiresAt = readAuthSessionExpirationTime(storedAuthSession);

      if (expiresAt === null) {
        scheduleNextRefresh(AUTH_SESSION_RETRY_DELAY_MS);
        return;
      }

      const nextDelay =
        expiresAt - Date.now() - AUTH_SESSION_REFRESH_WINDOW_MS;

      if (nextDelay <= AUTH_SESSION_MIN_DELAY_MS) {
        scheduleNextRefresh(AUTH_SESSION_MIN_DELAY_MS);
        return;
      }

      scheduleNextRefresh(Math.min(nextDelay, AUTH_SESSION_MAX_DELAY_MS));
    }

    async function maintainSession(forceRefresh = false) {
      if (isDisposed) {
        return;
      }

      const storedAuthSession = loadStoredAuthSession();

      if (!storedAuthSession) {
        clearRefreshTimer();
        return;
      }

      const validAuthSession = loadValidAuthSession();
      const shouldRefresh =
        forceRefresh ||
        !validAuthSession ||
        willAuthSessionExpireWithin(
          storedAuthSession,
          AUTH_SESSION_REFRESH_WINDOW_MS
        );

      if (!shouldRefresh) {
        scheduleByStoredSession();
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        const refreshedAuthSession = await refreshStoredAuthSession();

        if (isDisposed) {
          return;
        }

        if (refreshedAuthSession) {
          scheduleByStoredSession();
          return;
        }
      } finally {
        isRefreshingRef.current = false;
      }

      if (loadStoredAuthSession()) {
        scheduleNextRefresh(AUTH_SESSION_RETRY_DELAY_MS);
        return;
      }

      clearRefreshTimer();
    }

    function handleFocus() {
      void maintainSession(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      void maintainSession(true);
    }

    function handleOnline() {
      void maintainSession(true);
    }

    void maintainSession();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      clearRefreshTimer();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
