"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { Citations } from "@/components/domain/citations";
import type { MissionSession, ProposalWithSessions } from "@/lib/api/types";
import {
  useApproveCoachRun,
  useCoachRun,
  useFamilyProfiles,
  useRejectCoachRun,
} from "@/lib/api/queries";
import { failureText } from "@/lib/coach";
import { errorMessage } from "@/lib/errors";
import { fromSessions } from "@/lib/routine";
import { PHASE_LABEL, proposalSessions, stepMinutes, totalMinutes } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { cn, withJosa } from "@/lib/utils";
import { exerciseLine, sessionHref } from "@/lib/videos";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * AI 운동 추천 — 오늘 운동 제안.
 *
 * **등록하기 전에는 미션이 아니다**(규칙 1). 이 화면에 「미션」 이라는 말이 없다 — 막대 제목이 「오늘 운동 제안」 이고,
 * 「오늘 운동으로 등록」 을 눌러야 아이 화면에 뜬다. 까닭 문장(`rationale`)은 내지 않는다(9/28).
 *
 * 아이가 운동을 시작하는 화면처럼 동작 목록이 중심이다(10/1). 근거(`citations`)는 맨 아래
 * 「추천 근거 보기」 하나로 접는다. 「루틴으로 저장」 은 동작을 담은 채로 직접 만들기를 열어 요일을 고르게 한다.
 * 거절도 한 가지 길이다 — 이유를 받는다.
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
  // 「루틴으로 저장」 이 담은 동작을 바꾸기 전에 탭 저장소를 읽어 둔다 — 뒤늦게 읽으면 덮어쓴다
  const routineReady = useRoutineReady();
  const fill = useRoutineStore((s) => s.fill);

  // 아직 만드는 중이면 과정 화면으로
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
  // 첫 참여자가 추천 대상이다(서버가 대상을 맨 앞에 둔다). 다시 만들기도 그 사람으로 연다
  const subjectId = proposal?.participants?.[0]?.profileId;
  const replanHref = subjectId ? `/plan?profileId=${encodeURIComponent(subjectId)}` : "/plan";
  // 보호자 본인의 운동이면 보호자 홈(고른 아이의 운동만 보인다) 대신 「시작하기」 가 있는 운동 탭으로
  const forParent =
    (proposal?.participants ?? []).length > 0 &&
    !(proposal?.participants ?? []).some((p) => p.role === "CHILD");
  const phases = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((p) => [p, sessions.filter((s) => s.phase === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${PHASE_LABEL[p].replace("운동", "")} ${n}`)
    .join(", ");

  const approved = run.status === "APPROVED";
  const rejected = run.status === "REJECTED";
  // 짜다가 실패했으면 제안이 없다 — 실패를 말하고 다시 짜게
  const failed = run.status === "FAILED";
  // 등록은 서버가 된다고 할 때만(canApprove)
  const open = run.status === "AWAITING_APPROVAL" && run.canApprove !== false;
  const settled = approved || rejected;

  // 추천받은 동작을 담은 채로 직접 만들기를 연다. 거기서 요일을 고르고 저장한다
  const moves = fromSessions(sessions);
  const canSave = routineReady && moves.length > 0;
  const saveRoutine = () => {
    if (!canSave) return;
    fill(moves);
    router.push("/plan/custom");
  };

  const register = async () => {
    setProblem(null);
    try {
      await approve.mutateAsync();
      router.push(forParent ? "/parent/workout" : "/parent");
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
            // 왜 못 짰는지. 서버가 준 까닭 코드를 말로
            description={failureText(run.failureCode)}
            action={
              <Link
                href="/plan"
                className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
              >
                다시 만들기
              </Link>
            }
          />
        ) : (
          <>
            {/* 아이 홈의 오늘 운동 카드처럼 — 몇 개, 몇 분이 먼저 */}
            <section className="bg-signal-strong shadow-lift rounded-3xl p-5 text-white">
              {/* 등록 · 거절한 뒤에만 한마디. 등록 전은 막대 제목(「오늘 운동 제안」)이 말한다(9/28) */}
              <p className="text-caption font-bold text-white">
                {approved ? "등록했어요" : rejected ? "안 하기로 했어요" : "AI 운동 추천"}
              </p>
              {/* 서버가 지은 이름을 그대로 */}
              <h2 className="text-lead mt-1 leading-snug font-extrabold">
                {proposal?.title ?? "오늘 운동"}
              </h2>
              <p className="text-metric mt-2 leading-tight font-extrabold">
                {sessions.length}개, {minutes}분
              </p>
              <p className="text-caption mt-1 font-semibold text-white">
                {phases}
                {people.length > 0 && `. ${withJosa(people.join(", "), "이가")} 해요`}
              </p>
              {/* AI 가 제안과 함께 준 알림 — 또래 자료가 없어 다른 연령대 자료를 골랐다 등. 등록 전에 보고 정하게 */}
              {(run.notices ?? []).map((n) => (
                <p key={n} className="text-caption mt-2 font-semibold text-white/90">
                  {n}
                </p>
              ))}
            </section>

            {/* 아이가 운동을 시작하는 화면처럼 — 하는 차례대로 썸네일, 이름, 시간 */}
            <MoveList sessions={sessions} />

            {/* 등록하면 제안 전부가 운동이 된다(서버가 한꺼번에 등록한다) */}
            {(run.proposals ?? []).slice(1).map((p, i) => {
              const list = proposalSessions(p as ProposalWithSessions);
              return (
                <section key={`${p.title}-${i}`} className="space-y-2">
                  <CardHead
                    title={p.title ?? "같이 등록되는 운동"}
                    meta={[p.startDate, p.endDate && p.endDate !== p.startDate ? p.endDate : null]
                      .filter(Boolean)
                      .join(" ~ ")}
                  />
                  {list.length > 0 && <MoveList sessions={list} />}
                </section>
              );
            })}

            {/* 근거는 맨 아래 하나로 접는다. 펼치면 국민체력100 처방 인용 */}
            <details className="card group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-extrabold [&::-webkit-details-marker]:hidden">
                추천 근거 보기
                <ChevronDown
                  aria-hidden
                  className="text-ink-soft size-5 transition-transform group-open:rotate-180"
                />
              </summary>
              {(run.proposals ?? []).map((p, i) => (
                <div key={`${p.title}-${i}`} className="mt-2">
                  {(run.proposals ?? []).length > 1 && (
                    <p className="text-caption text-ink-soft font-extrabold">{p.title}</p>
                  )}
                  <Citations items={p.citations} className="mt-1" />
                </div>
              ))}
            </details>

            {open && (
              <Link
                href={replanHref}
                className="press text-ink-soft flex min-h-11 items-center justify-center text-sm font-bold"
              >
                조건 바꿔 다시 만들기
              </Link>
            )}
          </>
        )}

        {settled && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={approved ? "/parent" : replanHref}
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              {approved ? "홈으로" : "다시 만들기"}
            </Link>
            <button
              type="button"
              onClick={saveRoutine}
              disabled={!canSave}
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold disabled:opacity-40"
            >
              루틴으로 저장
            </button>
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
            {/* 오늘 하루만이 아니라 요일을 골라 되풀이하게 — 직접 만들기의 저장 흐름을 그대로 쓴다 */}
            <button
              type="button"
              onClick={saveRoutine}
              disabled={!canSave}
              className="press bg-paper shadow-card flex min-h-12 items-center justify-center rounded-2xl text-sm font-bold disabled:opacity-40"
            >
              루틴으로 저장
            </button>
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

/**
 * 하는 차례대로 동작 목록. 아이가 운동을 시작하는 화면(`mission-play.tsx` 의 칸)과 같은 모양이다:
 * 왼쪽에 차례 동그라미와 이어진 길, 카드에 썸네일, 이름, 단계와 시간
 */
function MoveList({ sessions }: { sessions: MissionSession[] }) {
  return (
    <ol className="relative" aria-label="운동 순서">
      {sessions.map((s, i) => (
        <li key={s.position} className="relative pb-3 pl-11">
          {i < sessions.length - 1 && (
            <span
              aria-hidden
              className="bg-bar absolute top-9 bottom-0 left-[15px] w-0.5 rounded-full"
            />
          )}
          <span
            aria-hidden
            className="bg-ground text-ink-soft absolute top-4 left-0 grid size-8 place-items-center rounded-full text-sm font-extrabold"
          >
            {i + 1}
          </span>
          <MoveRow href={sessionHref(s)}>
            {s.clip?.videoId ? (
              <VideoThumb
                videoId={s.clip.videoId}
                src={s.clip.thumbnailUrl}
                className="aspect-video w-24 shrink-0 rounded-xl"
              />
            ) : (
              <span aria-hidden className="bg-sub aspect-video w-24 shrink-0 rounded-xl" />
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-extrabold">{s.title}</span>
              <span className="text-caption text-ink-soft mt-0.5 block truncate">
                {exerciseLine(s)}
              </span>
              <span className="text-caption text-ink-soft block">
                {PHASE_LABEL[s.phase]} {stepMinutes(s)}분
              </span>
            </span>
          </MoveRow>
        </li>
      ))}
    </ol>
  );
}

/** 동작 카드 하나. 영상이 있으면 누르면 운동 상세(영상과 설명)로 */
function MoveRow({ href, children }: { href: string | undefined; children: ReactNode }) {
  const card = "card flex items-center gap-3";
  return href ? (
    <Link href={href} className={cn("press", card)}>
      {children}
    </Link>
  ) : (
    <div className={card}>{children}</div>
  );
}
