import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="미션" />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">승인된 미션 목록이 들어갑니다.</p>
      </Screen>
    </>
  );
}
