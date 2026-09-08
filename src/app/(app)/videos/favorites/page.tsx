import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="찜한 영상" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">찜한 영상 목록이 들어갑니다.</p>
      </Screen>
    </>
  );
}
