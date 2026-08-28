"use client";

import { useRef, useState } from "react";

export function JourneyPhoneVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  async function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }

      return;
    }

    video.pause();
  }

  function toggleMute() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  return (
    <div className="journey-phone-screen">
      <video
        ref={videoRef}
        className="journey-phone-video"
        src="/video.mp4"
        poster="/images/airport-terminal.jpg"
        preload="metadata"
        playsInline
        muted
        aria-label="Video trải nghiệm hành trình Vietnam Airlines"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
      />
      <div className="journey-phone-overlay" aria-hidden="true" />
      <span className="journey-phone-label">HÀNH TRÌNH MỖI NGÀY</span>
      <button
        type="button"
        className="journey-phone-play"
        onClick={() => void togglePlayback()}
        aria-label={isPlaying ? "Tạm dừng video" : "Phát video"}
        aria-pressed={isPlaying}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {isPlaying ? (
            <>
              <path d="M7 6.5v11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M17 6.5v11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </>
          ) : (
            <path d="m9 6 8 6-8 6V6Z" fill="currentColor" />
          )}
        </svg>
      </button>
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
      <span className="journey-phone-caption">Sẵn sàng cho chuyến bay tiếp theo</span>
    </div>
  );
}
