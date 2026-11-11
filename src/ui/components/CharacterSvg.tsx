import React from 'react';
import type { ChamDirection, DamageLevel } from '../../models/types';

interface CharacterSvgProps {
  playerId: 'p1' | 'p2';
  damage: DamageLevel;
  direction: ChamDirection;
  isHit: boolean;
  role: 'ATTACKER' | 'DEFENDER' | 'TIE' | null;
}

export const CharacterSvg: React.FC<CharacterSvgProps> = ({
  playerId,
  damage,
  direction,
  isHit,
  role,
}) => {
  const isP1 = playerId === 'p1';
  const baseColor = isP1 ? '#38bdf8' : '#fb7185'; // P1 Cyan/Sky, P2 Rose/Pink
  const skinTone = damage >= 4 ? '#e2d3b3' : '#fed7aa'; // 피격 심할 시 창백한 톤

  // 고개 회전 각도 (참참참 방향 반영)
  let headTransform = 'rotate(0deg)';
  if (direction === 'LEFT') {
    headTransform = 'rotate(-16deg) translateX(-12px)';
  } else if (direction === 'RIGHT') {
    headTransform = 'rotate(16deg) translateX(12px)';
  }

  return (
    <div
      className={`relative w-28 h-36 sm:w-60 sm:h-72 flex items-center justify-center transition-transform duration-200 select-none ${
        isHit ? 'animate-bounce scale-95 brightness-125' : ''
      }`}
      style={{ transform: headTransform }}
    >
      <svg
        viewBox="0 0 200 240"
        className="w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
      >
        {/* 머리 뒤 헤어/후광 */}
        <circle cx="100" cy="110" r="75" fill={baseColor} stroke="#1e293b" strokeWidth="6" />

        {/* 4단계/5단계 머리 위 도는 별 이펙트 */}
        {damage >= 4 && (
          <g className="animate-spin origin-center" style={{ transformOrigin: '100px 30px' }}>
            <polygon points="100,10 104,22 116,22 106,30 110,42 100,34 90,42 94,30 84,22 96,22" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
            <polygon points="60,20 63,28 72,28 65,34 68,42 60,36 52,42 55,34 48,28 57,28" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
            <polygon points="140,20 143,28 152,28 145,34 148,42 140,36 132,42 135,34 128,28 137,28" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
          </g>
        )}

        {/* 머리통 윤곽 (단계별 찌그러짐) */}
        {damage <= 2 && (
          <ellipse cx="100" cy="120" rx="65" ry="68" fill={skinTone} stroke="#0f172a" strokeWidth="5" />
        )}
        {damage === 3 && (
          // 3단계: 살짝 비틀린 얼굴형
          <path
            d="M 40,120 C 35,70 65,55 100,55 C 145,55 170,75 162,125 C 158,165 140,190 100,188 C 55,188 42,160 40,120 Z"
            fill={skinTone}
            stroke="#0f172a"
            strokeWidth="5"
          />
        )}
        {damage >= 4 && (
          // 4단계, 5단계: 호박처럼 찌그러진 비대칭 얼굴
          <path
            d="M 35,115 C 28,60 70,50 115,48 C 160,45 178,80 170,135 C 165,180 135,200 90,195 C 45,190 38,155 35,115 Z"
            fill={skinTone}
            stroke="#0f172a"
            strokeWidth="6"
          />
        )}

        {/* 머리카락 (정상 vs 1단계 삐죽 솟음) */}
        {damage === 0 && (
          <path d="M 50,75 Q 100,45 150,75 Q 130,55 100,55 Q 70,55 50,75" fill="#1e293b" />
        )}
        {damage >= 1 && (
          // 삐죽 솟은 머리카락 더듬이
          <g>
            <path d="M 50,75 Q 100,45 150,75" stroke="#0f172a" strokeWidth="4" fill="none" />
            <path d="M 100,55 Q 105,25 125,20" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" fill="none" />
            {damage >= 3 && (
              <path d="M 85,55 Q 70,30 60,35" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" fill="none" />
            )}
          </g>
        )}

        {/* 눈 렌더링 (0~5단계) */}
        {/* 1단계 멍 (한쪽 눈 보라색 타원) */}
        {damage === 1 && (
          <ellipse cx="75" cy="115" rx="18" ry="14" fill="#c084fc" opacity="0.6" />
        )}
        {/* 2단계 이상 양쪽 눈탱이 밤탱이 */}
        {damage >= 2 && (
          <>
            <ellipse cx="75" cy="115" rx="20" ry="16" fill="#7e22ce" opacity="0.65" />
            <ellipse cx="125" cy="115" rx="20" ry="16" fill="#7e22ce" opacity="0.65" />
          </>
        )}

        {/* 눈 형태 */}
        {damage === 0 && (
          // 웃는 눈
          <>
            <circle cx="75" cy="112" r="7" fill="#0f172a" />
            <circle cx="125" cy="112" r="7" fill="#0f172a" />
            <circle cx="77" cy="110" r="2.5" fill="#ffffff" />
            <circle cx="127" cy="110" r="2.5" fill="#ffffff" />
          </>
        )}
        {damage === 1 && (
          // 약간 찡그린 눈
          <>
            <circle cx="75" cy="114" r="6" fill="#0f172a" />
            <circle cx="125" cy="112" r="7" fill="#0f172a" />
          </>
        )}
        {damage === 2 && (
          // 양쪽 찡그린 눈썹과 사시 눈
          <>
            <line x1="60" y1="98" x2="88" y2="106" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
            <line x1="140" y1="98" x2="112" y2="106" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
            <circle cx="73" cy="115" r="5" fill="#0f172a" />
            <circle cx="127" cy="115" r="5" fill="#0f172a" />
          </>
        )}
        {damage === 3 && (
          // 짝눈 및 고통 표정
          <>
            <line x1="60" y1="95" x2="88" y2="108" stroke="#0f172a" strokeWidth="4" />
            <line x1="140" y1="95" x2="112" y2="108" stroke="#0f172a" strokeWidth="4" />
            <path d="M 68,115 Q 75,108 82,115" stroke="#0f172a" strokeWidth="4" fill="none" />
            <circle cx="126" cy="115" r="4" fill="#0f172a" />
          </>
        )}
        {damage === 4 && (
          // 뱅글이 눈 (소용돌이)
          <>
            <path d="M 70,115 Q 75,108 80,115 Q 75,122 72,115" stroke="#0f172a" strokeWidth="3" fill="none" />
            <path d="M 120,115 Q 125,108 130,115 Q 125,122 122,115" stroke="#0f172a" strokeWidth="3" fill="none" />
          </>
        )}
        {damage === 5 && (
          // X_X 기절 눈
          <>
            <g stroke="#dc2626" strokeWidth="5" strokeLinecap="round">
              <line x1="66" y1="108" x2="84" y2="124" />
              <line x1="84" y1="108" x2="66" y2="124" />
              <line x1="116" y1="108" x2="134" y2="124" />
              <line x1="134" y1="108" x2="116" y2="124" />
            </g>
          </>
        )}

        {/* 뺨에 반창고 (3단계 이상) */}
        {damage >= 3 && (
          <g transform="translate(132, 138) rotate(-20)">
            <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#fcd34d" stroke="#b45309" strokeWidth="1.5" />
            <circle cx="-5" cy="0" r="1" fill="#b45309" />
            <circle cx="0" cy="0" r="1" fill="#b45309" />
            <circle cx="5" cy="0" r="1" fill="#b45309" />
          </g>
        )}

        {/* 코 및 코피 (3단계 이상 코피 주르륵) */}
        <circle cx="100" cy="128" r="4" fill="#f97316" />
        {damage >= 3 && (
          <path
            d="M 102,130 Q 105,148 103,162 Q 101,168 103,172"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* 입 모양 */}
        {damage === 0 && (
          <path d="M 85,145 Q 100,165 115,145" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {damage === 1 && (
          <path d="M 88,148 Q 100,158 112,148" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {damage === 2 && (
          <path d="M 86,155 Q 100,145 114,155" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {damage === 3 && (
          <ellipse cx="100" cy="154" rx="10" ry="7" fill="#881337" stroke="#0f172a" strokeWidth="3" />
        )}
        {damage >= 4 && (
          // 부르튼 두꺼운 입술 및 침/피
          <g>
            <ellipse cx="100" cy="158" rx="18" ry="11" fill="#f43f5e" stroke="#0f172a" strokeWidth="4" />
            <line x1="86" y1="158" x2="114" y2="158" stroke="#881337" strokeWidth="3" />
            <path d="M 112,164 Q 115,178 113,184" stroke="#0284c7" strokeWidth="3" fill="none" />
          </g>
        )}

        {/* 5단계 눈물 범벅 */}
        {damage === 5 && (
          <g>
            <path d="M 64,128 Q 58,155 60,175" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 136,128 Q 142,155 140,175" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 5단계 항복 흰 깃발 (한 손으로 백기 흔듦) */}
        {damage === 5 && (
          <g className="animate-pulse" transform="translate(150, 40)">
            <line x1="0" y1="120" x2="25" y2="0" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
            <polygon points="25,0 75,18 20,40" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
            <text x="32" y="24" fontSize="12" fontWeight="bold" fill="#0f172a">KO</text>
          </g>
        )}
      </svg>

      {/* 역할 뱃지 (공격수 / 수비수) */}
      {role && (
        <div
          className={`absolute -top-3 px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md uppercase border-2 ${
            role === 'ATTACKER'
              ? 'bg-amber-400 text-slate-900 border-amber-600 animate-pulse'
              : role === 'DEFENDER'
              ? 'bg-blue-500 text-white border-blue-700'
              : 'bg-slate-300 text-slate-800 border-slate-500'
          }`}
        >
          {role === 'ATTACKER' ? '💥 공격수' : role === 'DEFENDER' ? '🛡️ 수비수' : '🤝 비김'}
        </div>
      )}
    </div>
  );
};
