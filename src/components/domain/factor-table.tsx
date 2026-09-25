import { FactorIcon } from "@/components/domain/factor-icon";
import { BAND_COPY, type FitnessItem, type ItemResult, type RadarPoint } from "@/lib/api/types";
import { itemsByFactor, toHexagon } from "@/lib/fitness-factors";
import { cn } from "@/lib/utils";

/**
 * 육각형의 표 쌍둥이. 여섯 요인을 한 줄씩.
 *
 * 그래프는 모양을 보여 주고 표는 값을 읽게 한다. 도형 위에 숫자를 다 찍지 않는 대신
 * 여기서 다 읽힌다. 「상위 N%」 는 서버가 항목에 붙여 준 문구를 그대로 쓴다(규칙 9) —
 * 백분위로 프론트가 다시 계산하면 반올림이 달라진다.
 */
export function FactorTable({
  radar,
  results,
  catalog,
}: {
  radar: RadarPoint[] | null | undefined;
  results: ItemResult[] | null | undefined;
  /** 이 연령대 항목 목록. 요인과 항목을 잇는 데 쓴다 */
  catalog: FitnessItem[] | null | undefined;
}) {
  const hex = toHexagon(radar);
  const byFactor = itemsByFactor(results, catalog);

  return (
    <ul className="divide-rows">
      {hex.map((p) => {
        const item = byFactor.get(p.factor);
        const howTo = (catalog ?? []).find((c) => c.factor === p.factor);
        // 셋으로 가른다 — 잰 것 · 쟀는데 이 나이에 비교 기준이 없는 것(만 7~10세, 규칙 8) · 안 잰 것.
        // 잰 값을 「안 잼」 으로 적으면 적어 넣은 기록이 사라진 것처럼 보인다
        const scored = p.percentile != null;
        const measured = scored || item != null;
        return (
          <li key={p.factor} className="flex items-start gap-3 py-3.5">
            <FactorIcon
              factor={p.factor}
              className={cn("mt-0.5 size-8 shrink-0", !measured && "opacity-40")}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold">{p.factor}</p>
                <p className="text-caption shrink-0 font-bold">
                  {scored ? (
                    (item?.topPercentText ?? `백분위 ${p.percentile}`)
                  ) : (
                    <span className="text-faint">{measured ? "—" : "안 잼"}</span>
                  )}
                </p>
              </div>
              <p className="text-micro text-ink-soft mt-0.5">
                {item
                  ? `${item.itemLabel} ${item.value}${item.unit ?? ""}${item.band ? ` · ${BAND_COPY[item.band]}` : ""}`
                  : (howTo?.itemLabel ?? "")}
              </p>
              {measured && (
                <div className="record-rail mt-2 h-1.5" aria-hidden>
                  {scored ? (
                    <>
                      <span className="record-fill" style={{ width: `${p.percentile}%` }} />
                      <span className="record-avg" />
                    </>
                  ) : (
                    <span className="record-dash" />
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
