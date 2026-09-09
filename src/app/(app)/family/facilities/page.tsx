import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="NEARBY" title="근처 체육시설" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">
          공공체육시설과 가족 강좌 안내가 들어갑니다.
        </p>
      </Screen>
    </>
  );
}
