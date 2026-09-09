import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MISSION" title="미션" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          영상 재생 · 타이머 · 걸음수 입력이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
