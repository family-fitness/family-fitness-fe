"use client";

import { Check, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Ring } from "@/components/ui/ring";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { ClipPlayer } from "@/components/domain/clip-player";
import { Confetti } from "@/components/scene/confetti";
import { KiumIsland } from "@/components/scene/kium-island";
import { StoneTrail } from "@/components/scene/stone-trail";
import { XpGauge } from "@/components/domain/xp-gauge";
import type { MissionSession } from "@/lib/api/types";
import {
  useCompleteSession,
  useFamilyProfiles,
  useMissions,
  useProgress,
  useSendCheer,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { stageOf } from "@/lib/levels";
import { newlyUnlocked } from "@/lib/unlocks";
import { PHASE_LABEL, clock, sessionsOf } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useVoice } from "@/lib/voice";
import { usePrefsStore } from "@/stores/prefs-store";
import { useRoleStore } from "@/stores/role-store";

/**
 * 오늘 운동 — 한 칸씩 아래로.
 *
 * 받은 순서대로 칸이 세로로 이어지고, 왼쪽 선이 길이다(「아래로 향하는 길라잡이」).
 * **지금 칸만 펼친다.** 시범 영상과 타이머가 있고, 시작을 누르면 둘이 같이 돈다.
 * 잡힌 시간이 다 되면 조각이 한 번 터지고, 화면이 다음 칸으로 내려가 10초 쉰 뒤
 * 다음 칸이 시작된다(쉬는 시간은 「+10초」 · 「바로 시작」). 화면을 떠나면(잠금 · 다른 앱) 멈춘다. 영상은 지금 칸 하나만 띄운다 —
 * 여섯 개를 한꺼번에 띄우면 폰이 버벅인다.
 *
 * 소리 안내가 켜져 있으면 말로도 알려 준다 — 「스쿼트 시작!」 「10초 남았어요」 「셋 · 둘 · 하나」
 * 「잘했어요, 다음은 …」(나이키 트레이닝 클럽 · 삼성헬스 운동 코칭). 화면을 안 봐도 따라 할 수 있게.
 *
 * 기록은 `TIMER` 다. 우리가 잰 시간이지 영상 완주가 아니다(규칙 2).
 * 이 화면에 「미션」 이라는 말은 없다 — 아이에게는 「오늘 운동」 이다.
 */

/** 한 칸을 끝내고 다음 칸이 시작되기까지 — 자세를 바꾸고 숨 고를 만큼 */
const REST_SEC = 10;
/** 쉬는 시간 한 번 늘리기 */
const REST_MORE = 10;
/** 말로 셀 때 — 남은 초 */
const COUNT_WORDS: Record<number, string> = { 3: "셋", 2: "둘", 1: "하나" };

type Status = "idle" | "running" | "paused" | "rest" | "blocked" | "ended";

/** 한 칸을 끝냈다고 서버에 보내는 것 — 못 보냈으면 들고 있다가 다시 보낸다 */
interface StepDone {
  position: number;
  profileId: string;
  activeSeconds: number;
  startedAt: string;
  endedAt: string;
}

/** 칸마다 잡힌 초. 0분으로 온 칸이 첫 틱에 끝나지 않게 1분부터 */
const plannedSecOf = (s: MissionSession | undefined) => Math.max(1, s?.minutes ?? 1) * 60;

