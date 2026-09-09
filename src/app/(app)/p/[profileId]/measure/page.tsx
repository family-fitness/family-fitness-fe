import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MEASURE" title="체력 측정 입력" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          집에서 잴 수 있는 항목과 장비가 필요한 항목을 나눠 입력합니다.
        </p>
      </Screen>
    </>
  );
}
