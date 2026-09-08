import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="가족" />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          응원 · 주간 요약 · 근처 시설로 이어집니다.
        </p>
      </Screen>
    </>
  );
}
