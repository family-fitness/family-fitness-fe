import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="COACH" title="AI 운동 코치" />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          이번 주 제안과 질의응답이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
