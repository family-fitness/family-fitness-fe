import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="FAMILY" title="가족" />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          응원 · 주간 요약 · 근처 시설로 이어집니다.
        </p>
      </Screen>
    </>
  );
}
