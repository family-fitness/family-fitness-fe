import { FactorIcon } from "@/components/domain/factor-icon";
import { BAND_COPY, type FitnessItem, type ItemResult, type RadarPoint } from "@/lib/api/types";
import { FACTOR_NOTE, itemsByFactor, toHexagon } from "@/lib/fitness-factors";
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
        const missing = p.percentile == null;
        return (
          <li key={p.factor} className="flex items-start gap-3 py-3.5">
            <span
              aria-hidden
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                missing ? "bg-sub text-faint" : "bg-signal-soft text-signal-strong",
              )}
            >
              <FactorIcon factor={p.factor} className="size-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold">{p.factor}</p>
                <p className="text-caption shrink-0 font-bold">
                  {missing ? (
                    <span className="text-faint">안 잰</span>
                  ) : (
                    (item?.topPercentText ?? `백분위 ${p.percentile}`)
                  )}
                </p>
              </div>
              <p className="text-micro text-ink-soft mt-0.5">
                {missing
                  ? howTo?.itemLabel
                    ? `${howTo.itemLabel}로 재요 · ${FACTOR_NOTE[p.factor]}`
                    : FACTOR_NOTE[p.factor]
                  : item
                    ? `${item.itemLabel} ${item.value}${item.unit ?? ""}${item.band ? ` · ${BAND_COPY[item.band]}` : ""}`
                    : FACTOR_NOTE[p.factor]}
              </p>
              {!missing && (
                <div className="record-rail mt-2 h-1.5" aria-hidden>
                  <span className="record-fill" style={{ width: `${p.percentile}%` }} />
                  <span className="record-avg" />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
