import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="설정" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          응원 모드와 보호자 동의 관리로 이어집니다.
        </p>
      </Screen>
    </>
  );
}
