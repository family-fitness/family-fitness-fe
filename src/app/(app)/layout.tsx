/**
 * 탭바가 있는 화면들의 껍데기.
 * 탭바 자체는 루트 레이아웃에 있다. 여기서는 그룹만 나눈다.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
