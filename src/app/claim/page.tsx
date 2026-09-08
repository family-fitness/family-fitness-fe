import { AppHeader } from "@/components/app-shell/app-header";
import { PlainScreen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="초대코드로 합류" back />
      <PlainScreen>
        <p className="text-mute py-10 text-center text-sm">받은 6자리 코드를 입력합니다.</p>
      </PlainScreen>
    </>
  );
}
