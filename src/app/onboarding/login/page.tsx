import { PageHeader } from "@/components/app-shell/page-header";
import { PlainScreen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="START" title="로그인" back />
      <PlainScreen>
        <p className="text-ink-soft py-10 text-center text-sm">카카오 로그인으로 시작합니다.</p>
      </PlainScreen>
    </>
  );
}
