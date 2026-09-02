import type { Metadata, Viewport } from "next";

import { MswProvider } from "@/providers/msw-provider";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "우리가족 체력키움",
  description: "국민체력100 데이터로 그리는 우리 가족 체력 지도",
};

export const viewport: Viewport = {
  // 앱처럼 보이려면 확대·축소가 없어야 한다
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <MswProvider>
          <QueryProvider>{children}</QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
