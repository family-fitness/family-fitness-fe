import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="최근 본 영상" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">최근 본 영상 목록이 들어갑니다.</p>
      </Screen>
    </>
  );
}
