"use client";

import { Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { StoneTrail } from "@/components/scene/stone-trail";
import { useCoachRun } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

/**
 * AI 편성 — 짜는 과정.
 *
 * 스피너 하나로 때우지 않는다(규칙 6). 코치가 **무엇을 보고 있는지** 단계마다 한 줄씩
 * 남는다 — 신체 · 체력 기록 읽기 · 국민체력100 처방 · 영상 찾기 · 순서 짜기 · 근거 확인하기(AI 파트의
 * assess · retrieve · compose · verify).
 * 나중에 「왜 이 운동이지?」 를 되짚을 수 있는 근거다. 한 줄 한 줄은 서버 문장 그대로다.
 *
 * 위에는 징검다리 — 단계마다 돌 하나, 한 단계를 마치면 키움이가 다음 돌로 건너간다.
 * 계속 움직이는 것은 하나 — 지금 밟고 있는 단계의 고리만 돈다. 건너는 건 그 순간 한 번이다.
 * 다 짜면 제안 화면으로 스스로 넘어간다.
 */

/** 단계 코드를 화면 이름으로. 코드값을 그대로 내보내지 않는다 — AI 서비스의 네 단계(명세 §5.4) */
const STEP_TITLE: Record<string, string> = {
  // 안 잰 아이는 연령대 · 키 · 몸무게를 읽는다(9/30) — 두 경우 다 맞는 이름
  assess: "신체 · 체력 기록 읽기",
  retrieve: "국민체력100 처방 · 영상 찾기",
  compose: "순서 짜기",
  verify: "근거 확인하기",
};

/** 이만큼 단계가 하나도 안 움직이면 묻기를 쉰다 — 서버가 RUNNING 에 멈추면 0.7초마다 끝없이 물었다 */
const STALL_MS = 120_000;

/** 서버가 아직 안 밟은 단계도 자리는 미리 보여 준다 — 몇 단계 남았는지 알게 */
const PLANNED = ["assess", "retrieve", "compose", "verify"];

/** 단계 상태 — AI 는 ok · partial · failed 를 준다. partial 도 지나간 단계다(돌지 않는다) */
const stateOf = (status: string | undefined) => {
  const s = (status ?? "").toLowerCase();
  return s === "ok" || s === "partial" ? "passed" : s === "failed" ? "failed" : "running";
};

export default function PlanRunPage() {
  return (
    <ParentOnly>
      <PlanRun />
    </ParentOnly>
  );
}

function PlanRun() {
  const router = useRouter();
  const { runId } = useParams<{ runId: string }>();
  const [stalled, setStalled] = useState(false);
  /** 「다시 불러오기」 로 다시 기다리기 시작한 횟수 — 멈춤 시계를 새로 건다 */
  const [wake, setWake] = useState(0);
  const { data: run, error, refetch, isRefetching } = useCoachRun(runId, !stalled);

  const status = run?.status;
  // 단계가 움직일 때마다 시계를 새로 건다. 한참 그대로면 멈춘 것으로 본다
  const passedCount = (run?.steps ?? []).filter((s) => stateOf(s.status) === "passed").length;
  useEffect(() => {
    if (status !== "RUNNING") return;
    const id = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(id);
  }, [status, passedCount, wake]);
  const resume = () => {
    setStalled(false);
    setWake((n) => n + 1);
    void refetch();
  };
  // 다 짰으면 한 박자 쉬고 제안으로. 마지막 줄이 찍히는 걸 보고 넘어가게
  useEffect(() => {
    if (status !== "AWAITING_APPROVAL" && status !== "APPROVED" && status !== "REJECTED") return;
    const id = setTimeout(() => router.replace(`/plan/${runId}`), 900);
    return () => clearTimeout(id);
  }, [status, runId, router]);

  // 한 번 못 받았다고 짜던 과정을 걷어 내지 않는다 — 다음 번에 다시 묻는다
  if (error && !run) {
    return (
      <>
        <AppBar backHref="/plan" title="짜는 중" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  const steps = run?.steps ?? [];
  const byName = new Map(steps.map((s) => [s.name ?? "", s]));
  const names = [...new Set([...PLANNED, ...steps.map((s) => s.name ?? "")])].filter(Boolean);
  // 지나간 단계 — ok · partial 만. failed 는 「마쳤어요」 로 세지 않는다
  const passedAt = (n: string) => {
    const step = byName.get(n);
    return step != null && stateOf(step.status) === "passed";
  };
  const done = names.filter(passedAt).length;
  const finished = status != null && status !== "RUNNING";
  const failedRun = status === "FAILED";
  // 멈춘 채로 둔다 — 돌기만 하면 기다리면 되는 줄 안다
  const stuck = stalled && !finished;
  const doneAt = names.flatMap((n, i) => (passedAt(n) ? [i] : []));
  const nowAt = names.findIndex((n) => !passedAt(n));

  return (
    <>
      <AppBar backHref="/plan" title="짜는 중" />
      <Stage wide className="space-y-3">
        <section className="card-hero flex flex-col items-center text-center">
          <StoneTrail
            layout="zigzag"
            count={names.length}
            done={doneAt}
            current={finished || stuck || nowAt < 0 ? null : nowAt}
            stage={3}
            height={150}
            label={`${names.length}단계 중 ${done}단계를 마쳤어요`}
            className="-mt-2"
          />
          {/* 짜는 동안은 막대 제목(「짜는 중」)이 말한다 — 끝났을 때만 한마디 */}
          <p
            className={cn("text-lead font-extrabold", (failedRun || finished || stuck) && "mt-2")}
            aria-live="polite"
          >
            {failedRun
              ? "짜지 못했어요"
              : finished
                ? "다 짰어요"
                : stuck
                  ? "아직 짜는 중이에요"
                  : null}
          </p>
          <p className="text-caption text-ink-soft mt-1">
            {finished ? " " : `${Math.min(done + 1, names.length)} / ${names.length}`}
          </p>
          {/* 한참 그대로다 — 묻기를 쉬고, 다시 기다리거나 다시 짜는 길을 둔다 */}
          {stuck && (
            <p className="text-ink-soft mt-2 flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={resume}
                disabled={isRefetching}
                className="press text-signal-strong min-h-11 px-1 font-extrabold"
              >
                다시 불러오기
              </button>
              <NavLink
                href="/plan"
                className="press text-signal-strong inline-flex min-h-11 items-center px-1 font-extrabold"
              >
                다시 짜기
              </NavLink>
            </p>
          )}
          {/* 짜던 중에 다시 묻다 못 받았다 — 단계는 두고 그렇다고만. 말없이 돌기만 하면 멈춘 줄 모른다 */}
          {error && !finished && !stuck && (
            <p className="text-ink-soft mt-2 flex items-center gap-3 text-sm">
              불러오지 못했어요
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isRefetching}
                className="press text-signal-strong min-h-11 px-1 font-extrabold"
              >
                다시 불러오기
              </button>
            </p>
          )}
        </section>

        <ol className="card divide-rows py-1" aria-label="짜는 단계">
          {names.map((name, i) => {
            const step = byName.get(name);
            const state = step ? stateOf(step.status) : null;
            const ok = state === "passed";
            // 다 짠 뒤에 남은 단계는 돌지 않는다 — 서버가 단계를 끝에 한꺼번에 줄 때도 있다.
            // 못 받은 동안도 돌지 않는다 — 「불러오지 못했어요」 곁에서 「하는 중」 이 돌았다
            const running = state === "running" && !finished && !error && !stuck;
            return (
              <li key={name} className="flex items-start gap-3 py-3.5">
                {/* 마친 단계는 체크만, 못 한 단계는 「–」 만 — 둥근 면 안에 넣지 않는다. 아직인 단계는 빈 점 */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                    running && "border-signal-soft border-t-signal animate-spin border-[3px]",
                    !step && "bg-sub",
                  )}
                >
                  {ok && <Check className="text-signal size-5" strokeWidth={3.2} />}
                  {state === "failed" && (
                    <span className="text-ink-soft text-sm leading-none font-extrabold">–</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-extrabold", !step && "text-faint")}>
                    {i + 1}. {STEP_TITLE[name] ?? name}
                  </p>
                  {running && <p className="text-caption text-ink-soft mt-0.5">하는 중</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* 짜지 못했으면 멈춰 선 화면이 아니라 다시 짜는 길 */}
        {failedRun && (
          <NavLink
            href="/plan"
            className="press bg-signal-strong flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
          >
            다시 짜기
          </NavLink>
        )}
      </Stage>
    </>
  );
}
