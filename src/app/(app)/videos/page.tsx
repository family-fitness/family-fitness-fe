import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="VIDEO" title="운동 영상" />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          국민체육진흥공단 영상 추천이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
