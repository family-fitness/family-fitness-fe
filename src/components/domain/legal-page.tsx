import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import type { LegalBlock, LegalDoc } from "@/lib/legal";

/**
 * 개인정보처리방침 · 이용약관 한 편 — 설정에서 들어오고, 뒤로는 설정으로 돌아간다.
 * 설명 문구를 두지 않는 규칙의 예외다(법이 요구하는 글 · AGENTS 「피할 목록」).
 *
 * 조마다 「제N조(제목)」. 번호는 여기서 붙인다 — 글에 적으면 조를 하나 넣을 때마다 뒤 번호를 다 고쳐야 한다.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <AppBar backHref="/settings" title={doc.title} />
      <Stage wide className="space-y-3">
        <article className="card text-sm leading-relaxed">
          {doc.preamble && <p className="text-ink-soft pt-1 pb-3.5">{doc.preamble}</p>}
          {doc.articles.map((article, i) => (
            <section
              key={article.title}
              className="border-line space-y-2 border-t py-3.5 first:border-t-0"
            >
              <h2 className="font-extrabold">
                제{i + 1}조({article.title})
              </h2>
              {article.body.map((block, j) => (
                <Block key={j} block={block} />
              ))}
            </section>
          ))}
          {doc.addendum && (
            <section className="border-line space-y-2 border-t py-3.5">
              <h2 className="font-extrabold">부칙</h2>
              {doc.addendum.map((line) => (
                <p key={line} className="text-ink-soft">
                  {line}
                </p>
              ))}
            </section>
          )}
        </article>
      </Stage>
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p className="text-ink-soft">{block}</p>;
  if ("items" in block) {
    return (
      <ol className="text-ink-soft list-decimal space-y-1 pl-5">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  return (
    <dl className="border-line divide-rows border-y">
      {block.rows.map((row) => (
        <div key={row.label} className="py-2">
          <dt className="text-caption text-ink-soft font-bold">{row.label}</dt>
          <dd className="mt-0.5 break-words">{row.text}</dd>
        </div>
      ))}
    </dl>
  );
}
