import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="측정 결과" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          국민체력100 규준 대비 백분위와 등급이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
