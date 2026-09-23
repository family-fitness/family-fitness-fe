"use client";

import { Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { NavLink } from "@/components/ui/nav-link";
import { Backdrop } from "@/components/ui/backdrop";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { DoneCard } from "@/components/domain/done-card";
import { SessionRunner } from "@/components/domain/session-runner";
import { warmUpSprites } from "@/components/scene/sprite-field";
import { useMissions, useVideos } from "@/lib/api/queries";
import type { MissionSession, MissionWithSessions } from "@/lib/api/types";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { videoArt } from "@/lib/video-label";
import { PHASE_LABEL, clipRange, nextSession, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { cn } from "@/lib/utils";

/**
 * 오늘의 미션 — 준비 · 본 · 정리.
 *
 * 하루치가 영상 한 편이 아니라 **세 조각**이다. 국민체력100 운동처방이 그렇게
 * 나뉘어 있고, 영상 한 편 안에 셋이 다 들어 있다.
 *
 * 세션이 안 오면 본운동 한 칸만 그린다 — 준비·정리를 프론트가 지어내면
 * 코치가 짜지 않은 운동을 아이에게 시키는 게 된다(`session-plan.ts`).
 *
 * 추천 영상(`video-<id>`)으로 들어와도 같은 화면을 쓴다. 세션 하나짜리 미션이다.
 */
export default function MissionPage() {
  const router = useRouter();
  const { missionId } = useParams<{ missionId: string }>();
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);

  // 여기까지 왔으면 곧 축하 화면이 뜬다. 연출을 미리 받아 둔다
  useEffect(warmUpSprites, []);

  const fromVideo = missionId.startsWith("video-");
  const videoId = fromVideo ? missionId.slice("video-".length) : null;

  const { data: missions, isPending: missionPending } = useMissions(familyId, { scope: "ALL" });
  const { data: videos, isPending: videoPending } = useVideos({ list: "ALL" });

  const mission = fromVideo
    ? undefined
    : (missions?.missions?.find((m) => m.missionId === missionId) as
        MissionWithSessions | undefined);
  const suggested = fromVideo ? videos?.videos?.find((v) => v.videoId === videoId) : undefined;

  /** 방금 이 화면에서 끝낸 세션들. 서버가 세션을 아직 모른다 — 8.2 */
  const [justDone, setJustDone] = useState<number[]>([]);
  const [running, setRunning] = useState<MissionSession | null>(null);
  const [finished, setFinished] = useState(false);
  const [note, setNote] = useState<string | undefined>();

  if (missionPending || videoPending) return <MissionSkeleton />;

  if (!mission && !suggested) {
    return (
      <>
        <AppBar back title="운동하기" />
        <Stage wide>
          <EmptyState
            scene="no-video"
            title="운동을 찾지 못했어요"
            description="앞 화면으로 돌아가서 다시 골라 주세요."
          />
        </Stage>
      </>
    );
  }

  const base = mission
    ? sessionsOf(mission)
    : [
        {
          position: 1,
          phase: "MAIN" as const,
          title: suggested?.title ?? "오늘의 운동",
          factor: suggested?.label?.factors?.[0] ?? null,
          minutes: suggested?.durationSec ? Math.round(suggested.durationSec / 60) : null,
          clip: suggested
            ? {
                videoId: suggested.videoId ?? "",
                startSec: null,
                endSec: null,
                title: suggested.title,
                url: suggested.url,
              }
            : null,
          completed: false,
          verifiedBy: null,
        },
      ];

  /* 방금 끝낸 것을 얹는다. 서버가 세션 단위를 알기 전까지 화면이 들고 있는다 */
  const sessions = base.map((s) => (justDone.includes(s.position) ? { ...s, completed: true } : s));
  const title = mission?.title ?? suggested?.title ?? "오늘의 운동";
  const next = nextSession(sessions);
  const minutes = totalMinutes(sessions);

  /* ─── 다 했을 때 ─────────────────────────────────────────── */
  if (finished) {
    return (
      <>
        <AppBar back title="다 했어요" />
        <Stage wide className="relative">
          <Backdrop name="bg/bg-confetti" />
          <DoneCard
            familyId={familyId ?? ""}
            childProfileId={childProfileId ?? ""}
            missionId={mission?.missionId}
            title={title}
            note={note}
            onHome={() => router.replace("/kid")}
          />
        </Stage>
      </>
    );
  }

  /* ─── 세션 하나 하는 중 ──────────────────────────────────── */
  if (running) {
    return (
      <SessionRunner
        session={running}
        missionId={mission?.missionId}
        familyId={familyId ?? ""}
        childProfileId={childProfileId ?? ""}
        onBack={() => setRunning(null)}
        onDone={(gotNote) => {
          setNote(gotNote);
          setJustDone((v) => (v.includes(running.position) ? v : [...v, running.position]));
          setRunning(null);
          // 마지막 세션이었으면 바로 축하로
          const left = sessions.filter(
            (s) => !s.completed && s.position !== running.position,
          ).length;
          if (left === 0) setFinished(true);
        }}
      />
    );
  }

  /* ─── 세션 목록 ──────────────────────────────────────────── */
  return (
    <>
      <AppBar back title={title} />
      <Stage wide className="space-y-5">
        <div>
          <h2 className="text-[1.4rem] leading-snug font-extrabold">
            {sessions.length > 1 ? `${sessions.length}개만 하면 끝이에요` : "오늘은 이거 하나예요"}
          </h2>
          {minutes > 0 && (
            <p className="text-ink-soft mt-1 text-sm">
              {sessions.map((s) => `${PHASE_LABEL[s.phase]} ${s.minutes ?? 0}분`).join(" · ")}
            </p>
          )}
        </div>

        <ul className="divide-rows">
          {sessions.map((s) => {
            const range = clipRange(s.clip);
            return (
              <li key={s.position} className="flex items-center gap-3 py-3.5">
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl",
                    s.completed ? "bg-done-soft" : "bg-signal-soft",
                  )}
                >
                  {s.completed ? (
                    <Check className="text-done size-6" strokeWidth={3} aria-hidden />
                  ) : (
                    <Illustration
                      name={videoArt({ label: { factors: s.factor ? [s.factor] : [] } })}
                      fallback="item/item-shoes"
                      size={28}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-body block leading-snug font-bold">{s.title}</span>
                  <span className="text-faint text-caption mt-0.5 block">
                    {PHASE_LABEL[s.phase]}
                    {s.completed && " · 다 했어요"}
                    {!s.completed && range && ` · ${range}`}
                  </span>
                </span>
                {s.minutes != null && (
                  <span className="text-ink-soft shrink-0 text-sm font-bold">{s.minutes}분</span>
                )}
              </li>
            );
          })}
        </ul>

        {next ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRunning(next)}
              className="press bg-signal-strong w-full rounded-2xl py-5 text-xl font-extrabold text-white"
            >
              {PHASE_LABEL[next.phase]} 시작
            </button>
            <NavLink
              href={`/kid/m/${missionId}/swap`}
              className="press border-line block w-full rounded-2xl border-2 py-3.5 text-center text-base font-extrabold"
            >
              이거 말고 다른 거
            </NavLink>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="press bg-signal-strong w-full rounded-2xl py-5 text-xl font-extrabold text-white"
          >
            다 했어요!
          </button>
        )}

        {/* 하나만 해도 남는다. 다 못 채운 날을 실패로 만들지 않는다 */}
        <p className="text-faint text-caption text-center">하나만 해도 기록에 남아요</p>
      </Stage>
    </>
  );
}

function MissionSkeleton() {
  return (
    <>
      <AppBar back title="운동하기" />
      <Stage wide className="space-y-5">
        <Skeleton className="h-8 w-52" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
        <Skeleton className="h-16 w-full rounded-2xl" />
      </Stage>
    </>
  );
}
