import React, { useEffect, useRef } from 'react';

interface ActionVideoProps {
  src: string;
  startTime: number;
  endTime: number;
  className?: string;
  poster?: string;
  playbackRate?: number;
  onEnded?: () => void;
}

/**
 * 정밀 구간 재생 비디오 컴포넌트
 * - HTML5 Video의 startTime ~ endTime 구간을 재생하고 자동 일시정지
 * - 모바일 환경 지원을 위한 playsInline, muted, autoPlay 강제
 */
export const ActionVideo: React.FC<ActionVideoProps> = ({
  src,
  startTime,
  endTime,
  className = '',
  poster,
  playbackRate = 1,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isCancelled = false;

    const setupAndPlay = () => {
      if (isCancelled || !video) return;
      video.currentTime = startTime;
      video.playbackRate = playbackRate > 0 ? playbackRate : 1;
      video.play().catch(() => {
        // 브라우저 정책 등에 의한 자동재생 제한 시 무시
      });
    };

    video.playbackRate = playbackRate > 0 ? playbackRate : 1;

    if (video.readyState >= 1) {
      setupAndPlay();
    } else {
      video.addEventListener('loadedmetadata', setupAndPlay, { once: true });
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.pause();
        onEnded?.();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    // 백업 타이머: timeupdate 지연 대비 안전 정지 (재생속도 반영)
    const rate = playbackRate > 0 ? playbackRate : 1;
    const durationMs = Math.max(0, ((endTime - startTime) / rate) * 1000) + 250;
    const safetyTimer = setTimeout(() => {
      if (!isCancelled && video) {
        video.pause();
        onEnded?.();
      }
    }, durationMs);

    return () => {
      isCancelled = true;
      video.removeEventListener('timeupdate', handleTimeUpdate);
      clearTimeout(safetyTimer);
    };
  }, [src, startTime, endTime, playbackRate, onEnded]);

  return (
    <video
      ref={videoRef}
      key={`${src}-${startTime}-${endTime}`}
      src={`${src}#t=${startTime},${endTime}`}
      poster={poster}
      muted
      playsInline
      autoPlay
      className={className}
    />
  );
};
