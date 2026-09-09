import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="RESULT" title="측정 결과" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          국민체력100 규준 대비 백분위와 등급이 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
