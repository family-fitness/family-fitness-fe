"use client";

import type { CheerLog } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 이번 주 움직인 날.
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
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());

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
  const todayKey = today();

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
