import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="SETTINGS" title="보호자 동의" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">동의 내역 확인과 철회를 합니다.</p>
      </Screen>
    </>
  );
}
