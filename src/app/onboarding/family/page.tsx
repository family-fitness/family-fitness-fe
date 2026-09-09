import { PageHeader } from "@/components/app-shell/page-header";
import { PlainScreen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="START" title="가족 만들기" back />
      <PlainScreen>
        <p className="text-ink-soft py-10 text-center text-sm">
          가족 이름과 내 프로필을 등록합니다.
        </p>
      </PlainScreen>
    </>
  );
}
