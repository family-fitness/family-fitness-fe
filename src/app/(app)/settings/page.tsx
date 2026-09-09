import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="SETTINGS" title="설정" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          응원 모드와 보호자 동의 관리로 이어집니다.
        </p>
      </Screen>
    </>
  );
}
