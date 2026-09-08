import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="보호자 동의 관리" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">동의 내역 확인과 철회를 합니다.</p>
      </Screen>
    </>
  );
}
