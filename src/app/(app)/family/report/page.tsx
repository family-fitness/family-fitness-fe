import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="주간 요약" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          이번 주 우리 가족 활동 요약이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
