"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Citations } from "@/components/domain/citations";
import { SessionList } from "@/components/domain/session-list";
import type { ProposalWithSessions } from "@/lib/api/types";
import {
  useApproveCoachRun,
  useCoachRun,
  useFamilyProfiles,
  useRejectCoachRun,
} from "@/lib/api/queries";
import { failureText } from "@/lib/coach";
import { errorMessage } from "@/lib/errors";
import { PHASE_LABEL, proposalSessions, totalMinutes } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * AI 편성 — 제안 · 근거 · 순서.
 *
 * **등록하기 전에는 미션이 아니다**(규칙 1). 이 화면에 「미션」 이라는 말이 없다 — 막대 제목이 「오늘 운동 제안」 이고,
 * 「오늘 운동으로 등록」 을 눌러야 아이 화면에 뜬다. 까닭 문장(`rationale`)은 내지 않는다(9/28 · 규칙 6).
 *
 * 근거(`citations`)는 접지 않고 늘 보인다(규칙 6). 거절도 한 가지 길이다 — 이유를 받는다.
 */
const REASONS = [
  "오늘은 시간이 없어요",
  "아이가 힘들어할 것 같아요",
  "다른 운동이 좋겠어요",
  "오늘은 쉬어요",
] as const;

export default function ProposalPage() {
  return (
    <ParentOnly>
      <Proposal />
    </ParentOnly>
  );
}

