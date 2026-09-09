import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="FUTURE" title="10년 후" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          두 시나리오 예측 곡선과 신뢰구간이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
