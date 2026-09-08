"use client";

import { House, Sparkles, ListChecks, PlayCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "홈", icon: House },
  { href: "/coach", label: "코치", icon: Sparkles },
  { href: "/missions", label: "미션", icon: ListChecks },
  { href: "/videos", label: "영상", icon: PlayCircle },
  { href: "/family", label: "가족", icon: Users },
] as const;

/** 탭바를 감추는 화면. 온보딩과 초대는 몰입이 필요하다 */
const HIDDEN_PREFIXES = ["/onboarding", "/claim"];

/**
 * 하단 탭바.
 *
 * 활성 탭은 색만 바꾸지 않고 아이콘에 트랙 색 배경을 칠한다.
 * 색만 바뀌면 웹 내비게이션처럼 보이고, 칠하면 앱 탭바처럼 보인다.
 */
export function BottomTabBar() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <nav aria-label="주요 화면" className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="border-line bg-card/95 max-w-phone w-full border-t pb-[max(env(safe-area-inset-bottom),0.35rem)] backdrop-blur">
        <ul className="flex">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="press flex flex-col items-center gap-0.5 pt-2.5 pb-1"
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-2xl transition-colors",
                      active ? "bg-track text-white" : "text-faint",
                    )}
                  >
                    <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold",
                      active ? "text-track-deep" : "text-faint",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
