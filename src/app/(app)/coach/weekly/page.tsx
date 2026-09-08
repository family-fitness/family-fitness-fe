import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="이번 주 제안" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          코치가 편성한 제안을 보호자가 승인하거나 거절합니다.
        </p>
      </Screen>
    </>
  );
}