export default function PlayPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const {
    familyId,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  const kidId = useRoleStore((s) => s.childProfileId) ?? "";
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const {
    data: missions,
    isLoading,
    error: missionsError,
    refetch,
  } = useMissions(familyId, { scope: "ALL" });
  const { data: progress, isLoading: progressLoading } = useProgress(kidId || undefined);
  const complete = useCompleteSession(missionId, familyId ?? "");

  const mission = missions?.missions?.find((m) => m.missionId === missionId);

  /** 이 화면에서 방금 끝낸 칸. 서버 응답을 기다리지 않고 바로 체크한다 */
  const [doneHere, setDoneHere] = useState<number[]>([]);
  /** 보내는 중인 칸 수 · 못 보낸 칸. 다 보내기 전에는 「다 했어요」 를 띄우지 않는다 — 저장이 안 됐는데 알리면 부모는 빈 기록을 본다 */
  const [saving, setSaving] = useState(0);
  const [unsaved, setUnsaved] = useState<StepDone[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  /** 이번 쉬는 시간 전체(늘리면 같이 는다). 링이 이 만큼을 한 바퀴로 그린다 */
  const [restTotal, setRestTotal] = useState(REST_SEC);
  const voiceOn = usePrefsStore((s) => s.voice);
  const setVoiceOn = usePrefsStore((s) => s.setVoice);
  const { say } = useVoice(voiceOn);
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState(0);
  const startedAt = useRef<string | null>(null);
  /** 시작할 때의 레벨. 끝나고 올랐는지 견준다 */
  const [levelBefore, setLevelBefore] = useState<number | null>(null);
  /**
   * 자동 재생이 막혀 멈춘 칸. **한 칸에 한 번만** 멈춘다 — 아이가 눌러서 다시 시작했는데도
   * 영상이 안 돌면(유튜브가 막힌 곳 등) 영상 없이 타이머만 간다. 또 멈추면 끝없이 멈춘다.
   */
  const [blockedAt, setBlockedAt] = useState<number | null>(null);

  // 곧 조각이 터진다. three 를 한가한 틈에 미리 받아 둔다
  useEffect(() => {
    const pull = () => void import("three").catch(() => {});
    const id = setTimeout(pull, 1200);
    return () => clearTimeout(id);
  }, []);

  const sessions: MissionSession[] = mission
    ? sessionsOf(mission, kidId).map((s) =>
        doneHere.includes(s.position) ? { ...s, completed: true, verifiedBy: "TIMER" } : s,
      )
    : [];
  const firstOpen = sessions.find((s) => !s.completed)?.position ?? null;
  const active = status === "ended" ? null : (current ?? firstOpen);
  const activeSession = sessions.find((s) => s.position === active);
  const activeIndex = sessions.findIndex((s) => s.position === active);
  const plannedSec = plannedSecOf(activeSession);
  const doneCount = sessions.filter((s) => s.completed).length;
  const allDone = sessions.length > 0 && doneCount === sessions.length;
  const finished = allDone || status === "ended";

  /** 다음에 할 칸. 지금 칸 뒤에서 먼저 찾고, 없으면 앞에 남은 칸 */
  const nextOpen = (after: number, done: number[]) => {
    const open = (x: MissionSession) => !x.completed && !done.includes(x.position);
    return (
      sessions.find((x) => x.position > after && open(x))?.position ??
      sessions.find((x) => open(x) && x.position !== after)?.position ??
      null
    );
  };

  /** 서버에 보낸다. 못 보내면 들고 있다가 「다시 보내기」 로 */
  const save = (step: StepDone) => {
    setSaving((n) => n + 1);
    complete.mutate(step, {
      onSuccess: (res) => setXp((x) => x + (res.xpGained ?? 0)),
      onError: (e) => {
        setUnsaved((list) => [...list, step]);
        setSaveError(
          errorMessage(
            e,
            {
              CONSENT_REQUIRED: "지금은 기록을 남길 수 없어요.",
              CONSENT_WITHDRAWN: "지금은 기록을 남길 수 없어요.",
            },
            "기록을 남기지 못했어요.",
          ),
        );
      },
      onSettled: () => setSaving((n) => n - 1),
    });
  };
  const retry = () => {
    const list = unsaved;
    setUnsaved([]);
    setSaveError(null);
    list.forEach(save);
  };

  /** 한 칸 끝. 조각을 터뜨리고 서버에 알리고, 다음 칸이 있으면 10초 쉰다 */
  const finishStep = useEffectEvent((position: number, seconds: number) => {
    const done = [...doneHere, position];
    setDoneHere(done);
    setBurst((b) => b + 1);
    save({
      position,
      profileId: kidId,
      activeSeconds: Math.round(seconds),
      startedAt: startedAt.current ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
    });
    const next = nextOpen(position, done);
    if (next == null) {
      say("다 했어요! 최고예요");
      setStatus("idle");
      return;
    }
    const nextTitle = sessions.find((x) => x.position === next)?.title;
    say(nextTitle ? `잘했어요! 쉬었다가, 다음은 ${nextTitle}` : "잘했어요!");
    // 다음 칸을 바로 펼치고 그리로 내려간다. 쉬고 나서 시작한다
    setCurrent(next);
    setElapsed(0);
    setRestLeft(REST_SEC);
    setRestTotal(REST_SEC);
    setStatus("rest");
  });

  /** 타이머 한 번 — 잡힌 시간이 다 되면 그 칸을 끝낸다 */
  const tick = useEffectEvent((delta: number) => {
    if (active == null) return;
    const next = elapsed + delta;
    setElapsed(next);
    // 남은 시간이 그 자리를 지나는 순간에 한 번씩 말한다
    const before = plannedSec - elapsed;
    const after = plannedSec - next;
    if (plannedSec > 20 && before > 10 && after <= 10) say("10초 남았어요");
    for (const [sec, word] of Object.entries(COUNT_WORDS)) {
      if (before > Number(sec) && after <= Number(sec)) say(word);
    }
    if (next >= plannedSec) finishStep(active, next);
  });

  /** 쉬는 동안 한 번(1초) — 다 세면 펼쳐 둔 다음 칸을 시작한다 */
  const restTick = useEffectEvent(() => {
    if (restLeft > 1) {
      const word = COUNT_WORDS[restLeft - 1];
      if (word) say(word);
      setRestLeft(restLeft - 1);
      return;
    }
    setRestLeft(0);
    startedAt.current = new Date().toISOString();
    if (activeSession) say(`${activeSession.title} 시작!`);
    setStatus("running");
  });

  // 타이머. 도는 동안만. 한 번에 1초 넘게 세지 않는다 — 폰이 잠겨 타이머가 늦게 깨도
  // 그동안을 한 것으로 치지 않는다(타이머로 확인됨 · 규칙 2)
  useEffect(() => {
    if (status !== "running") return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      tick(Math.min(1, (now - last) / 1000));
      last = now;
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  // 화면을 떠나면(잠금 · 다른 앱) 멈춘다 — 아무도 안 보는 사이에 칸이 끝나고 다음 칸이 저절로 시작되지 않게
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      setStatus((s) => (s === "running" || s === "rest" ? "paused" : s));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // 쉬는 동안
  useEffect(() => {
    if (status !== "rest") return;
    const id = setInterval(() => restTick(), 1000);
    return () => clearInterval(id);
  }, [status]);

  // 지금 칸이 바뀌면 그 칸으로 내려간다
  const firstScroll = useRef(true);
  useEffect(() => {
    if (active == null) return;
    const el = document.getElementById(`step-${active}`);
    if (!el) return;
    // 처음 들어올 때는 바로, 다음 칸으로 넘어갈 때는 부드럽게
    el.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth", block: "start" });
    firstScroll.current = false;
  }, [active]);

  // 다 끝나면 끝 칸으로
  useEffect(() => {
    if (!finished) return;
    document.getElementById("step-end")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [finished]);

  if (sessionPending || isLoading) return <PlaySkeleton />;
  const failure = sessionError ?? missionsError;
  if (failure) {
    return (
      <>
        <AppBar backHref="/kid" title="오늘 운동" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
          />
        </Stage>
      </>
    );
  }

  if (!mission || sessions.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="오늘 운동" />
        <Stage wide>
          <EmptyState scene="no-mission" title="운동을 찾지 못했어요" />
        </Stage>
      </>
    );
  }

  const totalMin = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const doneMin = sessions.filter((s) => s.completed).reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const start = () => {
    if (active == null) return;
    if (levelBefore == null && progress) setLevelBefore(progress.level);
    if (status === "idle" || status === "rest" || status === "blocked") {
      if (activeSession) say(`${activeSession.title} 시작!`);
    }
    if (current == null) setCurrent(active);
    // 쉬다가 멈춘 칸(화면을 떠났다 온 것)도 처음부터 — 시작 시각을 새로 적는다
    if (status === "idle" || status === "rest" || (status === "paused" && elapsed === 0)) {
      setElapsed(0);
      setRestLeft(0);
      startedAt.current = new Date().toISOString();
    }
    setStatus("running");
  };

  const skip = () => {
    if (active == null) return;
    const next = nextOpen(active, doneHere);
    setCurrent(next);
    setElapsed(0);
    setStatus(next == null ? "ended" : "idle");
  };

  return (
    <>
      <AppBar backHref="/kid" title="오늘 운동" />
      <Confetti fire={burst} pieces={allDone ? 120 : 50} from={allDone ? "top" : "bottom"} />

      {/* 위에 붙는 징검다리. 몇 칸째인지 늘 보이고, 한 칸 끝내면 키움이가 건너간다 */}
      <div className="bg-ground sticky top-14 z-20 px-4 pb-2">
        {/* 레벨을 받은 뒤에 짓는다 — 1단계로 지었다가 받고 나서 다시 지으면 깜빡이고 WebGL 이 하나 더 든다 */}
        {progressLoading ? (
          <Skeleton className="h-[72px] w-full rounded-2xl" />
        ) : (
          <StoneTrail
            count={sessions.length}
            done={sessions.flatMap((s, i) => (s.completed ? [i] : []))}
            current={activeIndex >= 0 ? activeIndex : null}
            stage={stageOf(progress?.level).stage}
            height={72}
            label={`${sessions.length}칸 중 ${doneCount}칸 건넜어요`}
          />
        )}
        <div className="relative flex items-center justify-center">
          <p className="text-caption text-ink-soft text-center font-bold">
            {doneCount} / {sessions.length}칸 · {totalMin}분 중 {doneMin}분
          </p>
          <button
            type="button"
            onClick={() => setVoiceOn(!voiceOn)}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "소리 안내 끄기" : "소리 안내 켜기"}
            className="press text-ink-soft absolute right-0 grid size-10 place-items-center rounded-full"
          >
            {voiceOn ? (
              <Volume2 aria-hidden className="size-5" />
            ) : (
              <VolumeX aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </div>

      <Stage wide className="pt-1">
        <ol className="relative">
          {sessions.map((s, i) => (
            <Step
              key={s.position}
              session={s}
              index={i}
              last={i === sessions.length - 1}
              active={s.position === active}
              status={s.position === active ? status : "idle"}
              elapsed={s.position === active ? elapsed : 0}
              restLeft={restLeft}
              restTotal={restTotal}
              onMoreRest={() => {
                setRestLeft((r) => r + REST_MORE);
                setRestTotal((t) => t + REST_MORE);
              }}
              onStart={start}
              onPause={() => setStatus("paused")}
              onSkip={skip}
              onBlocked={() => {
                if (blockedAt === s.position) return;
                setBlockedAt(s.position);
                setStatus("blocked");
              }}
              onPick={() => {
                if (s.completed || status === "running") return;
                setCurrent(s.position);
                setElapsed(0);
                setStatus("idle");
              }}
            />
          ))}

          <li id="step-end" className="scroll-mt-40 pt-2 pb-6">
            {unsaved.length > 0 ? (
              // 못 보낸 칸이 있으면 「다 했어요」 · 「알리기」 를 띄우지 않는다 — 부모가 빈 기록을 보게 된다
              <section className="card-hero text-center" role="alert">
                <p className="text-lead font-extrabold">{saveError ?? "기록을 남기지 못했어요."}</p>
                <button
                  type="button"
                  onClick={retry}
                  disabled={saving > 0}
                  className="press bg-signal-strong mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
                >
                  다시 보내기
                </button>
              </section>
            ) : finished && saving > 0 ? (
              <Skeleton className="h-80 w-full rounded-3xl" />
            ) : finished ? (
              <Finish
                allDone={allDone}
                doneCount={doneCount}
                minutes={doneMin}
                xp={xp}
                levelBefore={levelBefore}
                fresh={doneHere.length > 0}
                familyId={familyId ?? ""}
                kidId={kidId}
                missionId={missionId}
              />
            ) : (
              // 한 칸이라도 끝낸 뒤에만 — 시작도 안 하고 누르면 「0개 했어요」 를 알리게 된다
              doneCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatus("ended")}
                  className="press text-ink-soft mx-auto flex min-h-11 items-center px-4 text-sm font-bold"
                >
                  여기까지 할래요
                </button>
              )
            )}
          </li>
        </ol>
      </Stage>
    </>
  );
}

/** 한 칸. 지금 칸만 펼친다 */
function Step({
  session: s,
  index,
  last,
  active,
  status,
  elapsed,
  restLeft,
  restTotal,
  onMoreRest,
  onStart,
  onPause,
  onSkip,
  onBlocked,
  onPick,
}: {
  session: MissionSession;
  index: number;
  last: boolean;
  active: boolean;
  status: Status;
  elapsed: number;
  restLeft: number;
  restTotal: number;
  onMoreRest: () => void;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBlocked: () => void;
  onPick: () => void;
}) {
  const planned = plannedSecOf(s);
  const left = Math.max(0, planned - elapsed);
  const clip = s.clip;

  return (
    <li id={`step-${s.position}`} className="relative scroll-mt-40 pb-3 pl-11">
      {/* 길. 끝낸 칸까지는 파랑, 그 아래는 회색 */}
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-9 bottom-0 left-[15px] w-0.5 rounded-full",
            s.completed ? "bg-signal" : "bg-bar",
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-4 left-0 grid size-8 place-items-center rounded-full text-sm font-extrabold",
          s.completed && "bg-signal text-white",
          !s.completed && active && "bg-paper ring-signal text-signal-deep ring-2",
          !s.completed && !active && "bg-paper text-ink-soft shadow-card",
        )}
      >
        {s.completed ? <Check className="size-4" strokeWidth={3.2} /> : index + 1}
      </span>

      {active && !s.completed ? (
        <section className="card-hero" aria-label={`${index + 1}번째 운동 ${s.title}`}>
          <p className="text-caption text-signal-deep font-extrabold">{PHASE_LABEL[s.phase]}</p>
          <h2 className="text-lead mt-0.5 font-extrabold">{s.title}</h2>

          <div className="mt-3">
            {clip?.videoId ? (
              <ClipPlayer
                videoId={clip.videoId}
                startSec={clip.startSec ?? 0}
                endSec={clip.endSec ?? null}
                playing={status === "running"}
                title={s.title}
                onBlocked={onBlocked}
              />
            ) : (
              <div className="bg-sub grid aspect-video place-content-center rounded-2xl px-6 text-center">
                <p className="text-sm font-extrabold">영상 없이 따라 해요</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Ring
              value={status === "rest" ? restTotal - restLeft : elapsed}
              max={status === "rest" ? restTotal : planned}
              size={112}
              stroke={10}
              label={status === "rest" ? `${restLeft}초 뒤에 시작해요` : `${clock(left)} 남았어요`}
            >
              {status === "rest" ? (
                <span className="text-center leading-none">
                  <span className="text-metric-lg block font-extrabold">{restLeft}</span>
                  <span className="text-micro text-ink-soft font-bold">쉬어요 · 곧 시작</span>
                </span>
              ) : (
                <span className="text-center leading-none">
                  <span className="text-metric block font-extrabold tabular-nums">
                    {clock(left)}
                  </span>
                  <span className="text-micro text-ink-soft font-bold">남았어요</span>
                </span>
              )}
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{s.minutes ?? 1}분 동안 따라 해요</p>
              {status === "rest" && (
                <button
                  type="button"
                  onClick={onMoreRest}
                  className="press bg-sub mt-2 inline-flex min-h-10 items-center rounded-full px-4 text-sm font-extrabold"
                >
                  +{REST_MORE}초 더 쉬기
                </button>
              )}
            </div>
          </div>

          {status === "blocked" ? (
            <button
              type="button"
              onClick={onStart}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
            >
              <Play aria-hidden className="size-5 fill-current" />
              눌러서 시작
            </button>
          ) : status === "running" ? (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onPause}
                className="press bg-sub flex min-h-14 items-center justify-center gap-2 rounded-2xl text-lg font-extrabold"
              >
                <Pause aria-hidden className="size-5 fill-current" />
                잠깐 멈춤
              </button>
              <button
                type="button"
                onClick={onSkip}
                aria-label="이 운동 건너뛰기"
                className="press bg-sub grid min-h-14 min-w-14 place-items-center rounded-2xl"
              >
                <SkipForward aria-hidden className="size-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
            >
              <Play aria-hidden className="size-5 fill-current" />
              {status === "paused" ? "이어서 하기" : status === "rest" ? "바로 시작" : "시작하기"}
            </button>
          )}
        </section>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={s.completed}
          className={cn(
            "card press flex w-full items-center gap-3 text-left",
            s.completed && "opacity-70",
          )}
        >
          {clip?.videoId ? (
            <VideoThumb videoId={clip.videoId} className="aspect-video w-24 shrink-0 rounded-xl" />
          ) : (
            <span className="bg-sub aspect-video w-24 shrink-0 rounded-xl" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold">{s.title}</span>
            <span className="text-caption text-ink-soft mt-0.5 block">
              {PHASE_LABEL[s.phase]} · {s.minutes ?? 1}분{s.completed && " · 했어요"}
            </span>
          </span>
        </button>
      )}
    </li>
  );
}

const FEELS = [
  { id: "easy", label: "쉬웠어요" },
  { id: "good", label: "딱 좋아요" },
  { id: "hard", label: "힘들었어요" },
] as const;
type Feel = (typeof FEELS)[number]["id"];
/** 엄마 · 아빠한테 가는 말에 붙는 한 줄 */
const FEEL_LINE: Record<Feel, string> = {
  easy: "쉬웠어요.",
  good: "딱 좋았어요.",
  hard: "조금 힘들었어요.",
};

/** 끝 칸 — 다 했어요 · 경험치 · 어땠어요 · 알리기 */
function Finish({
  allDone,
  doneCount,
  minutes,
  xp,
  levelBefore,
  fresh,
  familyId,
  kidId,
  missionId,
}: {
  allDone: boolean;
  doneCount: number;
  minutes: number;
  xp: number;
  levelBefore: number | null;
  /** 이 화면에서 방금 끝냈나. 이미 다 한 운동을 다시 열었으면 나무가 또 자라지 않는다 */
  fresh: boolean;
  familyId: string;
  kidId: string;
  missionId: string;
}) {
  // 다 한 직후에는 서버가 나무 수를 새로 센다. 옛 값으로 섬을 지었다가 다시 지으면
  // 나무가 두 번 자란다 — 새 값이 올 때까지 캐릭터만 세워 둔다
  const { data: progress, isFetching } = useProgress(kidId || undefined);
  const { data: family } = useFamilyProfiles(familyId);
  const send = useSendCheer(familyId);
  const [told, setTold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 어땠어요 — 고르면 엄마 · 아빠한테 가는 말에 붙는다. 안 골라도 된다 */
  const [feel, setFeel] = useState<Feel | null>(null);

  const stage = stageOf(progress?.level);
  const leveledUp = progress != null && levelBefore != null && progress.level > levelBefore;
  const opened = newlyUnlocked(levelBefore, progress?.level);
  // 섬에 새로 선 장식이 있으면 나무 다음에 튀어나온다
  const unveil = opened.at(-1)?.id ?? null;
  const parents = (family?.profiles ?? []).filter((p) => p.role === "PARENT");

  const tell = async () => {
    setError(null);
    try {
      // 엄마 · 아빠 모두에게. 아이에게 누구에게 알릴지 고르게 하지 않는다
      await Promise.all(
        parents.map((p) =>
          send.mutateAsync({
            fromProfileId: kidId,
            toProfileId: p.profileId ?? "",
            // 남는 말이라 「오늘」 을 넣지 않는다 — 다음 날 알림함에서 읽으면 틀린 말이 된다
            message: `${allDone ? "운동 다 했어요!" : `운동 ${doneCount}개 했어요!`}${feel ? ` ${FEEL_LINE[feel]}` : ""}`,
            missionId,
          }),
        ),
      );
      setTold(true);
    } catch (e) {
      setError(errorMessage(e, "알리지 못했어요. 다시 해 볼까요?"));
    }
  };

  return (
    <section className="card-hero text-center" aria-live="polite">
      <KiumIsland
        stage={stage.stage}
        level={progress?.level}
        unveil={unveil}
        plants={progress && !isFetching ? (progress.activeDays ?? 0) : null}
        seed={kidId || "kid"}
        cheer
        grow={fresh}
        height={230}
        label={`${stage.name}의 섬`}
        className="-mt-3 -mb-1"
      />
      <h2 className="page-title mt-1">
        {allDone ? "오늘 거 다 했어요!" : `${doneCount}개 했어요!`}
      </h2>
      <p className="text-caption text-ink-soft mt-1 font-semibold">{minutes}분 움직였어요</p>

      {progress && (
        <div className="bg-sub mt-4 rounded-2xl p-4 text-left">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-extrabold">
              {leveledUp ? `레벨이 올랐어요! Lv.${progress.level}` : `Lv.${progress.level}`}
            </p>
            {xp > 0 && <p className="text-signal-deep text-sm font-extrabold">+{xp} 경험치</p>}
          </div>
          <XpGauge progress={progress} track="bg-paper" className="mt-2" />
          {/* 레벨이 올라 새로 열린 것 — 위 섬에 방금 섰다 */}
          {opened.map((u) => (
            <p key={u.id} className="border-line mt-3 border-t pt-3 text-sm font-extrabold">
              새로 열렸어요 · {u.name}
            </p>
          ))}
        </div>
      )}

      {/* 어땠어요 — 한 번 누르면 끝. 고르면 엄마 · 아빠한테 가는 말에 붙는다 */}
      {!told && (
        <div className="mt-4" role="group" aria-label="오늘 운동 어땠어요">
          <p className="text-sm font-extrabold">어땠어요?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FEELS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={feel === f.id}
                onClick={() => setFeel(feel === f.id ? null : f.id)}
                className={cn(
                  "press min-h-12 rounded-2xl text-sm font-extrabold",
                  feel === f.id ? "bg-signal-soft text-signal-deep ring-signal ring-2" : "bg-sub",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 칭찬은 부모가 보낸다. 아이는 알리기만 한다(규칙 12) */}
      {told ? (
        <p className="text-done mt-4 flex min-h-12 items-center justify-center gap-1.5 text-sm font-extrabold">
          <Check aria-hidden className="size-4" strokeWidth={3} />
          알렸어요 · 기다리는 중
        </p>
      ) : (
        parents.length > 0 && (
          <button
            type="button"
            onClick={() => void tell()}
            disabled={send.isPending}
            className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
          >
            {send.isPending ? "알리는 중" : "엄마 · 아빠한테 알리기"}
          </button>
        )
      )}
      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-semibold">
          {error}
        </p>
      )}
      <NavLink
        href="/kid"
        transitionTypes={["nav-back"]}
        className="press text-ink-soft mt-2 inline-flex min-h-11 items-center px-4 text-sm font-bold"
      >
        홈으로
      </NavLink>
    </section>
  );
}

function PlaySkeleton() {
  return (
    <>
      <AppBar backHref="/kid" title="오늘 운동" />
      <Stage wide className="space-y-3 pt-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
