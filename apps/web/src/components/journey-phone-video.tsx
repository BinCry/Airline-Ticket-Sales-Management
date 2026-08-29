"use client";

import { useState } from "react";

export function JourneyPhoneVideo() {
  const [isMuted, setIsMuted] = useState(true);

  function toggleMute() {
    setIsMuted((currentMuted) => !currentMuted);
  }

  return (
    <div className="journey-phone-screen">
      <video
        className="journey-phone-video"
        src="/video.mp4"
        autoPlay
        loop
        preload="auto"
        playsInline
        muted={isMuted}
        aria-label="Video trải nghiệm hành trình Vietnam Airlines"
      />
      <button
        type="button"
        className="journey-phone-mute"
        onClick={toggleMute}
        aria-label={isMuted ? "Bật tiếng video" : "Tắt tiếng video"}
        aria-pressed={!isMuted}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 10v4h3l4 3V7l-4 3H5Z" fill="currentColor" />
          {isMuted ? (
            <>
              <path d="m16 10 4 4M20 10l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M16 9.2a4 4 0 0 1 0 5.6M18.7 6.7a7.5 7.5 0 0 1 0 10.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
