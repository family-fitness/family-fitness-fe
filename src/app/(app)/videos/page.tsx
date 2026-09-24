"use client";

import { ChevronRight, Heart, Play, Plus, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { EmptyState } from "@/components/ui/empty-state";
import { NavLink } from "@/components/ui/nav-link";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { ClipPlayer } from "@/components/domain/clip-player";
import { FactorIcon } from "@/components/domain/factor-icon";
import type { ClipView, SessionPhase } from "@/lib/api/types";
import { useClips, useToggleClipFavorite } from "@/lib/api/queries";
import { FACTORS, isFactor, type Factor } from "@/lib/fitness-factors";
import { routineMinutes } from "@/lib/routine";
import { PHASE_LABEL, clock } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * 운동 찾기 — 키우고 싶은 힘으로.
 *
 * AI 편성과 다른 길이다. 부모가 「우리 애 유연성 좀」 하고 직접 고른다(회의: 검색이 안
 * 되면 카테고리를 눌렀을 때 해당 영상이 쫙 나오게). 고른 동작을 담아 **직접 짜기**로
 * 가져가면 차례 · 시간 · 누가 · 언제를 정해 그날의 운동이 된다 — 직접 짠 루틴이다.
 *
 * 한 줄이 영상 한 편이 아니라 **영상 속 한 동작**이다. 국민체력100 영상 한 편에 동작이
 * 여럿 들어 있어서, 편 단위로는 고를 수가 없었다.
 *
 * 아이 화면에서는 보고 즐겨찾기만 한다. 오늘 운동을 만드는 건 부모다.
 */
const PHASES: { value: SessionPhase | null; label: string }[] = [
  { value: null, label: "전체" },
  { value: "WARMUP", label: "준비" },
  { value: "MAIN", label: "본" },
  { value: "COOLDOWN", label: "정리" },
];

export default function VideosPage() {
  return (
    <Suspense fallback={<FinderSkeleton />}>
      <Finder />
    </Suspense>
  );
}

function Finder() {
  const params = useSearchParams();
  const kidView = useIsKidView();
  const { profile } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  // 즐겨찾기는 누구의 것인가. 아이 화면이면 아이, 부모 화면이면 보고 있는 아이
  const owner = kidView ? (childProfileId ?? undefined) : (childProfileId ?? profile?.profileId);

  const initialFactor = params.get("factor");
  const [factor, setFactor] = useState<Factor | null>(
    isFactor(initialFactor) ? initialFactor : null,
  );
  const [phase, setPhase] = useState<SessionPhase | null>(null);
  const [quiet, setQuiet] = useState(false);
  const [q, setQ] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(params.get("list") === "favorites");
  // 담은 동작은 직접 짜기와 같이 본다 — 두 화면을 오가도 남는다
  const moves = useRoutineStore((s) => s.moves);
  // 탭 저장소를 읽은 뒤에야 담은 것이 보인다. 그 전에는 쟁반을 내지 않는다(첫 화면과 어긋나지 않게)
  useRoutineReady();
  const toggleMove = useRoutineStore((s) => s.toggle);
  const clearMoves = useRoutineStore((s) => s.clear);
  const [preview, setPreview] = useState<ClipView | null>(null);

  const { data, isPending, isFetching } = useClips({
    factor,
    phase,
    quiet,
    q: q.trim(),
    list: favoritesOnly ? "FAVORITES" : "ALL",
    profileId: owner,
  });
  const clips = data?.clips ?? [];

  const inTray = (c: ClipView) => moves.some((m) => m.clip.clipId === c.clipId);

  return (
    <>
      <AppBar back title="운동 찾기" />
      <Stage wide className={cn("space-y-3", moves.length > 0 && !kidView && "pb-32")}>
        <label className="card flex items-center gap-2 py-2">
          <Search aria-hidden className="text-faint size-5 shrink-0" />
          <span className="sr-only">동작 이름으로 찾기</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 20))}
            placeholder="동작 이름으로 찾기 — 스쿼트, 스트레칭"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="지우기"
              className="press text-faint grid size-11 shrink-0 place-items-center"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        {/* 키우고 싶은 힘 — 이 화면의 주된 고르기 */}
        <div className="scroll-row -mx-4 px-4">
          <ul className="flex gap-2" aria-label="키우고 싶은 힘">
            <li>
              <button
                type="button"
                aria-pressed={factor === null}
                onClick={() => setFactor(null)}
                className={cn("chip press", factor === null && "chip-on")}
              >
                전체
              </button>
            </li>
            {FACTORS.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  aria-pressed={factor === f}
                  onClick={() => setFactor(f)}
                  className={cn("chip press gap-1.5 pl-3", factor === f && "chip-on")}
                >
                  <FactorIcon factor={f} className="size-5" />
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="bg-paper shadow-card flex rounded-full p-1"
            role="group"
            aria-label="준비 · 본 · 정리"
          >
            {PHASES.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={phase === p.value}
                onClick={() => setPhase(p.value)}
                className={cn(
                  "press min-h-10 min-w-11 rounded-full px-3 text-sm font-bold",
                  phase === p.value ? "bg-signal-strong text-white" : "text-ink-soft",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={quiet}
            onClick={() => setQuiet((v) => !v)}
            className={cn("chip press", quiet && "chip-on")}
          >
            조용한 것만
          </button>
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn("chip press gap-1", favoritesOnly && "chip-on")}
          >
            <Heart aria-hidden className={cn("size-4", favoritesOnly && "fill-current")} />
            즐겨찾기
          </button>
        </div>

        <p className="text-caption text-ink-soft px-1 font-bold" aria-live="polite">
          {isPending ? "찾는 중" : `${factor ?? "모든 힘"} · ${data?.total ?? 0}개`}
          {isFetching && !isPending && " · 새로 찾는 중"}
        </p>

        {isPending ? (
          <ListSkeleton />
        ) : clips.length === 0 ? (
          <EmptyState
            scene="no-mission"
            title={favoritesOnly ? "아직 즐겨찾기한 동작이 없어요" : "조건에 맞는 동작이 없어요"}
            description={
              favoritesOnly ? "마음에 드는 동작에 하트를 눌러 두세요." : "조건을 하나 풀어 볼까요?"
            }
          />
        ) : (
          <ul className="card divide-rows py-1">
            {clips.map((c) => (
              <ClipRow
                key={c.clipId}
                clip={c}
                owner={owner}
                picked={inTray(c)}
                canPick={!kidView}
                onPick={() => toggleMove(c)}
                onPreview={() => setPreview(c)}
              />
            ))}
          </ul>
        )}
      </Stage>

      {!kidView && moves.length > 0 && <Tray onClear={clearMoves} />}

      <Sheet open={preview != null} onClose={() => setPreview(null)} title={preview?.title ?? ""}>
        {preview && <Preview clip={preview} />}
      </Sheet>
    </>
  );
}

function ClipRow({
  clip: c,
  owner,
  picked,
  canPick,
  onPick,
  onPreview,
}: {
  clip: ClipView;
  owner: string | undefined;
  picked: boolean;
  canPick: boolean;
  onPick: () => void;
  onPreview: () => void;
}) {
  const favorite = useToggleClipFavorite(owner ?? "");
  const length = c.endSec - c.startSec;

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`${c.title} 시범 보기`}
        className="press relative shrink-0 overflow-hidden rounded-xl"
      >
        <VideoThumb videoId={c.videoId} className="aspect-video w-28" />
        <span className="text-micro absolute right-1 bottom-1 rounded-md bg-black/70 px-1.5 py-0.5 font-bold text-white">
          {clock(length)}
        </span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-8 place-items-center rounded-full bg-black/45 text-white">
            <Play aria-hidden className="size-4 fill-current" />
          </span>
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug font-bold">{c.title}</p>
        <p className="text-caption text-ink-soft mt-0.5">
          {PHASE_LABEL[c.phase]}
          {c.factor && ` · ${c.factor}`}
          {c.quiet && " · 조용함"}
          {c.props && " · 도구 필요"}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        {owner && (
          <button
            type="button"
            aria-pressed={c.favorited}
            aria-label={c.favorited ? `${c.title} 즐겨찾기 빼기` : `${c.title} 즐겨찾기`}
            disabled={favorite.isPending}
            onClick={() => favorite.mutate({ clipId: c.clipId, favorited: !c.favorited })}
            className="press grid size-11 place-items-center"
          >
            <Heart
              aria-hidden
              className={cn("size-5", c.favorited ? "fill-signal text-signal" : "text-faint")}
            />
          </button>
        )}
        {canPick && (
          <button
            type="button"
            aria-pressed={picked}
            aria-label={picked ? `${c.title} 빼기` : `${c.title} 담기`}
            onClick={onPick}
            className={cn(
              "press grid size-11 place-items-center rounded-full",
              picked ? "bg-signal-strong text-white" : "bg-sub text-ink",
            )}
          >
            {picked ? (
              <X aria-hidden className="size-4" />
            ) : (
              <Plus aria-hidden className="size-5" />
            )}
          </button>
        )}
      </div>
    </li>
  );
}

