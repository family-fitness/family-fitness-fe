import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MISSION" title="미션" />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">승인된 미션 목록이 들어갑니다.</p>
      </Screen>
    </>
  );
}
