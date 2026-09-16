import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";

import { DesktopDecor } from "@/components/app-shell/desktop-decor";
import { MswProvider } from "@/providers/msw-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

/*
  숫자가 뜨는 자리에만 쓴다. 점수·개수·시간.

  전에 쓰던 Bebas Neue 는 좁고 각진 대문자 서체라 "경기장 전광판" 느낌이었다.
  아이와 부모가 쓰는 앱이 됐으니 둥근 쪽이 맞는다 — 그림의 둥근 외곽선과도 붙는다.
*/
const fredoka = Fredoka({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-num-face",
});

export const metadata: Metadata = {
  title: "우리가족 체력키움",
  description: "국민체력100 데이터로 그리는 우리 가족 체력 지도",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "체력키움" },
};

export const viewport: Viewport = {
  // 앱처럼 보이려면 확대 · 축소가 없어야 한다
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // 흰 화면 하나로 간다. 기기가 다크 모드여도 바뀌지 않는다
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full ${fredoka.variable}`}>
      <body className="min-h-full antialiased">
        <MswProvider>
          <QueryProvider>
            <DesktopDecor />
            <div className="app-frame relative z-[1]">{children}</div>
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
