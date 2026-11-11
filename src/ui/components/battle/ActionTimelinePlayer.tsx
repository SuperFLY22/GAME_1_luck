import React, { useEffect, useRef, useState } from 'react';
import type { ActionSequence } from '../../../models/types';

interface ActionTimelinePlayerProps {
  sequence?: ActionSequence | null;
  fallbackImageUrl?: string | null;
  fallbackClassName?: string;
  onHitStop?: () => void;
  onTriggerSfx?: (sfxType: 'hit' | 'guard' | 'swing' | 'dodge') => void;
  altText?: string;
  className?: string;
}

/**
 * ActionTimelinePlayer
 * 
 * 가변 프레임 타임라인(Frame Timeline) 플레이어:
 * - 균등 간격(setInterval) 재생의 밋밋함을 탈피하고, 각 프레임마다 고유의 유지 시간(durationMs)을 부여.
 * - 타격 프레임(Hit Point) 도달 시 히트스톱(Hit-Stop) 및 사운드 효과(SFX) 콜백 트리거.
 * - 시퀀스 에셋이 없을 경우 CSS 3D fallbackClassName으로 부드럽게 감속/가속 연출 지원.
 */
export const ActionTimelinePlayer: React.FC<ActionTimelinePlayerProps> = ({
  sequence,
  fallbackImageUrl,
  fallbackClassName = '',
  onHitStop,
  onTriggerSfx,
  altText = 'Action sprite',
  className = '',
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  // 시퀀스가 변경되면 0프레임부터 시작
  useEffect(() => {
    setCurrentFrameIndex(0);
    if (!sequence || sequence.length === 0) {
      return;
    }

    let isCancelled = false;

    const playFrame = (idx: number) => {
      if (isCancelled || !sequence || idx >= sequence.length) return;

      const frame = sequence[idx];
      setCurrentFrameIndex(idx);

      // 히트스톱 트리거
      if (frame.hitStop && onHitStop) {
        onHitStop();
      }

      // SFX 트리거
      if (frame.triggerSfx && onTriggerSfx) {
        onTriggerSfx(frame.triggerSfx);
      }

      // 다음 프레임 예약
      if (idx < sequence.length - 1) {
        timeoutRef.current = window.setTimeout(() => {
          playFrame(idx + 1);
        }, frame.durationMs);
      }
    };

    playFrame(0);

    return () => {
      isCancelled = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sequence, onHitStop, onTriggerSfx]);

  // 1. 프레임 시퀀스가 있는 경우
  if (sequence && sequence.length > 0) {
    const currentFrame = sequence[currentFrameIndex] || sequence[0];
    return (
      <div className={`relative select-none pointer-events-none ${className}`}>
        <img
          src={currentFrame.spriteUrl}
          alt={`${altText} - frame ${currentFrameIndex + 1}`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // 2. 단일 폴백 이미지 + CSS 3D 키프레임 모션인 경우
  if (fallbackImageUrl) {
    return (
      <div className={`relative select-none pointer-events-none ${fallbackClassName} ${className}`}>
        <img
          src={fallbackImageUrl}
          alt={altText}
          className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
        />
      </div>
    );
  }

  return null;
};

