import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="우리 가족 체력 지도" />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          구성원별 또래 대비 위치를 눈금으로 보여줍니다.
        </p>
      </Screen>
    </>
  );
}
