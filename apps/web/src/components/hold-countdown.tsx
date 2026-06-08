"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HoldCountdownProps = {
  expiresAt: string | null;
  isActive: boolean;
  onExpire?: () => void;
};

function tinhSoGiayConLai(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  const expiresAtTime = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtTime)) {
    return null;
  }

  return Math.max(0, Math.floor((expiresAtTime - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = hours > 0
    ? [hours, minutes, seconds]
    : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function HoldCountdown({ expiresAt, isActive, onExpire }: HoldCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => tinhSoGiayConLai(expiresAt));
  const hasNotifiedExpireRef = useRef(false);

  useEffect(() => {
    hasNotifiedExpireRef.current = false;
    setSecondsLeft(tinhSoGiayConLai(expiresAt));

    if (!isActive || !expiresAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft(tinhSoGiayConLai(expiresAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, isActive]);

  useEffect(() => {
    if (!isActive || secondsLeft === null || secondsLeft > 0 || hasNotifiedExpireRef.current) {
      return;
    }

    hasNotifiedExpireRef.current = true;
    onExpire?.();
  }, [isActive, onExpire, secondsLeft]);

  const countdownText = useMemo(() => {
    if (!isActive) {
      return "Không còn giữ chỗ";
    }

    if (secondsLeft === null) {
      return "Không có dữ liệu";
    }

    if (secondsLeft <= 0) {
      return "Đã hết hạn";
    }

    return formatCountdown(secondsLeft);
  }, [isActive, secondsLeft]);

  return (
    <div
      className={`hold-countdown${secondsLeft !== null && secondsLeft <= 120 ? " hold-countdown-urgent" : ""}`}
      aria-live="polite"
    >
      <span>Còn lại</span>
      <strong>{countdownText}</strong>
    </div>
  );
}
