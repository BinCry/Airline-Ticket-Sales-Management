"use client";

import { useEffect } from "react";
import { AUTH_SESSION_UPDATED_EVENT, loadValidAuthSession } from "@/lib/auth-session";
import { getApiBaseUrl } from "@/lib/api-client";
import { pushToast } from "@/lib/toast";

export const FLIGHT_NOTIFICATION_EVENT = "airline-flight-notification";

/** Streaming fetch supports Authorization; native EventSource cannot set bearer headers. */
export function RealtimeNotificationKeeper() {
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;

    function clearRetry() {
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    }

    async function connect(activeGeneration: number) {
      if (disposed || activeGeneration !== generation) return;

      const session = loadValidAuthSession();
      if (!session?.accessToken) return;

      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "text/event-stream",
          },
          signal: requestController.signal,
          cache: "no-store",
        });

        // Do not retry a rejected or expired login session indefinitely.
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok || !response.body) throw new Error("SSE not available");
        if (disposed || activeGeneration !== generation || requestController.signal.aborted) return;

        // On reconnect, catch up from the authoritative notification outbox.
        window.dispatchEvent(new Event(FLIGHT_NOTIFICATION_EVENT));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!disposed && activeGeneration === generation && !requestController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            if (!event.split("\n").some((line) => line.trim() === "event: notification")) continue;
            if (disposed || activeGeneration !== generation || requestController.signal.aborted) break;

            window.dispatchEvent(new Event(FLIGHT_NOTIFICATION_EVENT));
            pushToast({
              title: "Thông báo mới",
              message: "Có thông báo mới trong tài khoản của bạn.",
              tone: "info",
            });
          }
        }
      } catch {
        // A superseded/aborted request must not schedule a retry.
        if (requestController.signal.aborted) return;
      } finally {
        if (controller === requestController) controller = null;
      }

      if (!disposed && activeGeneration === generation && !requestController.signal.aborted) {
        clearRetry();
        retryTimer = setTimeout(() => {
          retryTimer = undefined;
          void connect(activeGeneration);
        }, 3000);
      }
    }

    function restart() {
      generation += 1;
      controller?.abort();
      controller = null;
      clearRetry();
      if (!disposed) void connect(generation);
    }

    restart();
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, restart);
    window.addEventListener("storage", restart);

    return () => {
      disposed = true;
      generation += 1;
      controller?.abort();
      clearRetry();
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, restart);
      window.removeEventListener("storage", restart);
    };
  }, []);

  return null;
}
