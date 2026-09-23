"use client";

import { Check, Pause, Play, SkipForward } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { NavLink } from "@/components/ui/nav-link";
import { Ring } from "@/components/ui/ring";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipPlayer } from "@/components/domain/clip-player";
import { Confetti } from "@/components/scene/confetti";
import { KiumIsland } from "@/components/scene/kium-island";
import { StoneTrail } from "@/components/scene/stone-trail";
import type { MissionSession } from "@/lib/api/types";
import {
  useCompleteSession,
  useFamilyProfiles,
  useMissions,
  useProgress,
  useSendCheer,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { levelProgress, stageOf } from "@/lib/levels";
import { newlyUnlocked } from "@/lib/unlocks";
import { PHASE_LABEL, clock, sessionsOf } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { cn, withJosa } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

/**
 * 오늘 운동 — 한 칸씩 아래로.
 *
 * 받은 순서대로 칸이 세로로 이어지고, 왼쪽 선이 길이다(「아래로 향하는 길라잡이」).
 * **지금 칸만 펼친다.** 시범 영상과 타이머가 있고, 시작을 누르면 둘이 같이 돈다.
 * 잡힌 시간이 다 되면 조각이 한 번 터지고, 3초 뒤 화면이 다음 칸으로 스스로 내려가
 * 다음 칸이 시작된다. 영상은 지금 칸 하나만 띄운다 — 여섯 개를 한꺼번에 띄우면 폰이 버벅인다.
 *
 * 기록은 `TIMER` 다. 우리가 잰 시간이지 영상 완주가 아니다(규칙 2).
 * 이 화면에 「미션」 이라는 말은 없다 — 아이에게는 「오늘 운동」 이다.
 */

/** 한 칸을 끝내고 다음 칸이 시작되기까지 */
const REST_SEC = 3;

type Status = "idle" | "running" | "paused" | "rest" | "blocked" | "ended";

export default function PlayPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const { familyId } = useSession();
  const kidId = useRoleStore((s) => s.childProfileId) ?? "";
  const { data: missions, isPending } = useMissions(familyId, { scope: "ALL" });
  const { data: progress } = useProgress(kidId || undefined);
  const complete = useCompleteSession(missionId, familyId ?? "");

  const mission = missions?.missions?.find((m) => m.missionId === missionId);

  /** 이 화면에서 방금 끝낸 칸. 서버 응답을 기다리지 않고 바로 체크한다 */
  const [doneHere, setDoneHere] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
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
    ? sessionsOf(mission).map((s) =>
        doneHere.includes(s.position) ? { ...s, completed: true, verifiedBy: "TIMER" } : s,
      )
    : [];
  const firstOpen = sessions.find((s) => !s.completed)?.position ?? null;
  const active = status === "ended" ? null : (current ?? firstOpen);
  const activeSession = sessions.find((s) => s.position === active);
  const activeIndex = sessions.findIndex((s) => s.position === active);
  const plannedSec = (activeSession?.minutes ?? 1) * 60;
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

  /** 한 칸 끝. 조각을 터뜨리고 서버에 알리고, 다음 칸이 있으면 3초 쉰다 */
  const finishStep = useEffectEvent((position: number, seconds: number) => {
    const done = [...doneHere, position];
    setDoneHere(done);
    setBurst((b) => b + 1);
    complete.mutate(
      {
        position,
        profileId: kidId,
        activeSeconds: Math.round(seconds),
        startedAt: startedAt.current ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
      },
      { onSuccess: (res) => setXp((x) => x + (res.xpGained ?? 0)) },
    );
    const next = nextOpen(position, done);
    if (next == null) {
      setStatus("idle");
      return;
    }
    // 다음 칸을 바로 펼치고 그리로 내려간다. 3초 세고 나서 시작한다
    setCurrent(next);
    setElapsed(0);
    setRestLeft(REST_SEC);
    setStatus("rest");
  });

  /** 타이머 한 번 — 잡힌 시간이 다 되면 그 칸을 끝낸다 */
  const tick = useEffectEvent((delta: number) => {
    if (active == null) return;
    const next = elapsed + delta;
    setElapsed(next);
    if (next >= plannedSec) finishStep(active, next);
  });

  /** 쉬는 3초 중 한 번 — 다 세면 펼쳐 둔 다음 칸을 시작한다 */
  const restTick = useEffectEvent(() => {
    if (restLeft > 1) {
      setRestLeft(restLeft - 1);
      return;
    }
    setRestLeft(0);
    startedAt.current = new Date().toISOString();
    setStatus("running");
  });

  // 타이머. 도는 동안만
  useEffect(() => {
    if (status !== "running") return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      tick((now - last) / 1000);
      last = now;
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  // 쉬는 3초
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

  if (isPending) return <PlaySkeleton />;

  if (!mission || sessions.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="오늘 운동" />
        <Stage wide>
          <EmptyState
            scene="no-mission"
            title="운동을 찾지 못했어요"
            description="홈으로 돌아가서 다시 골라 주세요."
          />
        </Stage>
      </>
    );
  }

  const totalMin = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const doneMin = sessions.filter((s) => s.completed).reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const start = () => {
    if (active == null) return;
    if (levelBefore == null && progress) setLevelBefore(progress.level);
    if (current == null) setCurrent(active);
    if (status === "idle" || status === "rest") {
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
      <div className="bg-ground/95 sticky top-14 z-20 px-4 pb-2 backdrop-blur-sm">
        <StoneTrail
          count={sessions.length}
          done={sessions.flatMap((s, i) => (s.completed ? [i] : []))}
          current={activeIndex >= 0 ? activeIndex : null}
          stage={stageOf(progress?.level).stage}
          height={72}
          label={`${sessions.length}칸 중 ${doneCount}칸 건넜어요`}
        />
        <p className="text-caption text-ink-soft text-center font-bold">
          {doneCount} / {sessions.length}칸 · {totalMin}분 중 {doneMin}분
        </p>
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
            {finished ? (
              <Finish
                allDone={allDone}
                doneCount={doneCount}
                total={sessions.length}
                minutes={doneMin}
                xp={xp}
                levelBefore={levelBefore}
                familyId={familyId ?? ""}
                kidId={kidId}
                missionId={missionId}
              />
            ) : (
              <button
                type="button"
                onClick={() => setStatus("ended")}
                className="press text-ink-soft mx-auto flex min-h-11 items-center px-4 text-sm font-bold"
              >
                여기까지 할래요
              </button>
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
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBlocked: () => void;
  onPick: () => void;
}) {
  const planned = (s.minutes ?? 1) * 60;
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
              value={status === "rest" ? REST_SEC - restLeft : elapsed}
              max={status === "rest" ? REST_SEC : planned}
              size={112}
              stroke={10}
              label={status === "rest" ? `${restLeft}초 뒤에 시작해요` : `${clock(left)} 남았어요`}
            >
              {status === "rest" ? (
                <span className="text-center leading-none">
                  <span className="text-metric-lg block font-extrabold">{restLeft}</span>
                  <span className="text-micro text-ink-soft font-bold">곧 시작</span>
                </span>
              ) : (
                <span className="text-center leading-none">
                  <span role="timer" className="text-metric block font-extrabold tabular-nums">
                    {clock(left)}
                  </span>
                  <span className="text-micro text-ink-soft font-bold">남았어요</span>
                </span>
              )}
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{s.minutes ?? 1}분 동안 따라 해요</p>
              <p className="text-caption text-ink-soft mt-0.5">
                영상이 짧으면 처음부터 다시 나와요
              </p>
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
            // eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 외부 주소라 최적화가 안 된다
            <img
              src={`https://i.ytimg.com/vi/${encodeURIComponent(clip.videoId)}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              className="bg-sub aspect-video w-24 shrink-0 rounded-xl object-cover"
            />
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

/** 끝 칸 — 다 했어요 · 경험치 · 알리기 */
function Finish({
  allDone,
  doneCount,
  total,
  minutes,
  xp,
  levelBefore,
  familyId,
  kidId,
  missionId,
}: {
  allDone: boolean;
  doneCount: number;
  total: number;
  minutes: number;
  xp: number;
  levelBefore: number | null;
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

  const stage = stageOf(progress?.level);
  const bar = progress ? levelProgress(progress) : null;
  const leveledUp = progress != null && levelBefore != null && progress.level > levelBefore;
  const opened = newlyUnlocked(levelBefore, progress?.level);
  // 섬에 새로 선 장식이 있으면 나무 다음에 튀어나온다
  const unveil = opened.flatMap((u) => (u.kind === "decoration" ? [u.id] : [])).at(-1) ?? null;
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
            message: allDone ? "오늘 운동 다 했어요!" : `오늘 운동 ${doneCount}개 했어요!`,
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
        grow
        height={230}
        label={`${stage.name}의 섬. 오늘 나무가 하나 자랐어요`}
        className="-mt-3 -mb-1"
      />
      <h2 className="page-title mt-1">
        {allDone ? "오늘 거 다 했어요!" : `${doneCount}개 했어요!`}
      </h2>
      <p className="text-caption text-ink-soft mt-1 font-semibold">
        {minutes}분 움직였어요 · 섬에 나무가 자랐어요
        {!allDone && ` · ${total - doneCount}개는 다음에`}
      </p>

      {progress && (
        <div className="bg-sub mt-4 rounded-2xl p-4 text-left">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-extrabold">
              {leveledUp ? `레벨이 올랐어요! Lv.${progress.level}` : `Lv.${progress.level}`}
            </p>
            {xp > 0 && <p className="text-signal-deep text-sm font-extrabold">+{xp} 경험치</p>}
          </div>
          <div className="bg-paper mt-2 h-2.5 overflow-hidden rounded-full">
            <span
              className="bg-signal block h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.round((bar?.ratio ?? 0) * 100)}%` }}
            />
          </div>
          <p className="text-micro text-ink-soft mt-1.5 font-bold">
            {stage.name}
            {bar?.left != null && ` · 다음 레벨까지 ${bar.left}`}
          </p>
          {/* 레벨이 올라 새로 열린 것. 섬 장식은 위 섬에 방금 섰고, 놀이는 놀이터로 가는 길 */}
          {opened.map((u) => (
            <p key={u.id} className="border-line mt-3 border-t pt-3 text-sm">
              <b className="font-extrabold">새로 열렸어요 · {u.name}</b>
              <span className="text-ink-soft mt-0.5 block text-xs">
                {u.kind === "decoration" ? `섬에 ${withJosa(u.name, "이가")} 섰어요` : u.line}
              </span>
              {u.kind === "game" && (
                <NavLink
                  href={`/kid/play/${u.id}`}
                  className="press text-signal-deep mt-1 inline-flex min-h-10 items-center text-sm font-extrabold"
                >
                  {u.name} 하러 가기
                </NavLink>
              )}
            </p>
          ))}
        </div>
      )}

      {/* 칭찬은 부모가 보낸다. 아이는 알리기만 한다(규칙 12) */}
      {told ? (
        <p className="bg-done-soft text-done mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold">
          <Check aria-hidden className="size-4" strokeWidth={3} />
          알렸어요 · 엄마 · 아빠가 보고 있어요
        </p>
      ) : (
        parents.length > 0 && (
          <button
            type="button"
            onClick={() => void tell()}
            disabled={send.isPending}
            className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
          >
            엄마 · 아빠한테 알리기
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
