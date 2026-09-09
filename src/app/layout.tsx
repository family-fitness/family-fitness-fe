import type { Metadata, Viewport } from "next";
import { Bebas_Neue, IBM_Plex_Mono } from "next/font/google";

import { BottomTabBar } from "@/components/app-shell/bottom-tab-bar";
import { DesktopDecor } from "@/components/app-shell/desktop-decor";
import { MswProvider } from "@/providers/msw-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

// 전광판 숫자. 기록이 뜨는 자리에만 쓴다
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

// 표 안에서 자릿수를 맞춰야 하는 숫자
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#10161d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full ${bebas.variable} ${plexMono.variable}`}>
      <body className="min-h-full antialiased">
        <MswProvider>
          <QueryProvider>
            <DesktopDecor />
            <div className="app-frame relative z-[1]">
              <div className="app-main">{children}</div>
            </div>
            <BottomTabBar />
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
