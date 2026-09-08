import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="10년 후" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          두 시나리오 예측 곡선과 신뢰구간이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
