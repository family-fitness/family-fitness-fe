"use client";

import type { CheerLog } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

/**
 * 이번 주 움직인 날.
 *
 * **연속 기록(streak)을 쓰지 않는다.** 며칠 이어졌다고 세면 하루 빠진 날
 * 숫자가 0으로 돌아가고, 그건 벌이 된다. 기획서가 통제형 기능을 뺀 것과 같은
 * 이유다 — 못 한 날을 지적하면 그날로 앱을 닫는다.
 *
 * 대신 이번 주에 한 날을 칠한다. 빈 날은 비어 있을 뿐 실패가 아니다.
 *
 * 날짜는 아이가 "다 했어요" 를 누른 기록에서 뽑는다.
 * ▲ 서버에 날짜별 활동 요약이 생기면 그걸로 바꾼다.
 */
const DAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

export function WeekDots({
  cheers,
  fromProfileId,
  className,
}: {
  cheers: CheerLog[] | undefined;
  /** 이 사람이 보낸 것만 센다 */
  fromProfileId: string;
  className?: string;
}) {
  // 이번 주 일요일부터 7일
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const moved = new Set(
    (cheers ?? [])
      .filter((c) => c.fromProfileId === fromProfileId)
      .map((c) => c.createdAt.slice(0, 10)),
  );
  const count = days.filter((d) => moved.has(d)).length;
  const todayKey = today.toISOString().slice(0, 10);

  return (
    <section className={className}>
      {/*
        0일일 때 "0일 움직였어요" 라고 쓰지 않는다. 첫 화면에 늘 0이 뜨는데
        그건 시작하기도 전에 기죽이는 말이다.
      */}
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Illustration name="item/item-streak" size={22} />
        {count === 0 ? (
          "움직인 날을 여기 칠해요"
        ) : (
          <>
            이번 주 <span className="text-signal-deep">{count}일</span> 움직였어요
          </>
        )}
      </p>
      <ul className="mt-2 flex justify-between gap-1.5">
        {days.map((day, i) => {
          const on = moved.has(day);
          const isToday = day === todayKey;
          const future = day > todayKey;
          return (
            <li key={day} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "grid aspect-square w-full place-items-center rounded-xl text-xs font-extrabold",
                  on && "bg-signal text-white",
                  !on && isToday && "border-signal text-signal border-2",
                  !on && !isToday && "bg-sub text-faint",
                  future && "opacity-45",
                )}
                aria-label={`${DAY_LABEL[i]}요일 ${on ? "움직였어요" : "아직이에요"}`}
              >
                {DAY_LABEL[i]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
