"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";

import { cn } from "@/lib/utils";

/**
 * 한 달 달력. react-day-picker(shadcn/ui 달력이 쓰는 것) 위에 앱 색과 둥근 모서리만 입혔다.
 *
 * 머리에 연도와 월 드롭다운이 있어 몇 년 전 날짜도 몇 번 만에 간다.
 * 드롭다운은 브라우저 기본 select 를 투명하게 덮어 둔 것이라 폰에서는 폰의 목록 고르기가 뜬다.
 * 키보드(화살표, PageUp/PageDown, Home/End)와 스크린리더 이름은 라이브러리 것을 그대로 쓴다.
 */
export function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ko}
      captionLayout="dropdown"
      navLayout="around"
      formatters={{ formatYearDropdown: (d) => `${d.getFullYear()}년` }}
      className={cn("w-full", className)}
      classNames={{
        months: "relative",
        month: "grid grid-cols-[auto_1fr_auto] items-center gap-y-3",
        month_caption: "flex h-11 items-center justify-center",
        dropdowns: "flex items-center gap-2",
        dropdown_root:
          "relative flex h-11 items-center rounded-tile bg-sub px-3.5 has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-signal",
        dropdown: "absolute inset-0 w-full cursor-pointer appearance-none opacity-0",
        caption_label: "flex items-center gap-1 text-base font-bold",
        button_previous:
          "press grid size-11 place-items-center rounded-full text-ink-soft disabled:opacity-30",
        button_next:
          "press grid size-11 place-items-center rounded-full text-ink-soft disabled:opacity-30",
        chevron: "size-5",
        month_grid: "col-span-3 w-full border-collapse",
        weekdays: "",
        weekday: "h-9 text-xs font-bold text-faint",
        week: "",
        day: "p-0.5 text-center",
        day_button:
          "mx-auto grid size-10 place-items-center rounded-full text-[15px] font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        today: "[&>button]:text-signal [&>button]:ring-1 [&>button]:ring-signal-pale",
        selected:
          "[&>button]:bg-signal [&>button]:text-white [&>button]:ring-0 [&>button]:font-bold",
        disabled: "[&>button]:text-bar [&>button]:cursor-not-allowed",
        outside: "[&>button]:text-faint",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: c }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : ChevronDown;
          return <Icon aria-hidden className={cn("size-5", c)} />;
        },
      }}
      {...props}
    />
  );
}
