import { Check } from "lucide-react";

import { Card, CardHead } from "@/components/ui/card";
import { UNLOCKS } from "@/lib/unlocks";
import { cn } from "@/lib/utils";

/**
 * 레벨마다 열리는 것 — 레벨이 오를수록 앱이 넓어진다는 걸 한눈에.
 *
 * 연 것은 체크, 다음 하나는 파랑 「Lv.N」, 그 뒤는 옅게. 아직인 것을 못 한 것처럼 말하지 않는다.
 * 둥근 바탕 안에 숫자를 넣지 않는다 — 체크 · 글자만(9/25).
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
                  "w-11 shrink-0 text-sm font-extrabold tabular-nums",
                  next ? "text-signal-deep" : "text-faint",
                )}
              >
                {open ? (
                  <Check aria-label="열림" className="text-signal size-5" strokeWidth={3} />
                ) : (
                  `Lv.${u.level}`
                )}
              </span>
              <p
                className={cn(
                  "min-w-0 flex-1 text-sm font-extrabold",
                  !open && !next && "text-ink-soft",
                )}
              >
                섬 · {u.name}
              </p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
