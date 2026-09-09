import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="ASK" title="코치에게 물어보기" back />
      <Screen>
        <p className="text-ink-soft py-10 text-center text-sm">근거를 인용한 답변이 들어갑니다.</p>
      </Screen>
    </>
  );
}
