import Link from "next/link";

import { CardHead } from "@/components/ui/card";
import { GradeBadge } from "@/components/ui/badge";
import type { Certification, Grade, MissingItem, PeerGrade } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 국민체력100 등급 카드 — 인증서처럼 한 사람에 등급 하나.
 *
 * 판정은 서버가 한다(AI 의 certify 와 같은 규칙). 한 등급이 보는 종목을 **다 재야** 그 등급으로 판정해서,
 * 집에서 두어 개만 잰 사람은 등급이 안 나온다. 그때는 등급 대신 무엇을 더 재면 되는지를 말한다.
 */
export function GradeCard({
  certification,
  measureHref,
}: {
  certification: Certification;
  /** 더 재러 갈 곳. 잴 수 없는 사람이면 null — 단추를 두지 않는다 */
  measureHref: string | null;
}) {
  const { status, grade } = certification;
  const missing = joinLabels(certification.missingItems);
  // 등급 기준이 없는 나이(어르신 · 만 7~10세)에는 같은 나이 등급 비율을 그리지 않는다 —
  // 「기준이 없어요」 바로 아래에 1등급 22% … 막대가 나오면 앞뒤가 안 맞는다
  const peers = status === "NO_CRITERIA" ? [] : (certification.peers ?? []);

  let body = null;
  if (status === "GRADED" && grade) {
    body = (
      <>
        <GradeBadge
          grade={grade}
          className="text-metric-lg block leading-none font-extrabold tracking-tight"
        />
        {/* 1등급 줄의 종목을 다 못 재서 아래 등급으로 판정됐다 — 더 재면 1등급까지 볼 수 있다 */}
        {missing && (
          <p className="text-ink-soft mt-2.5 text-sm">1등급까지 보려면 {missing}도 재 보세요</p>
        )}
      </>
    );
  } else if (status === "NEEDS_ITEMS") {
    body = (
      <>
        <p className="text-body font-bold">
          {missing ? `등급을 매기려면 ${missing}도 재야 해요` : "등급을 매기려면 더 재야 해요"}
        </p>
        {measureHref && (
          <Link
            href={measureHref}
            className="press bg-signal-soft text-signal-deep mt-3 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-extrabold"
          >
            마저 재기
          </Link>
        )}
      </>
    );
  } else if (status === "NO_CRITERIA") {
    body = <p className="text-ink-soft text-sm">이 나이는 국민체력100 등급 기준이 없어요</p>;
  }

  if (!body && peers.length === 0) return null;

  return (
    <section className="card">
      <CardHead title="국민체력100 등급" />
      {body && <div className="pt-2.5">{body}</div>}
      {peers.length > 0 && <PeerBar peers={peers} mine={grade ?? null} />}
    </section>
  );
}

/** 종목 이름을 「반복옆뛰기 · 제자리멀리뛰기」 로. 035 · 037 칸은 서버가 「… 또는 …」 으로 준다 */
function joinLabels(items: MissingItem[] | undefined): string {
  return (items ?? [])
    .map((m) => m.label ?? (m.itemCodes ?? []).join(" 또는 "))
    .filter(Boolean)
    .join(", ");
}

/**
 * 등급은 한 색(남색)의 명도로만 가른다 — 1등급이 가장 진하다(`GradeBadge` 와 같은 규칙).
 * 참가 · 그 밖은 회색. 칸 사이 흰 틈으로 가른다
 */
const FILL: Record<Grade | "그 밖", string> = {
  "1등급": "bg-signal-deep",
  "2등급": "bg-signal-deep/65",
  "3등급": "bg-signal-deep/40",
  참가: "bg-bar",
  "그 밖": "bg-line",
};

const ORDER: Grade[] = ["1등급", "2등급", "3등급", "참가"];

/**
 * 같은 나이 · 성별 참가자의 등급 비율 — 막대 하나를 네 칸으로.
 *
 * 성인 · 청소년은 2025년 6월부터 1~6등급 체계로 바뀌어 옛 네 칸의 합이 1 에 못 미친다.
 * 남은 몫을 지우면 네 칸이 부풀어 보이니 「그 밖」 한 칸으로 그대로 둔다
 */
function PeerBar({ peers, mine }: { peers: PeerGrade[]; mine: Grade | null }) {
  const rows: { grade: Grade | "그 밖"; ratio: number }[] = ORDER.map((grade) => ({
    grade,
    ratio: peers.find((p) => p.grade === grade)?.ratio ?? 0,
  })).filter((row) => row.ratio > 0);
  const sum = rows.reduce((s, row) => s + row.ratio, 0);
  if (sum < 0.98) rows.push({ grade: "그 밖", ratio: 1 - sum });

  return (
    <div className="mt-4">
      <p className="text-caption text-ink-soft font-bold">같은 나이 참가자</p>
      {/* 글로 된 칸 이름이 아래에 있다 — 막대는 읽어 주지 않는다 */}
      <div aria-hidden className="fill mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {rows.map((row) => (
          <span
            key={row.grade}
            className={cn("h-full min-w-1", FILL[row.grade])}
            style={{ flexGrow: row.ratio, flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
        {rows.map((row) => (
          <li
            key={row.grade}
            className={cn(
              "text-caption flex items-center gap-1.5",
              row.grade === mine ? "text-ink font-extrabold" : "text-ink-soft font-semibold",
            )}
          >
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-sm", FILL[row.grade])} />
            {row.grade} <span className="tabular">{percent(row.ratio)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 0.0322 → 「3%」. 반올림해 0 이 되는 작은 몫은 「1% 미만」 — 0% 로 쓰면 아무도 없는 것처럼 읽힌다 */
function percent(ratio: number): string {
  const whole = Math.round(ratio * 100);
  return whole === 0 ? "1% 미만" : `${whole}%`;
}
