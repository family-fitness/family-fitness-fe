import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="PROFILE" title="프로필" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          구성원 한 명의 측정 · 활동 기록이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
