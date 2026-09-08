import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="근처 체육시설" back />
      <Screen>
        <p className="text-mute py-10 text-center text-sm">
          공공체육시설과 가족 강좌 안내가 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
