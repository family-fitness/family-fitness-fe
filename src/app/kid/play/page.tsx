"use client";

import { Play } from "lucide-react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgress } from "@/lib/api/queries";
import { UNLOCKS, nextUnlock, type Unlock } from "@/lib/unlocks";
import { cn, withJosa } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

type Game = Extract<Unlock, { kind: "game" }>;

/**
 * 놀이터 — 레벨이 오르면 하나씩 열리는 몸 놀이.
 *
 * 폰은 심판이고 몸이 논다. 운동을 화면 시간으로 바꿔 주는 곳이 아니다 — 놀이 자체가 움직임이다.
 * 점수 · 순위를 매기지 않는다. 아직인 놀이는 「Lv.N이 되면」 — 못 한 것이 아니라 아직인 것이다.
 *
 * 맨 위는 가장 최근에 열린 놀이 하나. 해야 할 일은 그 버튼 하나다.
 */
export default function PlaygroundPage() {
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: progress, isPending, error, refetch } = useProgress(childProfileId ?? undefined);

  if (isPending) return <PlaygroundSkeleton />;
  if (error || !progress) {
    return (
      <>
        <AppBar backHref="/kid" title="놀이터" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  const level = progress.level;
  const games = UNLOCKS.filter((u): u is Game => u.kind === "game");
  const open = games.filter((g) => g.level <= level);
  const hero = open.at(-1) ?? games[0];
  const next = nextUnlock(level);

  return (
    <>
      <AppBar backHref="/kid" title="놀이터" />
      <Stage wide className="space-y-3">
        <section className="card-hero">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-caption text-signal-deep font-extrabold">몸으로 하는 놀이</p>
              <h2 className="text-lead mt-0.5 font-extrabold">{hero.name}</h2>
              <p className="text-caption text-ink-soft mt-1 leading-relaxed">{hero.line}</p>
            </div>
            <ArtIcon name={`play/play-${hero.id}`} className="size-20 shrink-0" />
          </div>
          <NavLink
            href={`/kid/play/${hero.id}`}
            className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
          >
            <Play aria-hidden className="size-5 fill-current" />
            시작하기
          </NavLink>
        </section>

        <ul className="card divide-rows py-1" aria-label="놀이 전부">
          {games.map((g) => (
            <GameRow key={g.id} game={g} open={g.level <= level} />
          ))}
        </ul>

        {next && (
          <p className="text-caption text-ink-soft px-2 text-center leading-relaxed font-semibold">
            {withJosa(`Lv.${next.level}`, "이가")} 되면 {next.kind === "game" ? "놀이터에" : "섬에"}{" "}
            {withJosa(next.name, "이가")} 생겨요
          </p>
        )}
        <p className="text-caption text-faint px-2 text-center leading-relaxed">
          뛰기 전에 주변에 부딪힐 것이 없는지 먼저 봐요
        </p>
      </Stage>
    </>
  );
}

function GameRow({ game, open }: { game: Game; open: boolean }) {
  const body = (
    <>
      <ArtIcon
        name={`play/play-${game.id}`}
        className={cn("size-12 shrink-0", !open && "opacity-50")}
      />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-extrabold", !open && "text-ink-soft")}>
          {game.name}
        </span>
        <span className="text-caption text-ink-soft mt-0.5 block">
          {open ? game.line : `${withJosa(`Lv.${game.level}`, "이가")} 되면 열려요`}
        </span>
      </span>
    </>
  );
  return (
    <li>
      {open ? (
        <NavLink
          href={`/kid/play/${game.id}`}
          className="press flex min-h-16 items-center gap-3 py-2.5"
        >
          {body}
        </NavLink>
      ) : (
        <div className="flex min-h-16 items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

function PlaygroundSkeleton() {
  return (
    <>
      <AppBar backHref="/kid" title="놀이터" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
