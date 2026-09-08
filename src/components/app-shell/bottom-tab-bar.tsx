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

/**
 * 하단 탭바.
 *
 * 앱처럼 보이게 하는 가장 큰 요소다. 홈 인디케이터가 있는 기기에서 잘리지 않도록
 * safe-area-inset-bottom 만큼 아래를 더 띄운다.
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 화면"
      className="bg-surface/95 border-line fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    >
      <ul className="max-w-phone mx-auto flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-tabbar flex flex-col items-center justify-center gap-0.5 text-[0.65rem]",
                  active ? "text-grow" : "text-faint",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
