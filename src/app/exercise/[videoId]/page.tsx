"use client";

import { Check, Pause, Play } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ClipPlayer } from "@/components/domain/clip-player";
import { FactorIcon } from "@/components/domain/factor-icon";
import type { SessionPhase } from "@/lib/api/types";
import type { Factor } from "@/lib/fitness-factors";
import { PHASE_LABEL } from "@/lib/session-plan";
import { cn } from "@/lib/utils";
import { readExercise, type Exercise } from "@/lib/videos";

/**
 * 운동 상세. 위에 시범 영상, 아래에 이름, 시간, 단계, 기르는 체력, 하는 법, 출처.
 * 삼성헬스 운동 화면처럼 영상이 맨 위를 차지하고 숫자 몇 개가 한 줄로 선다.
 *
 * 클립 하나를 받는 API 가 없어서 클립을 누른 화면이 주소에 담아 보낸 값만 쓴다(`exerciseHref`).
 * 모르는 칸은 그리지 않는다. 아이도 보는 화면이라 어른 말(보호자, 제안 …)을 쓰지 않는다.
 */
const FACTOR_TEXT: Record<Factor, string> = {
  심폐지구력: "숨이 차도 오래 움직이는 힘이에요",
  근력: "무거운 것을 들거나 밀어내는 힘이에요",
  근지구력: "같은 동작을 여러 번 되풀이하는 힘이에요",
  유연성: "몸을 부드럽게 굽히고 펴는 힘이에요",
  민첩성: "몸의 방향을 재빨리 바꾸는 힘이에요",
  순발력: "짧은 순간에 힘껏 뛰어오르는 힘이에요",
};

const PHASE_TEXT: Record<SessionPhase, string> = {
  WARMUP: "몸을 데워서 다치지 않게 준비해요",
  MAIN: "오늘 키울 힘을 기르는 운동이에요",
  COOLDOWN: "움직인 몸을 천천히 풀어 줘요",
};

export default function ExercisePage() {
  return (
    <Suspense fallback={<AppBar back title="운동 정보" />}>
      <Detail />
    </Suspense>
  );
}

function decoded(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 72 → 1분 12초 */
function duration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m === 0) return `${rest}초`;
  return rest === 0 ? `${m}분` : `${m}분 ${rest}초`;
}

function Detail() {
  const { videoId } = useParams<{ videoId: string }>();
  const params = useSearchParams();
  const ex = readExercise(decoded(videoId ?? ""), params);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <AppBar back title="운동 정보" />
      <Stage wide className="space-y-4 pb-8">
        <div className="space-y-2">
          <ClipPlayer
            videoId={ex.videoId}
            startSec={ex.startSec ?? 0}
            endSec={ex.endSec}
            mediaUrl={ex.mediaUrl}
            thumbnailUrl={ex.thumbnailUrl}
            playing={playing}
            title={ex.title}
            onBlocked={() => setPlaying(false)}
          />
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="press bg-signal-strong flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
          >
            {playing ? (
              <Pause aria-hidden className="size-4 fill-current" />
            ) : (
              <Play aria-hidden className="size-4 fill-current" />
            )}
            {playing ? "멈추기" : "영상 재생"}
          </button>
        </div>

        <header className="px-1">
          {ex.phase && (
            <p className="text-signal-deep text-sm font-extrabold">{PHASE_LABEL[ex.phase]}</p>
          )}
          <h1 className="mt-0.5 text-2xl leading-tight font-extrabold">{ex.title}</h1>
          <p className="text-caption text-ink-soft mt-1 font-semibold">국민체력100 운동영상</p>
        </header>

        <Stats ex={ex} />

        {ex.factor && (
          <section className="card" aria-label="기르는 체력">
            <h2 className="card-head">기르는 체력</h2>
            <div className="mt-3 flex items-center gap-3">
              <FactorIcon factor={ex.factor} className="size-12 shrink-0" />
              <div className="min-w-0">
                <p className="font-extrabold">{ex.factor}</p>
                <p className="text-caption text-ink-soft">{FACTOR_TEXT[ex.factor]}</p>
              </div>
            </div>
          </section>
        )}

        <HowTo ex={ex} />

        <section className="card" aria-label="출처">
          <h2 className="card-head">출처</h2>
          <p className="mt-2 text-sm font-bold">국민체력100 운동영상</p>
          <p className="text-caption text-ink-soft">
            국민체육진흥공단이 만든 영상에서 이 동작만 잘라 보여 드려요
          </p>
        </section>
      </Stage>
    </>
  );
}

const COLS = ["grid-cols-1", "grid-cols-2", "grid-cols-3"];

/** 숫자 몇 개(시간, 단계, 체력)를 한 줄로 세운다. 모르는 칸은 빼고 남은 것만 나눠 선다 */
function Stats({ ex }: { ex: Exercise }) {
  const length = ex.startSec != null && ex.endSec != null ? ex.endSec - ex.startSec : null;
  const time = ex.minutes != null ? `${ex.minutes}분` : length != null ? duration(length) : null;
  const items = [
    time && { label: "운동 시간", value: time },
    ex.phase && { label: "단계", value: PHASE_LABEL[ex.phase] },
    ex.factor && { label: "체력", value: ex.factor },
  ].filter((v): v is { label: string; value: string } => Boolean(v));
  if (items.length === 0) return null;

  return (
    <dl className={cn("card divide-line grid divide-x py-4", COLS[items.length - 1])}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col-reverse items-center gap-1 px-1 text-center">
          <dt className="metric-label">{it.label}</dt>
          <dd className="metric-value text-lg break-keep">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 하는 법. 서버가 준 태그(집에서, 조용함, 도구)와 단계로만 적는다 */
function HowTo({ ex }: { ex: Exercise }) {
  const lines = [
    "영상 속 동작을 보면서 똑같이 따라 해요",
    ex.phase && PHASE_TEXT[ex.phase],
    ex.homeOk && "집에서 할 수 있어요",
    ex.quiet && "쿵쿵 뛰는 소리가 나지 않아요",
    ex.props === true && "도구가 필요해요",
    ex.props === false && "도구 없이 할 수 있어요",
  ].filter((v): v is string => Boolean(v));

  return (
    <section className="card" aria-label="이렇게 해요">
      <h2 className="card-head">이렇게 해요</h2>
      <ul className="mt-2 space-y-2">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm">
            <Check
              aria-hidden
              className="text-signal-deep mt-0.5 size-4 shrink-0"
              strokeWidth={3}
            />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
