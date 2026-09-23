import type { Metadata, Viewport } from "next";

import { MswProvider } from "@/providers/msw-provider";
import { PwaProvider } from "@/providers/pwa-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "우리가족 체력키움",
  description: "국민체력100 데이터로 그리는 우리 가족 체력 지도",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "체력키움" },
  applicationName: "체력키움",
  // 주소만 붙여 넣어도 무엇인지 보이게. 카톡으로 오가는 링크가 첫 입구다
  openGraph: {
    type: "website",
    siteName: "우리가족 체력키움",
    title: "우리가족 체력키움",
    description: "국민체력100 데이터로 그리는 우리 가족 체력 지도",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
    확대를 막지 않는다. 앱처럼 보이려고 userScalable 을 끄는 관행이 있는데
    작은 글씨를 키워 보는 사람에게서 그 방법을 빼앗는 일이다. 서 있는 자리가
    노치·홈 인디케이터까지 닿도록 viewportFit 만 넓힌다.
  */
  viewportFit: "cover",
  // 밝은 화면 하나로 간다. 상태 막대는 앱 바탕과 같은 연회색
  themeColor: "#f4f5f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <PwaProvider />
        <MswProvider>
          <QueryProvider>
            <div className="app-frame relative z-[1]">{children}</div>
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
