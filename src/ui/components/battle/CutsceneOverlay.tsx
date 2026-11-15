import React, { useEffect, useRef, useState } from 'react';

interface CutsceneOverlayProps {
  outcome: 'HIT' | 'DODGE' | 'TIE' | null;
  target: 'p1' | 'p2' | null;
  myPlayerId?: 'p1' | 'p2';
  onFinished?: () => void;
}

/**
 * 모바일 아케이드 스타일 피격/결정타 비디오 컷씬 오버레이
 * - HIT 발생 시 웹제미나이 기반 뿅망치 타격 비디오(hit_impact.mp4) 재생
 * - 자동 1.8초 트림 타이머로 게임 템포 유지
 * - 비디오 에러 또는 미지원 환경 시 안전하게 자동 종료(Fallback)
 */
export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  outcome,
  target,
  myPlayerId = 'p1',
  onFinished,
}) => {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 상대방이 맞았을 때 (내가 공격 성공했을 때) 컷씬 발동
  const isOpponentHit = outcome === 'HIT' && target !== null && target !== myPlayerId;

  useEffect(() => {
    if (isOpponentHit) {
      setActive(true);

      // 영상 재생 시작
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // 브라우저 자동재생 제한 시 Fallback
          setActive(false);
          onFinished?.();
        });
      }

      // 게임 템포를 위해 최대 1.8초 후 자동 닫기
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setActive(false);
        onFinished?.();
      }, 1800);
    } else {
      setActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpponentHit, outcome, target, myPlayerId, onFinished]);

  if (!active || !isOpponentHit) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn pointer-events-none overflow-hidden">
      {/* 아케이드 컷씬 컨테이너 */}
      <div className="relative w-full max-w-[340px] sm:max-w-md aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden border-4 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.85)] animate-scaleUp">
        {/* 비디오 엘리먼트 */}
        <video
          ref={videoRef}
          src="/assets/videos/cutscenes/hit_impact.mp4"
          muted
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* 상단 다이내믹 텍스트 배너 */}
        <div className="absolute top-4 inset-x-0 flex justify-center">
          <span className="bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 text-white font-black text-xl sm:text-2xl px-5 py-1.5 rounded-full border-2 border-yellow-300 shadow-[0_4px_20px_rgba(0,0,0,0.8)] tracking-widest animate-bounce">
            💥 CRITICAL HIT!
          </span>
        </div>

        {/* 하단 만화풍 집중선 비네트 오버레이 */}
        <div className="absolute inset-0 border-8 border-amber-400/30 rounded-3xl pointer-events-none" />
      </div>
    </div>
  );
};
