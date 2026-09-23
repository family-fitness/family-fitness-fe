import { ASSETS } from "@/lib/asset-list";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

/*
  레벨 캐릭터 「키움이」.

  그림 파일(`level/level-1` … `level/level-5-cheer`)이 들어오면 그걸 쓰고, 오기 전까지는
  코드로 그린다(`ASSET_PROMPTS.md` 1장 — 이 코드 그림이 그 주문의 참고 그림이다).
  색은 파랑 · 남색 · 노랑 · 흰색뿐이고 그라데이션 · 그림자가 없다 — 헬스 앱의 단순한 결.
  머리 위 새싹이 단계마다 자란다. 몸은 그대로라 같은 아이가 자라는 것으로 읽힌다.

  기본은 멈춤이다(AGENTS.md 「움직임」). `cheer` 는 방금 해낸 순간에만 켠다.
*/

const BLUE = "var(--color-signal)";
const NAVY = "var(--color-signal-deep)";
const YELLOW = "var(--color-mark)";
const SOFT = "var(--color-signal-soft)";

export function LevelBuddy({
  stage,
  size = 144,
  cheer,
  className,
  label,
}: {
  stage: Stage;
  size?: number;
  /** 두 팔을 번쩍. 다 했어요 · 레벨 업 */
  cheer?: boolean;
  className?: string;
  /** 읽어 줄 이름. 없으면 그림으로만 둔다 */
  label?: string;
}) {
  // 주문한 그림이 들어왔으면 그림으로. 목록에 없으면 코드로 그린 모습이 선다
  const art = `level/level-${stage}${cheer ? "-cheer" : ""}`;
  if (ASSETS.has(art)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 크기가 고정된 작은 그림이다
      <img
        src={`/assets/${art}.png`}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* 바닥 */}
      <ellipse cx={80} cy={151} rx={40} ry={5} fill="var(--color-line)" />

      {/* 새싹 — 단계마다 자란다 */}
      <Sprout stage={stage} />

      {/* 팔. 몸 뒤에 둬서 어깨가 자연스럽게 붙는다 */}
      {cheer ? (
        <>
          <ellipse cx={27} cy={90} rx={8} ry={15} fill={BLUE} transform="rotate(-50 27 90)" />
          <ellipse cx={133} cy={90} rx={8} ry={15} fill={BLUE} transform="rotate(50 133 90)" />
        </>
      ) : (
        <>
          <ellipse cx={35} cy={112} rx={8} ry={13} fill={BLUE} transform="rotate(20 35 112)" />
          <ellipse cx={125} cy={112} rx={8} ry={13} fill={BLUE} transform="rotate(-20 125 112)" />
        </>
      )}

      {/* 몸 */}
      <path
        d="M80 54 C114 54 130 80 130 106 C130 133 109 148 80 148 C51 148 30 133 30 106 C30 80 46 54 80 54 Z"
        fill={BLUE}
      />
      <ellipse cx={80} cy={117} rx={31} ry={24} fill={SOFT} />

      {/* 3단계부터 머리띠 */}
      {stage >= 3 && <path d="M37 84 Q80 66 123 84 L125 93 Q80 75 35 93 Z" fill={YELLOW} />}

      {/* 얼굴 */}
      <ellipse cx={66} cy={98} rx={5.5} ry={7} fill={NAVY} />
      <ellipse cx={94} cy={98} rx={5.5} ry={7} fill={NAVY} />
      <circle cx={67.8} cy={95.5} r={2} fill="#fff" />
      <circle cx={95.8} cy={95.5} r={2} fill="#fff" />
      <ellipse cx={55} cy={110} rx={6} ry={3.5} fill={YELLOW} opacity={0.55} />
      <ellipse cx={105} cy={110} rx={6} ry={3.5} fill={YELLOW} opacity={0.55} />
      <path
        d={cheer ? "M71 106 Q80 118 89 106 Z" : "M72 107 Q80 114 88 107"}
        stroke={NAVY}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={cheer ? NAVY : "none"}
      />

      {/* 5단계는 가슴에 메달 */}
      {stage >= 5 && (
        <>
          <path
            d="M70 116 L80 128 L90 116"
            stroke={NAVY}
            strokeWidth={3}
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx={80} cy={132} r={8} fill={YELLOW} />
          <circle cx={80} cy={132} r={3.2} fill={NAVY} />
        </>
      )}

      {/* 발 */}
      <ellipse cx={63} cy={147} rx={13} ry={6.5} fill={NAVY} />
      <ellipse cx={97} cy={147} rx={13} ry={6.5} fill={NAVY} />
    </svg>
  );
}

/** 머리 위 새싹. 씨앗 → 새싹 → 잎새 → 꽃 → 나무 */
function Sprout({ stage }: { stage: Stage }) {
  const stemTop = [0, 46, 40, 34, 30, 26][stage];
  const leaf = (dir: 1 | -1, size: number, y: number) => (
    <path
      d={`M80 ${y} C${80 + dir * size * 0.35} ${y - size * 0.55} ${80 + dir * size} ${y - size * 0.6} ${80 + dir * size * 1.1} ${y - size * 0.2} C${80 + dir * size * 0.8} ${y + size * 0.3} ${80 + dir * size * 0.3} ${y + size * 0.3} 80 ${y} Z`}
      fill={YELLOW}
    />
  );

  return (
    <g>
      <path d={`M80 56 L80 ${stemTop}`} stroke={NAVY} strokeWidth={3} strokeLinecap="round" />
      {stage === 1 && leaf(1, 12, 49)}
      {stage === 2 && (
        <>
          {leaf(1, 15, 44)}
          {leaf(-1, 13, 46)}
        </>
      )}
      {stage >= 3 && (
        <>
          {leaf(1, stage >= 4 ? 20 : 18, stemTop + 8)}
          {leaf(-1, stage >= 4 ? 20 : 18, stemTop + 8)}
        </>
      )}
      {stage === 4 && (
        <>
          <circle cx={80} cy={stemTop - 2} r={7.5} fill={YELLOW} />
          <circle cx={80} cy={stemTop - 2} r={3} fill={NAVY} />
        </>
      )}
      {stage === 5 && (
        <path
          d={`M80 ${stemTop + 2} C73 ${stemTop - 6} 73 ${stemTop - 16} 80 ${stemTop - 22} C87 ${stemTop - 16} 87 ${stemTop - 6} 80 ${stemTop + 2} Z`}
          fill={YELLOW}
        />
      )}
    </g>
  );
}
