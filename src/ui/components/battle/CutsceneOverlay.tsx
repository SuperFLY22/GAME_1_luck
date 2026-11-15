import React, { useEffect, useRef, useState } from 'react';

interface CutsceneOverlayProps {
  outcome: 'HIT' | 'DODGE' | 'TIE' | null;
  target: 'p1' | 'p2' | null;
  targetDamage?: number;
  myPlayerId?: 'p1' | 'p2';
  onFinished?: () => void;
}

/**
 * 2-e 요구사항: 마지막 5번째 결정타(KO) 성공 시 풀스크린 비디오 컷씬 오버레이
 * - 마지막 5번째 일격(상대 damage >= 5) 성공 시 hit_impact.mp4 재생
 * - 1.8초 재생 후 결과 페이지(GameOverModal)로 자연스럽게 전환
 */
export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  outcome,
  target,
  targetDamage = 0,
  myPlayerId = 'p1',
  onFinished,
}) => {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2-e: 내가 공격하여 마지막 5번째 일격(상대 damage >= 5)이 성공했을 때만 발동
  const isFinalHit =
    outcome === 'HIT' &&
    target !== null &&
    target !== myPlayerId &&
    targetDamage >= 5;

  useEffect(() => {
    if (isFinalHit) {
      setActive(true);

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // 브라우저 자동재생 제한 시 Fallback
          setActive(false);
          onFinished?.();
        });
      }

      // 1.8초 후 컷씬 종료 및 결과 페이지 전환 트리거
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setActive(false);
        onFinished?.();
      }, 1900);
    } else {
      setActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFinalHit, onFinished]);

  if (!active || !isFinalHit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn pointer-events-none overflow-hidden">
      {/* 아케이드 컷씬 컨테이너 */}
      <div className="relative w-full max-w-[340px] sm:max-w-md aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden border-4 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.85)] animate-scaleUp">
        <video
          ref={videoRef}
          src="/assets/videos/cutscenes/hit_impact.mp4"
          muted
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* 상단 다이내믹 KO 텍스트 배너 */}
        <div className="absolute top-4 inset-x-0 flex justify-center">
          <span className="bg-gradient-to-r from-red-600 via-amber-500 to-rose-600 text-white font-black text-xl sm:text-2xl px-5 py-1.5 rounded-full border-2 border-yellow-300 shadow-[0_4px_20px_rgba(0,0,0,0.8)] tracking-widest animate-bounce">
            💥 FINAL KNOCKOUT! 💥
          </span>
        </div>

        {/* 집중선 비네트 오버레이 */}
        <div className="absolute inset-0 border-8 border-amber-400/30 rounded-3xl pointer-events-none" />
      </div>
    </div>
  );
};
