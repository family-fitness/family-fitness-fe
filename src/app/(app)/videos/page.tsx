import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="운동 영상" />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          국민체육진흥공단 영상 추천이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
