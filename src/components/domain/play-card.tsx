import { Card, CardHead } from "@/components/ui/card";
import { UNLOCKS, nextUnlock, type Unlock } from "@/lib/unlocks";
import { cn, withJosa } from "@/lib/utils";

type Game = Extract<Unlock, { kind: "game" }>;

/**
 * 아이 홈의 놀이터 카드 — 보러 가는 길이지 해야 할 일이 아니다(해야 할 일은 오늘 운동 하나).
 * 열린 놀이는 진하게, 아직인 놀이는 「Lv.N」 만 옅게. 다음에 열릴 것 한 줄.
 */
export function PlayCard({ level }: { level: number | null | undefined }) {
  const lv = Math.max(1, level ?? 1);
  const games = UNLOCKS.filter((u): u is Game => u.kind === "game");
  const open = games.filter((g) => g.level <= lv);
  const next = nextUnlock(lv);

  return (
    <Card href="/kid/play" label={`놀이터 — ${open.map((g) => g.name).join(", ")}`}>
      <CardHead title="놀이터" meta={`몸 놀이 ${open.length}가지`} chevron />
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {games.map((g) => {
          const on = g.level <= lv;
          return (
            <li
              key={g.id}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-extrabold",
                on ? "bg-signal-soft text-signal-deep" : "bg-sub text-faint",
              )}
            >
              {g.name}
              {!on && ` · Lv.${g.level}`}
            </li>
          );
        })}
      </ul>
      {next && (
        <p className="text-caption text-ink-soft mt-3 font-semibold">
          {withJosa(`Lv.${next.level}`, "이가")} 되면 {next.kind === "game" ? "놀이터에" : "섬에"}{" "}
          {withJosa(next.name, "이가")} 생겨요
        </p>
      )}
    </Card>
  );
}
