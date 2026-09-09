import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="PROPOSAL" title="이번 주 제안" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          코치가 편성한 제안을 보호자가 승인하거나 거절합니다.
        </p>
      </Screen>
    </>
  );
}
