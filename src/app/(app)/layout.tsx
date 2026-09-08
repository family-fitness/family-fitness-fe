import { BottomTabBar } from "@/components/app-shell/bottom-tab-bar";

/**
 * 탭바가 있는 화면들의 껍데기.
 * 온보딩 · 미션 수행처럼 몰입이 필요한 화면은 이 그룹 밖에 둔다.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <BottomTabBar />
    </>
  );
}
