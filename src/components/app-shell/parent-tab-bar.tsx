"use client";

import { CalendarDays, Dumbbell, House, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { PARENT_TABS, parentTabOf, type ParentTab } from "@/lib/parent-tabs";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tab-store";

const ICONS: Record<ParentTab, LucideIcon> = {
  home: House,
  records: CalendarDays,
  workout: Dumbbell,
  league: Trophy,
  family: Users,
};

/**
 * 부모 화면의 하단 탭. 아래에 붙어 있고, 탭의 첫 화면에서만 선다(`parentTabOf`).
 *
 * 켜진 탭은 아이콘과 글자를 진한 파랑으로 바꾼다. 아이콘을 둥근 면에 넣지 않는다(9/25 「둥근 배경 안에 뭘
 * 넣는 건 너무 AI 같다」). 가운데 「운동」 탭만 예외다(10/1 「운동은 파란 원으로 강조되게」). 앱 파랑 원 안에
 * 흰 아이콘을 두고, 켜지면 원이 진한 파랑이 된다. 화면이 넘어가도 탭은 제자리에 있다(`viewTransitionName`).
 * 본문은 탭 높이만큼 아래를 더 비운다(`globals.css` 의 `html:has(.tab-bar)`).
 */
export function ParentTabBar() {
  const pathname = usePathname();
  const tab = parentTabOf(pathname);
  const setLast = useTabStore((s) => s.setLast);

  useEffect(() => {
    const href = PARENT_TABS.find((t) => t.id === tab)?.href;
    if (href) setLast(href);
  }, [tab, setLast]);

  if (!tab) return null;
  return (
    <nav
      aria-label="주요 메뉴"
      className="tab-bar bg-paper border-line fixed inset-x-0 bottom-0 z-30 mx-auto max-w-(--width-phone) border-t pb-[env(safe-area-inset-bottom)]"
      style={{ viewTransitionName: "tab-bar" }}
    >
      <ul className="grid h-(--spacing-tabbar) grid-cols-5">
        {PARENT_TABS.map((t) => {
          const on = t.id === tab;
          const Icon = ICONS[t.id];
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press flex h-full flex-col items-center justify-center gap-0.5",
                  on ? "text-signal-deep" : "text-faint",
                )}
              >
                {t.id === "workout" ? (
                  // 운동 탭만 파란 원. 위로 살짝 올려 바의 윗선에 걸치고, 글자 줄은 다른 탭과 맞춘다
                  <span
                    className={cn(
                      "ring-paper shadow-lift -mt-6 grid size-12 place-items-center rounded-full text-white ring-4",
                      on ? "bg-signal-deep" : "bg-signal",
                    )}
                  >
                    <Icon aria-hidden className="size-6" strokeWidth={on ? 2.6 : 2.2} />
                  </span>
                ) : (
                  <Icon aria-hidden className="size-6" strokeWidth={on ? 2.4 : 1.8} />
                )}
                <span
                  className={cn("text-[11px] leading-none", on ? "font-extrabold" : "font-bold")}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
