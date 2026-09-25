import Link from "next/link";

import { PlainScreen } from "@/components/app-shell/screen";
import { Illustration } from "@/components/ui/illustration";

/**
 * 없는 주소 — 지운 화면으로 가는 옛 링크 · 잘못 친 주소. Next 의 영어 기본 화면 대신.
 * 홈 화면 앱에는 브라우저 뒤로가 없어 나갈 길을 둔다.
 */
export default function NotFound() {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <Illustration name="scene/kiumi-no-record" size={140} />
      <h1 className="page-title">없는 화면이에요</h1>
      <Link
        href="/"
        className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
      >
        처음으로
      </Link>
    </PlainScreen>
  );
}
