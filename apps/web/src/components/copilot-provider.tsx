"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { useEffect, useMemo, useState } from "react";

import {
  AUTH_SESSION_UPDATED_EVENT,
  loadActiveAuthSession,
  type AuthSession
} from "@/lib/auth-session";
import {
  buildCopilotRuntimeHeaders,
  COPILOT_RUNTIME_URL
} from "@/lib/copilot-booking";

interface CopilotProviderProps {
  children: React.ReactNode;
}

export function CopilotProvider({ children }: CopilotProviderProps) {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const syncAuthSession = () => {
      setAuthSession(loadActiveAuthSession());
    };

    syncAuthSession();
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthSession);
    };
  }, []);

  const headers = useMemo(
    () => buildCopilotRuntimeHeaders(authSession),
    [authSession]
  );

  return (
    <CopilotKit
      credentials="include"
      headers={headers}
      runtimeUrl={COPILOT_RUNTIME_URL}
      onError={(event) => {
        console.error("[copilotkit]", event);
      }}
    >
      {children}
    </CopilotKit>
  );
}
