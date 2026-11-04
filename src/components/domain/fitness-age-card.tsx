"use client";

import { ChevronRight } from "lucide-react";

import { FitnessAgeTrend } from "@/components/domain/fitness-age-trend";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useFitnessAge, useFitnessAgeHistory } from "@/lib/api/queries";
import type { FitnessAge } from "@/lib/api/types";
import { ageGapLine, agePosition, changeLine, itemAgeText, moreItemsLine } from "@/lib/fitness-age";
import { cn } from "@/lib/utils";

/**
 * 체력 나이 — 보호자 측정 결과에만 둔다. 서버가 성인(만 19~64세)만 셈하고, 아이에게는 내지 않는다.
 *
 * 범위 밖이면(`AGE_OUT_OF_RANGE`) 자리를 비운다. 측정 기록이 없으면 결과 화면이 이미 빈 화면을 그린다.
 * 값이 실제 나이보다 많아도 경고색을 쓰지 않는다(규칙 8).
 */
export function FitnessAgeCard({ profileId }: { profileId: string }) {
  const { data, isPending, error, refetch, isRefetching } = useFitnessAge(profileId);
  const { data: history } = useFitnessAgeHistory(profileId, data?.status === "OK");

  if (isPending) return <Skeleton className="h-56 w-full rounded-3xl" />;
  if (error || !data) {
    return (
      <section className="card flex items-center justify-between gap-3">
        <p className="text-sm font-bold">체력 나이를 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="press text-signal-strong min-h-11 shrink-0 px-2 text-sm font-extrabold"
        >
          다시 불러오기
        </button>
      </section>
    );
  }
  if (data.status === "AGE_OUT_OF_RANGE" || data.status === "NO_TEST") return null;

  const change = changeLine(history?.tests ?? []);

  return (
    <section className="card" aria-label="체력 나이">
      <CardHead title="체력 나이" />
      {data.status === "OK" && data.fitnessAge != null && data.age != null ? (
        <>
          <p className="metric-value text-5xl">
            {data.fitnessAge}
            <span className="metric-unit">세</span>
          </p>
          <p className="text-body mt-2 font-bold">{ageGapLine(data.age, data.ageGap ?? 0)}</p>
          {change && <p className="text-caption text-ink-soft mt-0.5 font-semibold">{change}</p>}
          <AgeScale fitnessAge={data.fitnessAge} age={data.age} range={data.range} />
          {(history?.tests.length ?? 0) > 1 && (
            <div className="mt-5">
              <FitnessAgeTrend tests={history?.tests ?? []} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-body font-extrabold">아직 계산할 수 없어요</p>
          <p className="text-caption text-ink-soft mt-0.5 font-semibold">
            {moreItemsLine(data.minItems, data.items.length)}
          </p>
        </>
      )}
      <ItemAges data={data} />
      <MissingItems data={data} profileId={profileId} />
    </section>
  );
}

/** 나이 축에 체력 나이와 실제 나이를 함께 놓는다. 두 값이 같으면 표시 하나로 */
function AgeScale({
  fitnessAge,
  age,
  range,
}: {
  fitnessAge: number;
  age: number;
  range: FitnessAge["range"];
}) {
  const fitnessAt = agePosition(fitnessAge, range.min, range.max);
  const ageAt = agePosition(age, range.min, range.max);
  return (
    <div className="mt-5" aria-hidden>
      <div className="text-caption relative h-5 font-extrabold">
        <span
          className="text-signal-deep absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `clamp(2rem, ${fitnessAt}%, calc(100% - 2rem))` }}
        >
          체력 {fitnessAge}
        </span>
      </div>
      <div className="bg-sub relative mt-1 h-2 rounded-full">
        {age !== fitnessAge && (
          <span
            className="bg-baseline absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${ageAt}%` }}
          />
        )}
        <span
          className="bg-signal border-paper absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left: `${fitnessAt}%` }}
        />
      </div>
      <div className="text-caption text-ink-soft relative mt-1.5 h-5 font-semibold">
        <span className="absolute left-0">{range.min}세</span>
        <span className="absolute right-0">{range.max}세</span>
        <span
          className="absolute -translate-x-1/2 font-bold whitespace-nowrap"
          style={{ left: `clamp(3.5rem, ${ageAt}%, calc(100% - 3.5rem))` }}
        >
          실제 {age}
        </span>
      </div>
    </div>
  );
}

/** 항목마다의 나이. 뺀 항목은 값 대신 「계산에 안 씀」 */
function ItemAges({ data }: { data: FitnessAge }) {
  if (data.items.length === 0 && data.excludedItems.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="text-caption text-ink-soft font-bold">항목별 나이</h3>
      <ul className="divide-rows mt-1">
        {data.items.map((item) => (
          <li key={item.itemCode} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="text-sm font-bold">{item.itemName}</span>
              <span className="text-caption text-ink-soft ml-1.5">
                {item.value}
                {item.unit}
              </span>
            </span>
            <span className="shrink-0 text-sm font-extrabold">{itemAgeText(item)}</span>
          </li>
        ))}
        {data.excludedItems.map((item) => (
          <li key={item.itemCode} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-ink-soft min-w-0 text-sm font-bold">{item.itemName}</span>
            <span className="text-caption text-ink-soft shrink-0 font-semibold">계산에 안 씀</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 더 측정하면 좋은 항목. 측정 화면으로 간다 */
function MissingItems({ data, profileId }: { data: FitnessAge; profileId: string }) {
  if (data.missingItems.length === 0) return null;
  return (
    <NavLink
      href={`/p/${encodeURIComponent(profileId)}/measure`}
      className={cn("press bg-sub mt-4 flex min-h-13 items-center gap-2 rounded-2xl px-4 py-3")}
    >
      <span className="min-w-0 flex-1">
        <span className="text-caption text-ink-soft block font-bold">더 측정할 항목</span>
        <span className="block text-sm font-extrabold">
          {data.missingItems.map((m) => m.itemName).join(", ")}
        </span>
      </span>
      <ChevronRight aria-hidden className="text-ink-soft size-4 shrink-0" />
    </NavLink>
  );
}
