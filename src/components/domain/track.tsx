"use client";

import { cn } from "@/lib/utils";
import type { FitnessGrade } from "@/lib/api/types";

/**
 * 트랙 — 이 앱의 시각적 중심.
 *
 * 백분위는 곧 "레인 위 어디쯤"이다. 구성원마다 레인이 하나씩이고,
 * 자기 기록만큼 앞에 나가 있다. 아직 측정하지 않은 사람은 출발선에 서 있다.
 *
 * 카드마다 숫자를 흩어놓는 대신 한 트랙 위에 가족을 같이 세우면
 * "우리 집에서 누가 어디쯤인지"가 한 눈에 읽힌다.
 *
 * 규칙
 *   - 등급을 색으로 낙인찍지 않는다. 레인은 전부 같은 색이고 거리만 다르다
 *   - 또래 평균(50) 자리에 표시를 둔다. 기준선이 없으면 거리가 뜻을 잃는다
 *   - 측정하지 않은 사람도 레인에 남긴다. 목록에서 빼면 없는 사람이 된다
 */
export interface Runner {
  id: string;
  name: string;
  /** 측정 전이면 null. 출발선에 선다 */
  percentile: number | null;
  grade: FitnessGrade | null;
  /** 만 4세 미만처럼 애초에 달릴 수 없는 경우 */
  cannotRun?: boolean;
  note?: string;
}

export function Track({ runners, className }: { runners: Runner[]; className?: string }) {
  const description = runners
    .map((r) =>
      r.percentile === null
        ? `${r.name} 기록 없음`
        : `${r.name} 또래 중 상위 ${Math.max(1, 100 - r.percentile)} 퍼센트`,
    )
    .join(", ");

  return (
    <div className={cn("space-y-0", className)} role="img" aria-label={`가족 트랙. ${description}`}>
      {/* 또래 평균 눈금 */}
      <div aria-hidden className="text-ink-soft relative mb-1 h-3.5 text-[0.62rem] font-semibold">
        <span className="absolute left-1/2 -translate-x-1/2">또래 평균</span>
      </div>

      <div className="track-body">
        <span className="avg-line" aria-hidden />
        {runners.map((runner, index) => (
          <Lane key={runner.id} runner={runner} lane={index + 1} delay={index * 0.07} />
        ))}
      </div>
    </div>
  );
}

function Lane({ runner, lane, delay }: { runner: Runner; lane: number; delay: number }) {
  const running = runner.percentile !== null;

  return (
    <div className="lane h-11" aria-hidden>
      {/* 출발선 */}
      <span className="start-line" />

      {/* 레인 번호 */}
      <span className="board-num text-track-deep/45 absolute top-1/2 left-3 -translate-y-1/2 text-lg">
        {lane}
      </span>

      {running ? (
        <span
          className="run-in absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap"
          style={{
            left: `calc(1.9rem + (100% - 5.5rem) * ${(runner.percentile ?? 0) / 100})`,
            animationDelay: `${delay}s`,
          }}
        >
          <span className="bg-track size-2.5 rounded-full ring-2 ring-white" />
          <span className="text-ink text-[0.8rem] font-bold">{runner.name}</span>
          <span className="board board-on px-1.5 py-0.5">
            <span className="board-num text-board-lit text-[0.95rem]">{runner.percentile}</span>
          </span>
        </span>
      ) : (
        <span className="absolute top-1/2 left-8 flex -translate-y-1/2 items-center gap-1.5">
          <span className="border-track/40 size-2.5 rounded-full border-2 border-dashed" />
          <span className="text-ink-soft text-[0.8rem] font-semibold">{runner.name}</span>
          <span className="text-faint text-[0.68rem]">
            {runner.cannotRun ? "만 4세부터" : "아직 기록 없음"}
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * 항목 하나의 기록 막대. 결과 화면처럼 여러 항목을 나란히 놓을 때 쓴다.
 * 트랙은 가족 전체를 한 화면에 놓을 때만 쓴다.
 */
export function RecordBar({
  label,
  value,
  percentile,
}: {
  label: string;
  value: string;
  percentile: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-ink-soft">{value}</span>
      </div>
      <div
        className="lane track-body h-7"
        role="img"
        aria-label={`또래 중 상위 ${Math.max(1, 100 - percentile)} 퍼센트`}
      >
        <span className="avg-line" aria-hidden />
        <span
          className="run-in absolute top-1/2 flex -translate-y-1/2 items-center"
          style={{ left: `calc(0.4rem + (100% - 2.4rem) * ${percentile / 100})` }}
          aria-hidden
        >
          <span className="bg-track size-2 rounded-full ring-2 ring-white" />
          <span className="board-num text-track-deep ml-1 text-sm">{percentile}</span>
        </span>
      </div>
    </div>
  );
}
