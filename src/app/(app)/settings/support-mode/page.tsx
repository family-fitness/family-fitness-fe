import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="응원 모드" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          응원만 · 주말에 같이 · 나도 측정 중에서 고릅니다.
        </p>
      </Screen>
    </>
  );
}
