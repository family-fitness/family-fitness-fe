import { Check } from "lucide-react";

import { Card, CardHead } from "@/components/ui/card";
import { UNLOCKS } from "@/lib/unlocks";
import { cn, withJosa } from "@/lib/utils";

/**
 * 레벨마다 열리는 것 — 레벨이 오를수록 앱이 넓어진다는 걸 한눈에.
 *
 * 연 것은 체크, 다음 하나는 파랑으로 「다음」, 그 뒤는 옅게. 아직인 것을 못 한 것처럼 말하지 않는다.
 */
export function UnlockLadder({ level }: { level: number }) {
  const nextLevel = UNLOCKS.find((u) => u.level > level)?.level ?? null;
  return (
    <Card>
      <CardHead title="레벨마다 열리는 것" meta={`Lv.${level}`} />
      <ol className="divide-rows mt-1">
        {UNLOCKS.map((u) => {
          const open = u.level <= level;
          const next = u.level === nextLevel;
          return (
            <li
              key={u.id}
              className="flex items-center gap-3 py-2.5"
              aria-current={next ? "step" : undefined}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-xs font-extrabold tabular-nums",
                  open && "bg-signal text-white",
                  next && "ring-signal text-signal-deep bg-paper ring-2",
                  !open && !next && "bg-sub text-faint",
                )}
              >
                {open ? <Check aria-hidden className="size-4" strokeWidth={3} /> : u.level}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-extrabold", !open && !next && "text-ink-soft")}>
                  섬 · {u.name}
                </p>
                {next && (
                  <p className="text-caption text-ink-soft mt-0.5">
                    다음이에요 — {withJosa(`Lv.${u.level}`, "이가")} 되면
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
