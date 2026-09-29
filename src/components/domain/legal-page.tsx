import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import type { LegalDoc } from "@/lib/legal";

/**
 * 개인정보처리방침 · 이용약관 한 편 — 설정에서 들어오고, 뒤로는 설정으로 돌아간다.
 * 설명 문구를 두지 않는 규칙의 예외다(법이 요구하는 글 · AGENTS 「피할 목록」).
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <AppBar backHref="/settings" title={doc.title} />
      <Stage wide className="space-y-3">
        <article className="card">
          {doc.sections.map((section) => (
            <section key={section.heading} className="border-line border-b py-3.5 last:border-b-0">
              <h2 className="text-sm font-extrabold">{section.heading}</h2>
              <ul className="text-ink-soft mt-1.5 space-y-1 text-sm leading-relaxed">
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
        <p className="text-caption text-faint px-1">시행일 {doc.effective}</p>
      </Stage>
    </>
  );
}
