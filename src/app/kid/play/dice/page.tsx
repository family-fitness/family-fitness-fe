"use client";

import { Check, Dices } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { DICE_SETTLE_MS, MoveDice } from "@/components/scene/move-dice";
import { DICE_FACES, pick } from "@/lib/play";

/**
 * 운동 주사위 — 굴려서 나온 동작을 한다.
 *
 * 해야 할 일은 늘 버튼 하나다: 굴리기 → (구르는 동안 없음) → 다 했어요 → 한 번 더.
 * 몇 번 했는지는 이 화면에서만 센다. 저장하지 않고 순위도 없다 — 그냥 논다.
 */
type Phase = "ready" | "rolling" | "landed";

export default function DicePage() {
  const [roll, setRoll] = useState<{ n: number; face: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [done, setDone] = useState(0);

  // 주사위가 끝났다고 알려 오지 않아도(입체를 못 받은 기기) 조금 뒤에는 결과를 낸다
  useEffect(() => {
    if (phase !== "rolling") return;
    const id = setTimeout(() => setPhase((p) => (p === "rolling" ? "landed" : p)), DICE_SETTLE_MS);
    return () => clearTimeout(id);
  }, [phase, roll?.n]);

  const throwDice = () => {
    if (phase === "rolling") return;
    setRoll((r) => ({ n: (r?.n ?? 0) + 1, face: pick(DICE_FACES.length, r?.face) }));
    setPhase("rolling");
  };

  const face = roll ? DICE_FACES[roll.face] : null;

  return (
    <>
      <AppBar backHref="/kid/play" title="운동 주사위" />
      <Stage wide className="space-y-3">
        <section className="card-hero text-center">
          <MoveDice
            faces={DICE_FACES}
            roll={roll}
            onLanded={() => setPhase("landed")}
            onTap={throwDice}
            height={250}
            className="-mt-2"
          />

          <div aria-live="polite" className="min-h-24">
            {phase === "landed" && face ? (
              <>
                <p className="text-caption text-signal-deep font-extrabold">나왔어요</p>
                <p className="text-metric mt-1 leading-tight font-extrabold">{face.name}</p>
                <p className="text-signal-deep text-lead mt-0.5 font-extrabold">{face.amount}</p>
              </>
            ) : phase === "rolling" ? (
              <p className="text-lead pt-6 font-extrabold">데굴데굴…</p>
            ) : (
              <>
                <p className="text-lead pt-3 font-extrabold">
                  {done > 0 ? "한 번 더 굴려 볼까요?" : "굴려서 나온 동작을 해요"}
                </p>
                <p className="text-caption text-ink-soft mt-1">주사위를 눌러도 굴러가요</p>
              </>
            )}
          </div>

          {phase === "landed" ? (
            <button
              type="button"
              onClick={() => {
                setDone((d) => d + 1);
                setPhase("ready");
              }}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
            >
              <Check aria-hidden className="size-5" strokeWidth={3} />다 했어요
            </button>
          ) : (
            <button
              type="button"
              onClick={throwDice}
              disabled={phase === "rolling"}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white disabled:opacity-60"
            >
              <Dices aria-hidden className="size-5" />
              {done > 0 ? "한 번 더 굴리기" : "굴리기"}
            </button>
          )}
        </section>

        {done > 0 && (
          <p className="text-caption text-ink-soft text-center font-semibold">
            지금까지 {done}번 했어요
          </p>
        )}
        <p className="text-caption text-faint px-2 text-center leading-relaxed">
          뛰기 전에 주변에 부딪힐 것이 없는지 먼저 봐요
        </p>
      </Stage>
    </>
  );
}
