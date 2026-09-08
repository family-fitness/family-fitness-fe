import { AppHeader } from "@/components/app-shell/app-header";
import { PlainScreen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="로그인" back />
      <PlainScreen>
        <p className="text-mute py-10 text-center text-sm">카카오 로그인으로 시작합니다.</p>
      </PlainScreen>
    </>
  );
}
