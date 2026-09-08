import { AppHeader } from "@/components/app-shell/app-header";
import { PlainScreen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <AppHeader title="구성원 추가" back />
      <PlainScreen>
        <p className="text-mute py-10 text-center text-sm">함께 쓸 가족을 등록합니다.</p>
      </PlainScreen>
    </>
  );
}