function Proposal() {
  const router = useRouter();
  const { runId } = useParams<{ runId: string }>();
  const { familyId } = useSession();
  const { data: run, isPending, error, refetch } = useCoachRun(runId);
  const { data: family } = useFamilyProfiles(familyId);
  const approve = useApproveCoachRun(runId, familyId ?? "");
  const reject = useRejectCoachRun(runId, familyId);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // 아직 짜는 중이면 과정 화면으로
  const running = run?.status === "RUNNING";
  useEffect(() => {
    if (running) router.replace(`/plan/run/${runId}`);
  }, [running, runId, router]);

  if (isPending || running) {
    return (
      <>
        <AppBar backHref="/parent" title="오늘 운동 제안" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-52 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }
  if (!run) {
    return (
      <>
        <AppBar backHref="/parent" title="오늘 운동 제안" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  const proposal = (run.proposals ?? [])[0] as ProposalWithSessions | undefined;
  const sessions = proposalSessions(proposal);
  const minutes = totalMinutes(sessions);
  const nameOf = (id: string | undefined) =>
    family?.profiles?.find((p) => p.profileId === id)?.name ?? "가족";
  const people = (proposal?.participants ?? []).map((p) => nameOf(p.profileId));
  const phases = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((p) => [p, sessions.filter((s) => s.phase === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${PHASE_LABEL[p].replace("운동", "")} ${n}`)
    .join(" · ");

  const approved = run.status === "APPROVED";
  const rejected = run.status === "REJECTED";
  // 짜다가 실패했으면 제안이 없다 — 실패를 말하고 다시 짜게
  const failed = run.status === "FAILED";
  // 등록은 서버가 된다고 할 때만(canApprove)
  const open = run.status === "AWAITING_APPROVAL" && run.canApprove !== false;
  const settled = approved || rejected;

  const register = async () => {
    setProblem(null);
    try {
      await approve.mutateAsync();
      router.push("/parent");
    } catch (e) {
      setProblem(
        errorMessage(
          e,
          {
            ALREADY_APPROVED: "이미 등록한 제안이에요.",
            NOT_A_PARENT: "보호자만 등록할 수 있어요.",
            CONSENT_REQUIRED: "보호자 동의가 필요해요.",
          },
          "등록하지 못했어요.",
        ),
      );
    }
  };

  return (
    <>
      <AppBar backHref="/parent" title="오늘 운동 제안" />
      <Stage wide className={cn("space-y-3", open && "pb-40")}>
        {failed ? (
          // 짜다가 실패했으면 제안이 없다 — 「0개 · 0분」 · 빈 근거 · 빈 순서를 세우지 않고 실패만 말한다
          <EmptyState
            scene="rest"
            title="제안을 짜지 못했어요"
            action={
              <>
                {/* 왜 못 짰는지 — 서버가 준 까닭 코드를 말로 */}
                <p className="text-ink-soft text-sm font-semibold">
                  {failureText(run.failureCode)}
                </p>
                <Link
                  href="/plan"
                  className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
                >
                  다시 짜기
                </Link>
              </>
            }
          />
        ) : (
          <>
            <section className="card-hero">
              {/* 등록 · 거절한 뒤에만 한마디. 등록 전은 막대 제목(「오늘 운동 제안」)이 말한다 — 「제안 · 아직 등록 전」 을 두지 않는다(9/28) */}
              {settled && (
                <p
                  className={cn(
                    "text-caption mb-2 font-extrabold",
                    approved ? "text-done" : "text-ink-soft",
                  )}
                >
                  {approved ? "등록했어요" : "안 하기로 했어요"}
                </p>
              )}
              {/* 서버가 지은 이름을 그대로 */}
              <h2 className="page-title">{proposal?.title ?? "오늘 운동"}</h2>
              <p className="text-caption text-ink-soft mt-1 font-semibold">
                {sessions.length}개 · {minutes}분{phases && ` · ${phases}`}
                {people.length > 0 && ` · ${people.join(" · ")}`}
              </p>
            </section>

            {/* AI 가 제안과 함께 준 알림 — 또래 자료가 없어 다른 연령대 자료 · 영상도 골랐다 등. 등록 전에 보고 정하게 */}
            {(run.notices ?? []).length > 0 && (
              <section className="card" aria-label="알려 드려요">
                <CardHead title="알려 드려요" />
                <ul className="mt-1 space-y-1.5">
                  {(run.notices ?? []).map((n) => (
                    <li key={n} className="text-ink-soft text-sm leading-relaxed">
                      {n}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card">
              <CardHead title="근거" meta="국민체력100" />
              <Citations items={proposal?.citations} className="mt-1" />
            </section>

            <section className="card">
              <CardHead title="순서" meta={`${minutes}분`} />
              <div className="mt-2">
                <SessionList sessions={sessions} />
              </div>
            </section>

            {/* 등록하면 제안 전부가 운동이 된다(서버가 한꺼번에 등록한다). 둘째부터도 근거 · 순서까지 다 보인다(규칙 6) — 까닭 문장은 없이 */}
            {(run.proposals ?? []).slice(1).map((p, i) => {
              const list = proposalSessions(p as ProposalWithSessions);
              return (
                <section key={`${p.title}-${i}`} className="card">
                  <CardHead
                    title={p.title ?? "같이 등록되는 운동"}
                    meta={[p.startDate, p.endDate && p.endDate !== p.startDate ? p.endDate : null]
                      .filter(Boolean)
                      .join(" ~ ")}
                  />
                  <Citations items={p.citations} className="mt-2" />
                  {list.length > 0 && (
                    <div className="mt-2">
                      <SessionList sessions={list} />
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}

        {settled && (
          <div className="grid gap-2">
            <Link
              href={approved ? "/parent" : "/plan"}
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              {approved ? "홈으로" : "다시 짜기"}
            </Link>
          </div>
        )}
      </Stage>

      {open && (
        <Dock>
          {problem && (
            <p role="alert" className="text-signal-deep mb-2 text-center text-sm font-semibold">
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={() => void register()}
            disabled={approve.isPending}
            className="press bg-signal-strong shadow-lift flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
          >
            {approve.isPending ? "등록하는 중" : "오늘 운동으로 등록"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/plan"
              className="press bg-paper shadow-card flex min-h-12 items-center justify-center rounded-2xl text-sm font-bold"
            >
              조건 바꿔 다시 짜기
            </Link>
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="press bg-paper shadow-card flex min-h-12 items-center justify-center rounded-2xl text-sm font-bold"
            >
              이번엔 안 할래요
            </button>
          </div>
        </Dock>
      )}

      {/* 거절도 한 가지 길이다. 이유를 받는다 — 다음 편성이 참고한다(규칙 1) */}
      <Sheet open={asking} onClose={() => setAsking(false)} title="왜 안 하기로 했나요?">
        <ul className="space-y-2">
          {REASONS.map((reason) => (
            <li key={reason}>
              <button
                type="button"
                disabled={reject.isPending}
                onClick={async () => {
                  try {
                    await reject.mutateAsync(reason);
                    setAsking(false);
                  } catch (e) {
                    setProblem(errorMessage(e, "처리하지 못했어요."));
                    setAsking(false);
                  }
                }}
                className="press bg-sub flex min-h-12 w-full items-center rounded-2xl px-4 text-left text-sm font-bold"
              >
                {reason}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
