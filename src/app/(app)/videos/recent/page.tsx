import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="VIDEO" title="최근 본 영상" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">최근 본 영상 목록이 들어갑니다.</p>
      </Screen>
    </>
  );
}
