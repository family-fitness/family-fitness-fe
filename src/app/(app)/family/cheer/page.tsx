import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="CHEER" title="응원 보내기" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">가족에게 응원 스티커를 보냅니다.</p>
      </Screen>
    </>
  );
}
