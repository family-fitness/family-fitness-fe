"use client";

import {
  Check,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ArtIcon } from "@/components/ui/art-icon";
import { NavLink } from "@/components/ui/nav-link";
import { Ring } from "@/components/ui/ring";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { ClipPlayer } from "@/components/domain/clip-player";
import { Confetti } from "@/components/scene/confetti";
import { KiumIsland } from "@/components/scene/kium-island";
import { StoneTrail } from "@/components/scene/stone-trail";
import { XpGauge } from "@/components/domain/xp-gauge";
import { ApiError } from "@/lib/api/client";
import type { MissionSession } from "@/lib/api/types";
import {
  useCheers,
  useCompleteSession,
  useFamilyProfiles,
  useMissions,
  useProgress,
  useClips,
  useSendCheer,
} from "@/lib/api/queries";
import { missionTitle, missionsOn } from "@/lib/day";
import { errorMessage } from "@/lib/errors";
import { guardiansName } from "@/lib/family";
import { playLock } from "@/lib/mission";
import { stageOf } from "@/lib/levels";
import { newlyUnlocked } from "@/lib/unlocks";
import { PHASE_LABEL, clock, doneAtSeconds, sessionsOf, stepSeconds } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { longDate, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";
import { exerciseLine, sessionHref } from "@/lib/videos";
import { useVoice } from "@/lib/voice";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * 오늘 운동. 한 동작씩 아래로.
 *
 * 맨 위에 징검다리가 붙어 있고, 동작 하나를 끝낼 때마다 키움이가 한 칸 건너간다.
 * 그 아래로 동작이 받은 순서대로 이어지고, 왼쪽 선이 길이다. **지금 동작만 펼친다.**
 * 펼친 칸 안은 삼성 헬스 운동 코칭처럼 큰 시범 영상, 큰 원형 남은 시간, 큰 시작과 일시정지 단추다.
 * 잡힌 시간이 다 되면 조각이 한 번 터지고, 화면이 다음 동작으로 내려가 10초 쉰 뒤 시작한다.
 * 화면을 떠나면(잠금, 다른 앱) 멈춘다. 영상은 지금 동작 하나만 띄운다(여러 개를 띄우면 폰이 버벅인다).
 *
 * 타이머는 그 동작 영상의 길이만큼 돈다(`stepSeconds`). 절반 넘게 하면 완료할 수 있다(`doneAtSeconds`).
 * 동작마다 한 시간은 sessionStorage 에 남겨, 다른 화면에 갔다 오거나 다른 동작을 눌렀다 와도 이어서 한다.
 *
 * 소리 안내가 켜져 있으면 말로도 알려 준다(「스쿼트 시작!」 「10초 남았어요」 「셋, 둘, 하나」).
 *
 * 기록은 `TIMER` 다. 우리가 잰 시간이지 영상 완주가 아니다(규칙 2).
 * 이 화면에 「미션」 이라는 말은 없다. 아이에게는 「오늘 운동」 이다.
 *
 * 아이 화면(`/kid/m/[missionId]`)과 보호자 화면(`/parent/m/[missionId]`)이 같이 쓴다. 다른 것은 셋이다.
 *   누가 하는가   아이 화면은 이 기기의 아이, 보호자 화면은 로그인한 보호자 자신(`actorId`)
 *   돌아갈 곳     아이 홈, 보호자의 운동 탭(`home`)
 *   끝 칸         아이는 섬과 경험치, 보호자한테 알리기. 보호자는 한 만큼만 짧게(알릴 사람이 없다)
 */

/** 한 칸을 끝내고 다음 칸이 시작되기까지. 자세를 바꾸고 숨 고를 만큼 */
const REST_SEC = 10;
/** 쉬는 시간 한 번 늘리기 */
const REST_MORE = 10;
/** 말로 셀 때. 남은 초 */
const COUNT_WORDS: Record<number, string> = { 3: "셋", 2: "둘", 1: "하나" };

/** 초를 분으로. 조금이라도 했으면 1분부터 */
const minutesOf = (sec: number) => (sec > 0 ? Math.max(1, Math.round(sec / 60)) : 0);

/** 남은 초를 말로. 「45초」 「1분 20초」 */
function secondsText(sec: number): string {
  const s = Math.max(1, Math.ceil(sec));
  if (s < 60) return `${s}초`;
  return s % 60 === 0 ? `${s / 60}분` : `${Math.floor(s / 60)}분 ${s % 60}초`;
}

type Status = "idle" | "running" | "paused" | "rest" | "blocked" | "ended";

/** 한 칸을 끝냈다고 서버에 보내는 것. 못 보냈으면 들고 있다가 다시 보낸다 */
interface StepDone {
  position: number;
  profileId: string;
  activeSeconds: number;
  startedAt: string;
  endedAt: string;
}

/**
 * 동작마다 한 만큼. 다른 화면에 갔다 오거나(이 화면이 다시 그려져도) 탭이 다시 열려도 남게 sessionStorage 에 둔다.
 * 시작 시각도 같이 둔다. 서버는 인정하는 운동 시간을 시작부터 끝까지 걸린 시간까지만 쳐 준다
 */
interface PlayMemory {
  current: number | null;
  elapsed: Record<number, number>;
  started: Record<number, string>;
}
const EMPTY_MEMORY: PlayMemory = { current: null, elapsed: {}, started: {} };

function readMemory(key: string): PlayMemory {
  if (!key || typeof window === "undefined") return EMPTY_MEMORY;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<PlayMemory> | null;
    if (!saved || typeof saved !== "object") return EMPTY_MEMORY;
    return {
      current: typeof saved.current === "number" ? saved.current : null,
      elapsed: saved.elapsed && typeof saved.elapsed === "object" ? saved.elapsed : {},
      started: saved.started && typeof saved.started === "object" ? saved.started : {},
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

export function MissionPlay({
  missionId,
  actorId,
  home,
  forParent = false,
}: {
  missionId: string;
  /** 운동하는 사람. 아이 화면은 이 기기의 아이, 보호자 화면은 로그인한 보호자 */
  actorId: string;
  /** 앱 바의 뒤로와 「홈으로」 가 가는 곳 */
  home: string;
  /** 보호자 화면이면 끝 칸이 짧다. 섬과 경험치, 알리기가 없다 */
  forParent?: boolean;
}) {
  const kidId = actorId;
  const {
    familyId,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다. isLoading 으로 본다
  const {
    data: missions,
    isLoading,
    error: missionsError,
    refetch,
  } = useMissions(familyId, { scope: "ALL" });
  const { data: progress, isLoading: progressLoading } = useProgress(kidId || undefined);
  const complete = useCompleteSession(missionId, familyId ?? "");
  const { data: family } = useFamilyProfiles(familyId);
  // 동의를 거둔 아이. 해도 기록이 남지 않는다(422). 시작하게 두면 한 칸을 다 하고 나서야 안다
  const kid = family?.profiles?.find((p) => p.profileId === kidId);
  const noConsent = Boolean(kid?.consentRequired && !kid.consentGiven);

  const mission = missions?.missions?.find((m) => m.missionId === missionId);
  /*
    오늘 이 아이가 할 수 있는 운동인가. 앞날 운동, 지난 운동, 형제의 운동은 서버가 칸 끝을 받지 않는다
    (422 MISSION_NOT_ACTIVE, 403 NOT_A_PARTICIPANT). 볼 수만 있게 막는다
  */
  const now = today();
  const lockedBy = playLock(mission, kidId, now);
  // 오늘 할 운동이 더 남았나. 남았으면 이 운동을 끝낸 것이지 「오늘 거」 를 다 한 게 아니다
  const moreToday = missionsOn(missions?.missions, kidId, now).some(
    (m) =>
      m.missionId !== missionId &&
      m.targetMetric !== "STEPS" &&
      !m.participants?.find((p) => p.profileId === kidId)?.completed,
  );

  /** 이 화면에서 방금 끝낸 칸. 서버 응답을 기다리지 않고 바로 체크한다 */
  const [doneHere, setDoneHere] = useState<number[]>([]);
  /** 보내는 중인 칸 수, 못 보낸 칸. 다 보내기 전에는 「다 했어요」 를 띄우지 않는다 */
  const [saving, setSaving] = useState(0);
  const [unsaved, setUnsaved] = useState<StepDone[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  /**
   * 다시 보내도 같은 답이 오는 실패(동의, 참여자 아님, 없는 운동)면 다시 보내기 대신 갈 곳.
   * 로그인이 풀렸으면(401) 로그인으로, 그 밖에는 홈으로
   */
  const [stuckTo, setStuckTo] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  /*
    동작마다 한 시간과 시작 시각, 지금 동작. 운동하는 사람을 알게 되면(보호자 화면은 로그인 정보를 받은 뒤)
    그 사람 몫을 sessionStorage 에서 꺼낸다. 바뀌는 대로 다시 적는다
  */
  const memoryKey = kidId ? `ff-play-${missionId}-${kidId}` : "";
  const [memoryOf, setMemoryOf] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  const [elapsedBy, setElapsedBy] = useState<Record<number, number>>({});
  const [startedBy, setStartedBy] = useState<Record<number, string>>({});
  if (memoryOf !== memoryKey) {
    const saved = readMemory(memoryKey);
    setMemoryOf(memoryKey);
    setCurrent(saved.current);
    setElapsedBy(saved.elapsed);
    setStartedBy(saved.started);
  }
  useEffect(() => {
    if (!memoryKey || memoryOf !== memoryKey) return;
    try {
      sessionStorage.setItem(
        memoryKey,
        JSON.stringify({ current, elapsed: elapsedBy, started: startedBy }),
      );
    } catch {
      // 저장소를 못 쓰면(사생활 보호 창) 이 화면 안에서만 남는다
    }
  }, [memoryKey, memoryOf, current, elapsedBy, startedBy]);
  /** 플레이어가 알려 준 영상 길이(초). 구간 끝이 안 온 영상만 쓴다 */
  const [videoSecBy, setVideoSecBy] = useState<Record<number, number>>({});

  const [restLeft, setRestLeft] = useState(0);
  /** 이번 쉬는 시간 전체(늘리면 같이 는다). 링이 이 만큼을 한 바퀴로 그린다 */
  const [restTotal, setRestTotal] = useState(REST_SEC);
  const voiceOn = usePrefsStore((s) => s.voice);
  const setVoiceOn = usePrefsStore((s) => s.setVoice);
  const { say } = useVoice(voiceOn);
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState(0);
  /** 보호자한테 알렸나. 끝 칸이 다시 그려져도 잊지 않게 여기에 둔다 */
  const [told, setTold] = useState(false);
  /** 시작할 때의 레벨. 끝나고 올랐는지 견준다 */
  const [levelBefore, setLevelBefore] = useState<number | null>(null);
  /**
   * 자동 재생이 막혀 멈춘 칸. **한 칸에 한 번만** 멈춘다. 아이가 눌러서 다시 시작했는데도
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
  /** 한 동작의 타이머(초). 영상 길이를 알면 영상 길이 */
  const secondsOf = (s: MissionSession) => stepSeconds(s, videoSecBy[s.position]);
  const firstOpen = sessions.find((s) => !s.completed)?.position ?? null;
  // 남겨 둔 지금 동작이 그사이 끝났으면(다른 기기에서) 남은 첫 동작으로
  const currentOpen = sessions.find((s) => s.position === current && !s.completed)?.position;
  const active = status === "ended" || lockedBy ? null : (currentOpen ?? firstOpen);
  const activeSession = sessions.find((s) => s.position === active);
  const activeIndex = sessions.findIndex((s) => s.position === active);
  const elapsed = active != null ? (elapsedBy[active] ?? 0) : 0;
  const plannedSec = activeSession ? secondsOf(activeSession) : 60;
  /** 이만큼 하면 완료할 수 있다. 타이머의 절반 */
  const doneAt = activeSession
    ? doneAtSeconds(activeSession, videoSecBy[activeSession.position])
    : 30;
  const halfDone = active != null && elapsed >= doneAt;
  const doneCount = sessions.filter((s) => s.completed).length;
  const allDone = sessions.length > 0 && doneCount === sessions.length;
  const finished = allDone || status === "ended";
  /** 화면 읽기에 한 번씩. 시작, 멈춤, 쉼(다음 운동), 막힘. 초마다 바뀌는 수는 싣지 않는다 */
  const liveLine =
    status === "running"
      ? `${activeSession?.title ?? "운동"} 시작`
      : status === "paused"
        ? "잠깐 멈췄어요"
        : status === "rest"
          ? `쉬는 시간, 다음은 ${activeSession?.title ?? "운동"}`
          : status === "blocked"
            ? "멈췄어요, 눌러서 시작"
            : "";
  /** 끝 칸의 제목. 화면 읽기에도 같은 말로 */
  const finishLine = allDone
    ? moreToday
      ? "이 운동 다 했어요!"
      : "오늘 거 다 했어요!"
    : `${doneCount}개 했어요!`;

  /** 다음에 할 칸. 지금 칸 뒤에서 먼저 찾고, 없으면 앞에 남은 칸 */
  const nextOpen = (after: number, done: number[]) => {
    const open = (x: MissionSession) => !x.completed && !done.includes(x.position);
    return (
      sessions.find((x) => x.position > after && open(x))?.position ??
      sessions.find((x) => open(x) && x.position !== after)?.position ??
      null
    );
  };

  /**
   * 서버에 보낸다. 못 보내면 들고 있다가 「다시 보내기」 로.
   * 부를 때마다 따로 기다린다. mutate 에 준 콜백은 마지막 호출 것만 불려서, 못 보낸 칸 여럿을 한꺼번에
   * 다시 보내면 앞 칸의 실패가 사라지고 보내는 중 수가 줄지 않아 끝 칸이 뼈대에 멈췄다
   */
  const save = (step: StepDone) => {
    setSaving((n) => n + 1);
    complete
      .mutateAsync(step)
      .then((res) => setXp((x) => x + (res.xpGained ?? 0)))
      .catch((e: unknown) => {
        setUnsaved((list) => [...list, step]);
        // 망이나 서버 탓이 아니면(4xx) 다시 보내도 같다. 서버가 받지 않은 칸은 끝낸 칸으로 두지 않고
        // 다음 칸으로 넘어가지도 않는다. 다음 칸도 같은 까닭으로 거절된다
        if (e instanceof ApiError && e.status < 500 && e.status !== 408 && e.status !== 429) {
          setStuckTo(e.status === 401 ? "/login" : home);
          setDoneHere((list) => list.filter((p) => p !== step.position));
          setCurrent(null);
          // 다음 칸으로 이어 가면 남지 않을 운동을 더 시킨다(동의를 거둔 아이). 여기서 멈추고 끝 칸의 말을 띄운다
          setStatus("ended");
        }
        setSaveError(
          errorMessage(
            e,
            {
              CONSENT_REQUIRED: "지금은 기록을 남길 수 없어요.",
              CONSENT_WITHDRAWN: "지금은 기록을 남길 수 없어요.",
              MISSION_NOT_ACTIVE: "오늘 하는 운동이 아니라서 기록을 남기지 못했어요.",
              NOT_A_PARTICIPANT: "내 운동이 아니라서 기록을 남기지 못했어요.",
              TOO_SHORT: "너무 짧게 해서 기록을 남기지 못했어요.",
            },
            "기록을 남기지 못했어요.",
          ),
        );
      })
      .finally(() => setSaving((n) => n - 1));
  };
  const retry = () => {
    const list = unsaved;
    setUnsaved([]);
    setSaveError(null);
    list.forEach(save);
  };

  /** 한 칸 끝. 조각을 터뜨리고 서버에 알리고, 다음 칸이 있으면 10초 쉰다 */
  const completeStep = (position: number, seconds: number) => {
    const done = [...doneHere, position];
    setDoneHere(done);
    setBurst((b) => b + 1);
    const endedAt = new Date();
    save({
      position,
      profileId: kidId,
      activeSeconds: Math.round(seconds),
      // 시작 시각을 잃었으면 한 시간만큼 거슬러 적는다. 지금 시각을 적으면 서버가 끝이 시작보다 빠르다고 거절한다
      startedAt: startedBy[position] ?? new Date(endedAt.getTime() - seconds * 1000).toISOString(),
      endedAt: endedAt.toISOString(),
    });
    const next = nextOpen(position, done);
    if (next == null) {
      say("다 했어요! 최고예요");
      setStatus("idle");
      return;
    }
    const nextTitle = sessions.find((x) => x.position === next)?.title;
    say(nextTitle ? `잘했어요! 쉬었다가, 다음은 ${nextTitle}` : "잘했어요!");
    // 다음 칸을 바로 띄우고 쉰다. 쉬고 나서 시작한다
    setCurrent(next);
    setRestLeft(REST_SEC);
    setRestTotal(REST_SEC);
    setStatus("rest");
  };
  const finishStep = useEffectEvent((position: number, seconds: number) =>
    completeStep(position, seconds),
  );

  /** 이 동작을 돌린다. 처음 시작한 시각은 한 번만 적는다 */
  const run = (position: number) => {
    const at = new Date().toISOString();
    setStartedBy((m) => (m[position] ? m : { ...m, [position]: at }));
    setStatus("running");
  };

  /** 타이머 한 번. 잡힌 시간이 다 되면 그 칸을 끝낸다 */
  const tick = useEffectEvent((delta: number) => {
    if (active == null) return;
    const next = elapsed + delta;
    setElapsedBy((m) => ({ ...m, [active]: next }));
    // 남은 시간이 그 자리를 지나는 순간에 한 번씩 말한다
    const before = plannedSec - elapsed;
    const after = plannedSec - next;
    if (elapsed < doneAt && next >= doneAt && next < plannedSec) say("절반 했어요");
    if (plannedSec > 20 && before > 10 && after <= 10) say("10초 남았어요");
    for (const [sec, word] of Object.entries(COUNT_WORDS)) {
      if (before > Number(sec) && after <= Number(sec)) say(word);
    }
    if (next >= plannedSec) finishStep(active, next);
  });

  /** 쉬는 동안 한 번(1초). 다 세면 띄워 둔 다음 칸을 시작한다 */
  const restTick = useEffectEvent(() => {
    if (restLeft > 1) {
      const word = COUNT_WORDS[restLeft - 1];
      if (word) say(word);
      setRestLeft(restLeft - 1);
      return;
    }
    setRestLeft(0);
    if (activeSession) say(`${activeSession.title} 시작!`);
    if (active != null) run(active);
  });

  // 타이머. 도는 동안만. 한 번에 1초 넘게 세지 않는다. 폰이 잠겨 타이머가 늦게 깨도
  // 그동안을 한 것으로 치지 않는다(타이머로 확인됨, 규칙 2)
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

  // 화면을 떠나면(잠금, 다른 앱) 멈춘다. 아무도 안 보는 사이에 칸이 끝나고 다음 칸이 저절로 시작되지 않게
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

  // 지금 동작이 바뀌면 그 칸으로 내려간다
  const firstScroll = useRef(true);
  useEffect(() => {
    if (active == null) return;
    const el = document.getElementById(`step-${active}`);
    if (!el) return;
    // 처음 들어올 때는 바로, 다음 동작으로 넘어갈 때는 부드럽게
    el.scrollIntoView({ behavior: firstScroll.current ? "auto" : "smooth", block: "start" });
    firstScroll.current = false;
  }, [active]);

  /*
    조작 단추가 바뀌면 누른 단추가 사라져 초점이 body 로 떨어졌다. 키보드나 스크린 리더로는 어디 있는지
    잃는다(9/30 점검). 누른 단추가 사라졌을 때만 지금 칸의 큰 버튼으로 포커스를 옮긴다(스크롤은 하지 않는다)
  */
  const stepList = useRef<HTMLOListElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const was = lastFocused.current;
    if (!was || was.isConnected) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    stepList.current?.querySelector<HTMLElement>("[data-primary]")?.focus({ preventScroll: true });
  }, [status, active]);

  // 다 끝나면 끝 칸으로
  useEffect(() => {
    if (!finished) return;
    document.getElementById("step-end")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [finished]);

  if (sessionPending || isLoading) return <PlaySkeleton home={home} />;
  // 받아 둔 운동이 있으면 다시 받다 실패해도 하던 칸을 걷어 내지 않는다
  const failure = sessionError ?? (missions ? null : missionsError);
  if (failure) {
    return (
      <>
        <AppBar backHref={home} title="오늘 운동" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
          />
        </Stage>
      </>
    );
  }

  // 하던 중에 거둬졌으면 끝 칸이 말한다. 하던 화면을 걷어 내지 않는다.
  // 서버가 받지 않은 칸은 doneHere 에서 빠지고 unsaved 에 남으니 그것도 하던 중으로 본다
  if (noConsent && doneHere.length === 0 && unsaved.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="오늘 운동" />
        <Stage wide>
          <EmptyState scene="waiting" title="지금은 기록을 남길 수 없어요" />
        </Stage>
      </>
    );
  }

  if (!mission || sessions.length === 0) {
    return (
      <>
        <AppBar backHref={home} title="오늘 운동" />
        <Stage wide>
          <EmptyState
            scene="no-mission"
            title="운동을 찾지 못했어요"
            action={<EmptyStateAction href={home}>홈으로</EmptyStateAction>}
          />
        </Stage>
      </>
    );
  }

  const sumSec = (list: MissionSession[]) => list.reduce((sum, s) => sum + secondsOf(s), 0);
  const totalMin = minutesOf(sumSec(sessions));
  const doneMin = minutesOf(sumSec(sessions.filter((s) => s.completed)));

  const start = () => {
    if (active == null) return;
    if (levelBefore == null && progress) setLevelBefore(progress.level);
    if (status !== "paused" && activeSession) say(`${activeSession.title} 시작!`);
    if (current == null) setCurrent(active);
    setRestLeft(0);
    run(active);
  };

  /** 다른 동작으로. 하던 시간은 그 동작에 남는다. 돌던 중이면 이어서 돈다 */
  const goTo = (position: number | null) => {
    if (position == null) {
      setCurrent(null);
      setStatus("ended");
      return;
    }
    setCurrent(position);
    setRestLeft(0);
    if (status === "running") {
      const title = sessions.find((x) => x.position === position)?.title;
      if (title) say(`${title} 시작!`);
      run(position);
    } else {
      setStatus("idle");
    }
  };

  const prevOpen =
    active == null
      ? null
      : (sessions.filter((x) => x.position < active && !x.completed).at(-1)?.position ?? null);
  const upNextPos = active == null ? null : nextOpen(active, doneHere);
  // 절반 넘게 했으면 다음이 곧 완료다. 아니면 건너뛴다. 건너뛸 칸이 없고 한 칸도 안 했으면 막는다(「0개 했어요」)
  const canNext = active != null && (halfDone || upNextPos != null || doneCount > 0);
  const goNext = () => {
    if (active == null) return;
    if (halfDone) completeStep(active, elapsed);
    else goTo(upNextPos);
  };
  const left = Math.max(0, plannedSec - elapsed);
  const startLabel =
    status === "blocked"
      ? "눌러서 시작"
      : status === "rest"
        ? "바로 시작"
        : elapsed > 0
          ? "이어서 하기"
          : "시작하기";

  return (
    <>
      <AppBar backHref={home} title={missionTitle(mission, now)} />
      <Confetti fire={burst} pieces={allDone ? 120 : 50} from={allDone ? "top" : "bottom"} />

      {/* 위에 붙는 징검다리. 몇 번째인지 늘 보이고, 한 동작 끝내면 키움이가 건너간다 */}
      <div className="bg-ground sticky top-14 z-20 px-4 pb-2">
        {/* 레벨을 받은 뒤에 짓는다. 1단계로 지었다가 받고 나서 다시 지으면 깜빡이고 WebGL 이 하나 더 든다 */}
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
            {sessions.length}개 중 {doneCount}개, {totalMin}분 중 {doneMin}분
          </p>
          <button
            type="button"
            onClick={() => setVoiceOn(!voiceOn)}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "소리 안내 끄기" : "소리 안내 켜기"}
            className="press text-ink-soft absolute right-0 grid size-11 place-items-center rounded-full"
          >
            {voiceOn ? (
              <Volume2 aria-hidden className="size-5" />
            ) : (
              <VolumeX aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* 끝났다는 말. 자리는 늘 두고 글자만 바꾼다 */}
      <p className="sr-only" role="status">
        {finished && unsaved.length === 0 && saving === 0 ? finishLine : liveLine}
      </p>
      <Stage wide className="pt-1">
        {lockedBy && !allDone && (
          // 볼 수만 있는 운동. 시작 단추 대신 까닭을 맨 위에
          <section className="card-hero mb-3 text-center" role="status">
            <p className="text-lead font-extrabold">
              {lockedBy === "later"
                ? `${longDate(mission.startDate)}에 하는 운동이에요`
                : lockedBy === "over"
                  ? "지난 운동이에요"
                  : `${ownerNames(mission.participants)} 운동이에요`}
            </p>
            <p className="text-caption text-ink-soft mt-1 font-semibold">
              {lockedBy === "later"
                ? "그날 와서 시작해요"
                : lockedBy === "over"
                  ? "지난 운동은 볼 수만 있어요"
                  : "내 운동이 아니라서 볼 수만 있어요"}
            </p>
            <NavLink
              href={home}
              transitionTypes={["nav-back"]}
              className="press text-ink-soft mt-2 inline-flex min-h-11 items-center px-4 text-sm font-bold"
            >
              {forParent ? "운동으로 돌아가기" : "홈으로"}
            </NavLink>
          </section>
        )}

        <ol
          ref={stepList}
          className="relative"
          onFocus={(e) => {
            lastFocused.current = e.target;
          }}
        >
          {sessions.map((s, i) => (
            <li
              key={s.position}
              id={`step-${s.position}`}
              className="relative scroll-mt-48 pb-3 pl-11"
            >
              {/* 길. 끝낸 동작까지는 파랑, 그 아래는 회색 */}
              {i < sessions.length - 1 && (
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
                  s.completed && "bg-ground text-signal",
                  !s.completed &&
                    s.position === active &&
                    "bg-paper ring-signal text-signal-deep ring-2",
                  !s.completed && s.position !== active && "bg-ground text-ink-soft",
                )}
              >
                {s.completed ? <Check className="size-4" strokeWidth={3.2} /> : i + 1}
              </span>

              {s.position === active && activeSession && !s.completed ? (
                <section
                  className="card-hero"
                  aria-label={`${i + 1}번째 운동 ${activeSession.title}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption text-signal-deep font-extrabold">
                        {status === "rest"
                          ? "쉬는 시간, 다음 운동"
                          : PHASE_LABEL[activeSession.phase]}
                      </p>
                      <h2 className="text-lead mt-0.5 font-extrabold">{activeSession.title}</h2>
                    </div>
                    {/* 운동 상세로. 하던 시간은 sessionStorage 에 남아 뒤로 오면 그 자리에서 이어 간다 */}
                    {sessionHref(activeSession) && (
                      <NavLink
                        href={sessionHref(activeSession) ?? ""}
                        className="press bg-sub text-ink-soft inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full pr-2.5 pl-3.5 text-xs font-extrabold"
                      >
                        운동 설명
                        <ChevronRight aria-hidden className="size-3.5" />
                      </NavLink>
                    )}
                  </div>
                  <p className="text-caption text-ink-soft mt-0.5 font-semibold">
                    {exerciseLine(activeSession)}
                  </p>

                  {activeSession.clip?.videoId && (
                    <div className="mt-3">
                      <StepPlayer
                        clip={activeSession.clip}
                        session={activeSession}
                        playing={status === "running"}
                        onBlocked={() => {
                          if (blockedAt === activeSession.position) return;
                          setBlockedAt(activeSession.position);
                          setStatus("blocked");
                        }}
                        onDuration={(sec) => {
                          const position = activeSession.position;
                          const len = Math.round(sec);
                          setVideoSecBy((m) =>
                            m[position] === len ? m : { ...m, [position]: len },
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* 삼성 헬스 운동 코칭처럼 큰 원형 남은 시간 */}
                  <div className="mt-4 flex justify-center">
                    <Ring
                      value={status === "rest" ? restTotal - restLeft : elapsed}
                      max={status === "rest" ? restTotal : plannedSec}
                      size={176}
                      stroke={12}
                      label={
                        status === "rest"
                          ? `${restLeft}초 뒤에 시작해요`
                          : `${clock(left)} 남았어요`
                      }
                    >
                      <span className="text-center leading-none">
                        <span className="text-metric-lg block font-extrabold tabular-nums">
                          {status === "rest" ? restLeft : clock(left)}
                        </span>
                        <span className="text-caption text-ink-soft mt-1 block font-bold">
                          {status === "rest" ? "초 뒤에 시작해요" : "남았어요"}
                        </span>
                      </span>
                    </Ring>
                  </div>

                  <div className="mt-3 flex min-h-11 items-center justify-center">
                    {status === "rest" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRestLeft((r) => r + REST_MORE);
                          setRestTotal((t) => t + REST_MORE);
                        }}
                        className="press bg-sub inline-flex min-h-11 items-center rounded-full px-4 text-sm font-extrabold"
                      >
                        +{REST_MORE}초 더 쉬기
                      </button>
                    ) : halfDone ? (
                      <button
                        type="button"
                        onClick={() => completeStep(activeSession.position, elapsed)}
                        className="press bg-done-soft text-done inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold"
                      >
                        <Check aria-hidden className="size-4" strokeWidth={3} />
                        완료하기
                      </button>
                    ) : (
                      <p className="text-caption text-ink-soft font-bold">
                        {secondsText(doneAt - elapsed)} 더 하면 완료할 수 있어요
                      </p>
                    )}
                  </div>

                  {/* 이전, 시작과 일시정지, 다음. 가운데가 가장 크다 */}
                  <div className="mt-3 flex items-center justify-center gap-5">
                    <button
                      type="button"
                      onClick={() => goTo(prevOpen)}
                      disabled={prevOpen == null || status === "rest"}
                      aria-label="이전 운동"
                      className="press bg-sub grid size-14 place-items-center rounded-full disabled:opacity-40"
                    >
                      <SkipBack aria-hidden className="size-6 fill-current" />
                    </button>
                    <button
                      type="button"
                      data-primary
                      onClick={status === "running" ? () => setStatus("paused") : start}
                      aria-label={status === "running" ? "잠깐 멈춤" : startLabel}
                      className={cn(
                        "press grid size-20 place-items-center rounded-full text-white",
                        status === "running" ? "bg-ink" : "bg-signal-strong",
                      )}
                    >
                      {status === "running" ? (
                        <Pause aria-hidden className="size-8 fill-current" />
                      ) : (
                        <Play aria-hidden className="size-8 translate-x-0.5 fill-current" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canNext}
                      aria-label={halfDone ? "완료하고 다음 운동" : "이 운동 건너뛰기"}
                      className="press bg-sub grid size-14 place-items-center rounded-full disabled:opacity-40"
                    >
                      <SkipForward aria-hidden className="size-6 fill-current" />
                    </button>
                  </div>
                  <p aria-hidden className="text-caption text-ink-soft mt-2 text-center font-bold">
                    {status === "running" ? "잠깐 멈춤" : startLabel}
                  </p>
                </section>
              ) : (
                <div className="card flex items-center gap-3">
                  {/* 썸네일과 이름을 누르면 운동 상세로. 지난 동작도 다시 볼 수 있다 */}
                  <StepLink href={sessionHref(s)}>
                    <StepThumb session={s} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-extrabold">{s.title}</span>
                      <span className="text-caption text-ink-soft mt-0.5 block truncate">
                        {exerciseLine(s)}
                      </span>
                      <span className="text-caption text-ink-soft block">
                        {PHASE_LABEL[s.phase]} {clock(secondsOf(s))}
                        {s.completed
                          ? ", 다 했어요"
                          : (elapsedBy[s.position] ?? 0) > 0 && ", 이어서 할 수 있어요"}
                      </span>
                    </span>
                  </StepLink>
                  {/* 이 동작으로 건너가기. 예전처럼 타이머가 도는 동안에는 누를 수 없다 */}
                  {!s.completed && !lockedBy && (
                    <button
                      type="button"
                      onClick={() => goTo(s.position)}
                      disabled={status === "running"}
                      aria-label={`${s.title} 하기`}
                      className="press bg-sub grid size-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
                    >
                      <Play aria-hidden className="size-4 translate-x-px fill-current" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div id="step-end" className="scroll-mt-48 pt-2 pb-6">
          {unsaved.length > 0 ? (
            // 못 보낸 칸이 있으면 「다 했어요」, 「알리기」 를 띄우지 않는다. 보호자가 빈 기록을 보게 된다
            <section className="card-hero text-center" role="alert">
              <p className="text-lead font-extrabold">{saveError ?? "기록을 남기지 못했어요."}</p>
              {stuckTo ? (
                <NavLink
                  href={stuckTo}
                  transitionTypes={["nav-back"]}
                  className="press text-ink-soft mt-2 inline-flex min-h-11 items-center px-4 text-sm font-bold"
                >
                  {stuckTo === "/login"
                    ? "로그인하러 가기"
                    : forParent
                      ? "운동으로 돌아가기"
                      : "홈으로"}
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={retry}
                  disabled={saving > 0}
                  className="press bg-signal-strong mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
                >
                  다시 보내기
                </button>
              )}
            </section>
          ) : finished && saving > 0 ? (
            <Skeleton className="h-80 w-full rounded-3xl" />
          ) : lockedBy && !allDone ? null : finished && forParent ? (
            <ParentFinish allDone={allDone} doneCount={doneCount} minutes={doneMin} home={home} />
          ) : finished ? (
            <Finish
              title={finishLine}
              allDone={allDone}
              moreToday={moreToday}
              doneCount={doneCount}
              minutes={doneMin}
              xp={xp}
              levelBefore={levelBefore}
              fresh={doneHere.length > 0}
              familyId={familyId ?? ""}
              kidId={kidId}
              missionId={missionId}
              toldNow={told}
              onTold={() => setTold(true)}
            />
          ) : (
            // 한 칸이라도 끝낸 뒤에만. 시작도 안 하고 누르면 「0개 했어요」 를 알리게 된다
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
        </div>
      </Stage>
    </>
  );
}

/** 운동을 받은 사람들. 「서준, 하윤의」 */
function ownerNames(participants: { name?: string | null }[] | undefined): string {
  const names = (participants ?? []).map((p) => p.name).filter(Boolean);
  return names.length > 0 ? `${names.join(", ")}의` : "다른 사람";
}

/** 지난 동작, 다음 동작 칸의 썸네일과 이름. 영상이 있으면 누르면 운동 상세로 */
function StepLink({ href, children }: { href: string | undefined; children: ReactNode }) {
  const row = "flex min-w-0 flex-1 items-center gap-3 text-left";
  return href ? (
    <NavLink href={href} className={cn("press", row)}>
      {children}
    </NavLink>
  ) : (
    <span className={row}>{children}</span>
  );
}

/** 동작 썸네일. 영상이 없으면 같은 크기의 빈 칸 */
function StepThumb({ session }: { session: MissionSession }) {
  const clip = session.clip;
  return clip?.videoId ? (
    <VideoThumb
      videoId={clip.videoId}
      src={clip.thumbnailUrl}
      className="aspect-video w-24 shrink-0 rounded-xl"
    />
  ) : (
    <span className="bg-sub block aspect-video w-24 shrink-0 rounded-xl" />
  );
}

/**
 * 지금 하는 칸의 시범 영상. 못 틀면 같은 단계 · 같은 요인의 다른 클립을 대신 틀 수 있게 넘긴다.
 * 지금 하는 칸에서만 그리니 다른 클립 목록도 그 칸 하나만 받는다
 */
function StepPlayer({
  clip,
  session,
  playing,
  onBlocked,
  onDuration,
}: {
  clip: NonNullable<MissionSession["clip"]>;
  session: MissionSession;
  playing: boolean;
  onBlocked: () => void;
  onDuration: (sec: number) => void;
}) {
  const { data } = useClips({ phase: session.phase, factor: session.factor ?? null });
  const alternates = (data?.clips ?? []).filter((c) => c.videoId !== clip.videoId).slice(0, 5);
  return (
    <ClipPlayer
      videoId={clip.videoId}
      startSec={clip.startSec ?? 0}
      endSec={clip.endSec ?? null}
      mediaUrl={clip.mediaUrl}
      thumbnailUrl={clip.thumbnailUrl}
      alternates={alternates}
      playing={playing}
      title={session.title}
      onBlocked={onBlocked}
      onDuration={onDuration}
    />
  );
}

const FEELS = [
  { id: "easy", label: "쉬웠어요" },
  { id: "good", label: "딱 좋아요" },
  { id: "hard", label: "힘들었어요" },
] as const;
type Feel = (typeof FEELS)[number]["id"];
/** 보호자한테 가는 말에 붙는 한 줄 */
const FEEL_LINE: Record<Feel, string> = {
  easy: "쉬웠어요.",
  good: "딱 좋았어요.",
  hard: "조금 힘들었어요.",
};

/** 끝 칸 — 다 했어요 · 경험치 · 어땠어요 · 알리기 */
function Finish({
  title,
  allDone,
  moreToday,
  doneCount,
  minutes,
  xp,
  levelBefore,
  fresh,
  familyId,
  kidId,
  missionId,
  toldNow,
  onTold,
}: {
  title: string;
  allDone: boolean;
  /** 오늘 할 운동이 더 남았다 — 이 운동만 끝났다 */
  moreToday: boolean;
  doneCount: number;
  minutes: number;
  xp: number;
  levelBefore: number | null;
  /** 이 화면에서 방금 끝냈나. 이미 다 한 운동을 다시 열었으면 나무가 또 자라지 않는다 */
  fresh: boolean;
  familyId: string;
  kidId: string;
  missionId: string;
  /** 이 화면에서 벌써 알렸나 */
  toldNow: boolean;
  onTold: () => void;
}) {
  // 다 한 직후에는 서버가 나무 수를 새로 센다. 옛 값으로 섬을 지었다가 다시 지으면
  // 나무가 두 번 자란다 — 새 값이 올 때까지 캐릭터만 세워 둔다
  const { data: progress, isFetching } = useProgress(kidId || undefined);
  const { data: family } = useFamilyProfiles(familyId);
  const send = useSendCheer(familyId);
  /*
    다 한 운동을 다시 열었으면 벌써 알렸는지 본다 — 또 알리면 부모에게 같은 말이 두 번 간다.
    알렸는지 받는 동안은 알리기를 내지 않는다(누르는 틈에 두 번 갔다). 못 받으면 알리기를 둔다 — 막히지 않게.
    부모가 벌써 스티커를 붙였으면 「기다리는 중」 이 아니다(규칙 12)
  */
  // 이 운동에 오간 것만 받는다(missionId) — 가족 전체 최근 20건에서 찾으면 응원이 쌓인 뒤 「알리기」 가 다시 떴다
  const { data: sent, isLoading: checking } = useCheers(
    fresh ? undefined : familyId,
    undefined,
    missionId,
  );
  const aboutThis = (sent?.cheers ?? []).filter((c) => c.missionId === missionId);
  const toldBefore = !fresh && aboutThis.some((c) => c.fromProfileId === kidId);
  const answered = !fresh && aboutThis.some((c) => c.toProfileId === kidId && c.stickerId);
  const told = toldNow || toldBefore;
  const [error, setError] = useState<string | null>(null);
  /** 어땠어요 — 고르면 보호자한테 가는 말에 붙는다. 안 골라도 된다 */
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
      // 보호자 모두에게. 아이에게 누구에게 알릴지 고르게 하지 않는다
      await Promise.all(
        parents.map((p) =>
          send.mutateAsync({
            fromProfileId: kidId,
            toProfileId: p.profileId ?? "",
            // 남는 말이라 「오늘」 을 넣지 않는다 — 다음 날 알림함에서 읽으면 틀린 말이 된다
            message: `${allDone ? (moreToday ? "운동 하나 다 했어요!" : "운동 다 했어요!") : `운동 ${doneCount}개 했어요!`}${feel ? ` ${FEEL_LINE[feel]}` : ""}`,
            missionId,
          }),
        ),
      );
      onTold();
    } catch (e) {
      setError(errorMessage(e, "알리지 못했어요."));
    }
  };

  return (
    <section className="card-hero text-center">
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
      <h2 className="page-title mt-1">{title}</h2>
      <p className="text-caption text-ink-soft mt-1 font-semibold">{minutes}분 움직였어요</p>

      {progress && (
        <div className="border-line mt-4 border-t pt-4 text-left">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-extrabold">
              {leveledUp ? `레벨이 올랐어요! Lv.${progress.level}` : `Lv.${progress.level}`}
            </p>
            {xp > 0 && <p className="text-signal-deep text-sm font-extrabold">+{xp} 경험치</p>}
          </div>
          <XpGauge progress={progress} className="mt-2" />
          {/* 레벨이 올라 새로 열린 것 — 위 섬에 방금 섰다 */}
          {opened.map((u) => (
            <p key={u.id} className="border-line mt-3 border-t pt-3 text-sm font-extrabold">
              {withJosa(u.name, "이가")} 새로 열렸어요
            </p>
          ))}
        </div>
      )}

      {/* 어땠어요 — 한 번 누르면 끝. 고르면 보호자한테 가는 말에 붙는다 */}
      {!told && !checking && (
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
          {answered ? "알렸어요" : "알렸어요. 답을 기다리는 중이에요"}
        </p>
      ) : checking ? (
        <Skeleton className="mt-4 h-14 w-full rounded-2xl" />
      ) : (
        parents.length > 0 && (
          <button
            type="button"
            onClick={() => void tell()}
            disabled={send.isPending}
            className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
          >
            {send.isPending ? "알리는 중" : `${guardiansName(parents)}한테 알리기`}
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

/**
 * 보호자의 끝 칸. 한 만큼만 짧게 말한다. 섬과 경험치는 아이의 것이고, 보호자는 알릴 사람이 없다.
 * 아이가 같은 운동을 하면 아이의 칸은 아이가 끝낸다(보호자가 끝낸 칸이 아이 것이 되지 않는다)
 */
function ParentFinish({
  allDone,
  doneCount,
  minutes,
  home,
}: {
  allDone: boolean;
  doneCount: number;
  minutes: number;
  home: string;
}) {
  return (
    <section className="card-hero flex flex-col items-center text-center" aria-live="polite">
      <ArtIcon name="icon/mode-full" className="size-16" />
      <h2 className="page-title mt-2">
        {allDone ? "오늘 운동 다 했어요!" : `${doneCount}개 했어요!`}
      </h2>
      <p className="text-caption text-ink-soft mt-1 font-semibold">{minutes}분 움직였어요</p>
      <NavLink
        href={home}
        transitionTypes={["nav-back"]}
        className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white"
      >
        운동으로 돌아가기
      </NavLink>
    </section>
  );
}

function PlaySkeleton({ home }: { home: string }) {
  return (
    <>
      <AppBar backHref={home} title="오늘 운동" />
      <Stage wide className="space-y-3 pt-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
