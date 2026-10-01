"use client";

import { CalendarDays } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Calendar } from "@/components/ui/calendar";
import { Sheet } from "@/components/ui/sheet";
import { type DateRule, koreanDate, openingDate, parseDate } from "@/lib/date-pick";
import { toDateString } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 날짜 한 칸. 누르면 바닥 시트로 달력이 올라오고, 하루를 누르면 값이 바뀌고 시트가 닫힌다.
 *
 * 값은 전과 같은 YYYY-MM-DD 문자열이다. 브라우저 기본 날짜 칸은 몇 년 전으로 가려면
 * 한 달씩 수십 번 넘겨야 했고 폰마다 모양이 달랐다.
 *
 * 시트는 body 에 붙인다. 다른 시트(보호자 더하기) 안에서 열면 그 시트의 transform 때문에
 * 화면 전체가 아니라 그 시트 안에 갇혀 그려진다.
 */
export function DateField({
  label,
  value,
  onChange,
  rule,
  placeholder = "날짜를 골라 주세요",
  className,
}: {
  /** 시트 제목이자 스크린리더가 읽는 칸 이름 */
  label: string;
  value: string;
  onChange: (date: string) => void;
  /** 고를 수 있는 범위와 처음 보여 줄 날 */
  rule: DateRule;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // 한 번 열기 전에는 시트를 그리지 않는다. 서버에서 그릴 때는 document 가 없다
  const [used, setUsed] = useState(false);
  const shown = value ? koreanDate(value) : placeholder;
  const field = useRef<HTMLButtonElement>(null);

  /*
    닫을 때 초점을 이 칸으로 돌려준다. 시트는 자기를 연 요소로 초점을 돌려주지만, 달력의
    autoFocus 가 시트의 useEffect 보다 먼저 실행돼서 그 요소가 달력의 날짜 버튼으로 기록됐고,
    닫히면 그 버튼은 inert 라 초점이 body 로 빠졌다
  */
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
  };

  return (
    <>
      <button
        ref={field}
        type="button"
        aria-haspopup="dialog"
        aria-label={`${label}, ${value ? koreanDate(value) : "아직 안 골랐어요"}`}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        className={cn(
          "field flex items-center justify-between gap-3 text-left",
          !value && "text-faint",
          className,
        )}
      >
        {/* 고르기 전 안내 글은 다른 입력 칸의 보기 글자처럼 보통 굵기로 */}
        <span className={cn("truncate", !value && "font-normal")}>{shown}</span>
        <CalendarDays aria-hidden className="text-ink-soft size-5 shrink-0" />
      </button>
      {used &&
        createPortal(
          <Sheet open={open} onClose={close} title={label}>
            <Calendar
              mode="single"
              required
              autoFocus
              selected={parseDate(value)}
              onSelect={(d) => {
                onChange(toDateString(d));
                close();
              }}
              defaultMonth={parseDate(openingDate(rule, value))}
              startMonth={parseDate(rule.min)}
              endMonth={parseDate(rule.max)}
              disabled={[
                { before: parseDate(rule.min) as Date },
                { after: parseDate(rule.max) as Date },
              ]}
            />
          </Sheet>,
          document.body,
        )}
    </>
  );
}
