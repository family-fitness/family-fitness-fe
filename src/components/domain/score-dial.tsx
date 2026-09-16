"use client";

import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

/**
 * 신체 점수.
 *
 * 서버가 준 **또래 백분위**를 그대로 그린다. 프론트에서 100점 만점으로 환산하지
 * 않는다 — 그러면 같은 아이가 부모 화면과 아이 화면에서 다른 점수를 받는다.
 *
 * **또래 평균(50) 눈금을 항상 같이 그린다.** 기준이 없으면 62가 좋은 건지 모른다.
 *
 * 링을 SVG 로 그린다. 획 하나짜리 도형이라 WebGL 로 그릴 이유가 없고,
 * SVG 는 어느 크기에서도 선이 또렷하다. 움직임이 필요한 축하 연출만 three.js 로 간다.
 */
export function ScoreDial({
  score,
  size = 200,
  label = "또래 100명 중 내 자리",
  tone = "parent",
  className,
}: {
  /** 0~100 백분위. 측정 기록이 없으면 null */
  score: number | null | undefined;
  size?: number;
  label?: string;
  /** 아이 화면은 굵고 크게 */
  tone?: "parent" | "kid";
  className?: string;
}) {
  const kid = tone === "kid";
  const stroke = kid ? size * 0.1 : size * 0.075;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // 12시에서 시작해 시계방향.
  // 차오르는 연출은 CSS 애니메이션에 맡긴다. effect 안에서 setState 로 흉내 내면
  // 렌더가 한 번 더 돌고, React 19 는 그걸 경고한다
  const filled = (circumference * (score ?? 0)) / 100;
  /** 또래 평균 눈금 위치 */
  const averageAngle = -90 + 360 * 0.5;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={
            score == null ? "아직 측정하지 않았어요" : `또래 100명 중 ${score}번째 자리예요`
          }
        >
          {/* 바탕 링 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={stroke}
          />

          {/* 채워진 만큼 */}
          {score != null && (
            <circle
              key={score}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={kid ? "var(--color-signal)" : "var(--color-signal-deep)"}
              strokeWidth={stroke}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="dial-fill"
              style={
                {
                  "--dial-to": `${filled}`,
                  "--dial-gap": `${circumference}`,
                } as React.CSSProperties
              }
            />
          )}

          {/* 또래 평균 눈금. 이게 없으면 62가 좋은 건지 알 수 없다 */}
          <line
            x1={size / 2 + (r - stroke / 2 - 2) * Math.cos((averageAngle * Math.PI) / 180)}
            y1={size / 2 + (r - stroke / 2 - 2) * Math.sin((averageAngle * Math.PI) / 180)}
            x2={size / 2 + (r + stroke / 2 + 2) * Math.cos((averageAngle * Math.PI) / 180)}
            y2={size / 2 + (r + stroke / 2 + 2) * Math.sin((averageAngle * Math.PI) / 180)}
            stroke="var(--color-ink-soft)"
            strokeWidth={2}
          />
        </svg>

        <div className="absolute inset-0 grid place-content-center text-center">
          {score == null ? (
            <p className={cn("text-faint font-bold", kid ? "text-base" : "text-sm")}>
              아직
              <br />
              재지 않았어요
            </p>
          ) : (
            <>
              <p className="board-num leading-none" style={{ fontSize: size * (kid ? 0.34 : 0.3) }}>
                {/* 링이 차오르는 동안 숫자도 같이 올라간다 */}
                <CountUp to={score} />
              </p>
              <p className={cn("text-faint mt-1", kid ? "text-xs" : "text-[0.7rem]")}>
                또래 평균 50
              </p>
            </>
          )}
        </div>
      </div>

      {score != null && (
        <p className={cn("text-ink-soft mt-2 text-center", kid ? "text-sm" : "text-xs")}>{label}</p>
      )}
    </div>
  );
}
