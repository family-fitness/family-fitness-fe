"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { CardHead } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { AvailabilitySlot, Weekday } from "@/lib/api/types";
import { useAvailability, useFamilyProfiles, useSaveAvailability } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

/**
 * 운동할 수 있는 시간 — 사람마다 한 주.
 *
 * AI 편성이 「몇 분」 의 기본값으로 쓴다. **막는 데 쓰지 않는다** — 적어 둔 시간이
 * 아니라고 운동을 못 하게 하지 않는다. 언제 하겠다는 가족의 약속이다(9/23 회의).
 */
const DAYS: { code: Weekday; label: string }[] = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
];
const MINUTES = [10, 20, 30, 40] as const;
/** 고를 수 있는 시각. 아침 6시부터 밤 9시까지 30분 단위 */
const TIMES = Array.from({ length: 31 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

const PRESETS: { label: string; slots: AvailabilitySlot[] }[] = [
  {
    label: "평일 저녁",
    slots: (["MON", "TUE", "WED", "THU", "FRI"] as Weekday[]).map((day) => ({
      day,
      start: "19:00",
      minutes: 20,
    })),
  },
  {
    label: "주말 오전",
    slots: (["SAT", "SUN"] as Weekday[]).map((day) => ({ day, start: "10:00", minutes: 30 })),
  },
];

function timeLabel(start: string) {
  const [h, m] = start.split(":").map(Number);
  const part = h < 12 ? "오전" : h < 18 ? "오후" : "저녁";
  const hour = h > 12 ? h - 12 : h;
  return `${part} ${hour}시${m ? ` ${m}분` : ""}`;
}

export default function SchedulePage() {
  return (
    <ParentOnly>
      <Schedule />
    </ParentOnly>
  );
}

function Schedule() {
  const { familyId } = useSession();
  const { data: family, isPending: familyPending } = useFamilyProfiles(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const people = family?.profiles ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  // 처음에는 보고 있던 아이. 아이가 없으면 첫 사람
  const who =
    people.find((p) => p.profileId === picked) ??
    people.find((p) => p.profileId === childProfileId) ??
    people.find((p) => p.role === "CHILD") ??
    people[0];

  return (
    <>
      <AppBar backHref="/settings" title="운동할 수 있는 시간" />
      <Stage wide className="space-y-3 pb-28">
        {familyPending ? (
          <Skeleton className="h-11 w-56 rounded-full" />
        ) : (
          <div className="scroll-row -mx-4 px-4">
            <ul className="flex gap-2" aria-label="누구의 시간인가요">
              {people.map((p) => {
                const on = p.profileId === who?.profileId;
                return (
                  <li key={p.profileId}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPicked(p.profileId ?? null)}
                      className={cn(
                        "press flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1",
                        on ? "bg-signal-strong text-white" : "bg-paper shadow-card",
                      )}
                    >
                      <ProfileAvatar
                        profileId={p.profileId}
                        name={p.name}
                        size="sm"
                        tone={on ? "sub" : p.role === "CHILD" ? "signal" : "mark"}
                      />
                      <span className="text-sm font-bold">{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {who?.profileId && (
          <WeekEditor key={who.profileId} profileId={who.profileId} name={who.name ?? ""} />
        )}
      </Stage>
    </>
  );
}

/** 한 사람의 한 주. 사람을 바꾸면 새로 그린다(key) — 고치던 것이 다른 사람에게 새지 않게 */
function WeekEditor({ profileId, name }: { profileId: string; name: string }) {
  const { data, isPending } = useAvailability(profileId);
  const save = useSaveAvailability(profileId);
  const [draft, setDraft] = useState<AvailabilitySlot[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (isPending) return <Skeleton className="h-96 w-full rounded-3xl" />;

  const slots = draft ?? data?.slots ?? [];
  const byDay = new Map(slots.map((s) => [s.day, s]));
  const total = slots.reduce((sum, s) => sum + s.minutes, 0);
  const changed = draft != null;

  const edit = (next: AvailabilitySlot[]) => {
    setSaved(false);
    // 요일 차례대로 둔다. 누른 차례로 두면 저장한 목록이 뒤죽박죽이다
    const order = DAYS.map((d) => d.code);
    setDraft([...next].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day)));
  };
  const setDay = (day: Weekday, slot: AvailabilitySlot | null) =>
    edit([...slots.filter((s) => s.day !== day), ...(slot ? [slot] : [])]);

  const submit = async () => {
    setProblem(null);
    try {
      await save.mutateAsync(slots);
      setDraft(null);
      setSaved(true);
    } catch (e) {
      setProblem(
        errorMessage(
          e,
          { INVALID_SLOT: "시각이나 시간이 맞지 않는 칸이 있어요." },
          "저장하지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
    }
  };

  return (
    <>
      <section className="card-hero">
        <p className="metric-label">{name}의 한 주</p>
        <p className="metric-value text-metric mt-1">
          {slots.length}
          <span className="metric-unit">번</span>
          <span className="text-ink-soft ml-2 text-base font-bold">모두 {total}분</span>
        </p>
        {/* 한 주 일곱 칸 — 적어 둔 날만 채운다 */}
        <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden>
          {DAYS.map((d) => {
            const s = byDay.get(d.code);
            return (
              <li key={d.code} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid h-10 w-full place-items-center rounded-xl text-xs font-extrabold",
                    s ? "bg-signal-strong text-white" : "bg-sub text-faint",
                  )}
                >
                  {s ? s.minutes : ""}
                </span>
                <span className="text-micro text-ink-soft font-bold">{d.label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <CardHead title="빠르게 고르기" />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                edit([...slots.filter((s) => !p.slots.some((x) => x.day === s.day)), ...p.slots])
              }
              className="chip press"
            >
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => edit([])} className="chip press">
            모두 비우기
          </button>
        </div>
      </section>

      <section className="card divide-rows py-1" aria-label="요일마다">
        {DAYS.map((d) => {
          const s = byDay.get(d.code);
          return (
            <div key={d.code} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold">
                  {d.label}요일
                  {s && (
                    <span className="text-ink-soft ml-1.5 font-semibold">
                      {timeLabel(s.start)} · {s.minutes}분
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(s)}
                  aria-label={`${d.label}요일 운동할 수 있어요`}
                  onClick={() =>
                    setDay(d.code, s ? null : { day: d.code, start: "19:00", minutes: 20 })
                  }
                  className="press grid h-11 w-14 shrink-0 place-items-center"
                >
                  {/* 보이는 것은 작아도 누르는 자리는 44px — 아이 손가락이 닿아야 한다 */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative h-8 w-13 rounded-full transition-colors",
                      s ? "bg-signal-strong" : "bg-bar",
                    )}
                  >
                    <span
                      className={cn(
                        "bg-paper absolute top-1 size-6 rounded-full shadow transition-[left]",
                        s ? "left-6" : "left-1",
                      )}
                    />
                  </span>
                </button>
              </div>

              {s && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`time-${d.code}`}>
                    {d.label}요일 시작 시각
                  </label>
                  <select
                    id={`time-${d.code}`}
                    value={s.start}
                    onChange={(e) => setDay(d.code, { ...s, start: e.target.value })}
                    className="field h-11 w-auto pr-8 text-sm font-bold"
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {timeLabel(t)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1.5" role="group" aria-label={`${d.label}요일 몇 분`}>
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={s.minutes === m}
                        onClick={() => setDay(d.code, { ...s, minutes: m })}
                        className={cn(
                          "press min-h-11 min-w-11 rounded-full px-3 text-sm font-bold",
                          s.minutes === m ? "bg-signal-strong text-white" : "bg-sub",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <Dock>
        {problem && (
          <p role="alert" className="text-signal-deep mb-2 text-center text-sm font-semibold">
            {problem}
          </p>
        )}
        {saved && !changed ? (
          <p className="bg-done-soft text-done flex min-h-14 items-center justify-center gap-1.5 rounded-2xl text-base font-extrabold">
            <Check aria-hidden className="size-5" strokeWidth={3} />
            저장했어요
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!changed || save.isPending}
            data-off={!changed && !save.isPending ? "" : undefined}
            className="press bg-signal-strong data-off:bg-line data-off:text-ink-soft flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white disabled:opacity-100 data-off:shadow-none"
          >
            {save.isPending ? "저장하는 중" : "저장하기"}
          </button>
        )}
      </Dock>
    </>
  );
}