/** 시범 보기. 누르면 그 동작 구간만 되풀이한다 */
function Preview({ clip }: { clip: ClipView }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div>
      <ClipPlayer
        videoId={clip.videoId}
        startSec={clip.startSec}
        endSec={clip.endSec}
        playing={playing}
        title={clip.title}
      />
      <p className="text-caption text-ink-soft mt-2">
        {PHASE_LABEL[clip.phase]}
        {clip.factor && ` · ${clip.factor}`} · {clock(clip.endSec - clip.startSec)}
      </p>
      <button
        type="button"
        onClick={() => setPlaying((v) => !v)}
        className="press bg-signal-strong mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-extrabold text-white"
      >
        {playing ? "멈추기" : "시범 보기"}
      </button>
    </div>
  );
}

/**
 * 담은 동작 — 아래에 붙는 쟁반. 누르면 직접 짜기로 간다.
 *
 * 차례 · 시간 · 누가 · 언제는 직접 짜기에서 정한다(오늘 · 지금 보는 아이가 기본이라
 * 오늘 운동 하나면 두 번 누르면 된다). 열 개까지만 담는다(회의: 열 개가 넘으면 짜증난다).
 */
function Tray({ onClear }: { onClear: () => void }) {
  const moves = useRoutineStore((s) => s.moves);
  const minutes = routineMinutes(moves);

  return (
    <Dock>
      <div className="card-hero flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">
            담은 동작 {moves.length}개 · {minutes}분
          </p>
          <button
            type="button"
            onClick={onClear}
            className="press text-caption text-ink-soft -ml-1 min-h-10 px-1 font-semibold"
          >
            모두 빼기
          </button>
        </div>
        <NavLink
          href="/plan/custom"
          className="press bg-signal-strong flex min-h-12 shrink-0 items-center gap-1 rounded-2xl px-4 text-sm font-extrabold text-white"
        >
          짜러 가기
          <ChevronRight aria-hidden className="size-4" />
        </NavLink>
      </div>
    </Dock>
  );
}

function ListSkeleton() {
  return (
    <div className="card space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="aspect-video w-28 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FinderSkeleton() {
  return (
    <>
      <AppBar back title="운동 찾기" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-14 w-full rounded-3xl" />
        <Skeleton className="h-11 w-full rounded-full" />
        <ListSkeleton />
      </Stage>
    </>
  );
}
