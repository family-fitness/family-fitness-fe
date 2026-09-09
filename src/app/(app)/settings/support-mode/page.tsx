import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="SETTINGS" title="응원 모드" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          응원만 · 주말에 같이 · 나도 측정 중에서 고릅니다.
        </p>
      </Screen>
    </>
  );
}
