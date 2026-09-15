"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** 영상 화면 셋을 잇는 탭. 라우트가 나뉘어 있어 링크로 만든다 */
const TABS = [
  ["/videos", "전체"],
  ["/videos/favorites", "즐겨찾기"],
  ["/videos/recent", "본 영상"],
] as const;

export function VideoTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2" aria-label="영상 목록 종류">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn("chip press", pathname === href && "chip-on")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
