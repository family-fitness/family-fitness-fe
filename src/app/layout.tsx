import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";

import { MswProvider } from "@/providers/msw-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

// 숫자와 단위, 눈금 라벨에 쓴다. 자릿수가 흔들리면 눈금처럼 안 읽힌다
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
    { media: "(prefers-color-scheme: light)", color: "#f6f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1614" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plexMono.variable} h-full antialiased`}>
      <body className="bg-paper text-ink min-h-full">
        <MswProvider>
          <QueryProvider>{children}</QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
