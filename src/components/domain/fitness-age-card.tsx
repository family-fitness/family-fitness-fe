"use client";

import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { FitnessAgeTrend } from "@/components/domain/fitness-age-trend";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useFitnessAge, useFitnessAgeHistory, useFitnessItems } from "@/lib/api/queries";
import type { FitnessAge, FitnessItem } from "@/lib/api/types";
import {
  ageGapLine,
  agePosition,
  changeLine,
  itemAgeText,
  itemLabelOf,
  lastKnownAge,
  missingInOrder,
  missingName,
  moreItemsLine,
} from "@/lib/fitness-age";
import { measureHref } from "@/lib/measure-focus";
import { cn, formatDate } from "@/lib/utils";

/**
 * 체력 나이 — 보호자 측정 결과에만 둔다. 서버가 성인(만 19~64세)만 셈하고, 아이에게는 내지 않는다.
 *
 * 범위 밖이면(`AGE_OUT_OF_RANGE`) 자리를 비운다. 측정 기록이 없으면 결과 화면이 이미 빈 화면을 그린다.
 * 값이 실제 나이보다 많아도 경고색을 쓰지 않는다(규칙 8).
 */
export function FitnessAgeCard({ profileId }: { profileId: string }) {
  const { data, isPending, error, refetch, isRefetching } = useFitnessAge(profileId);
  // 항목이 모자란 회차에서도 이력을 받는다 — 하나만 다시 잰 뒤에 지난 체력 나이가 화면에서 사라졌다
  const { data: history } = useFitnessAgeHistory(
    profileId,
    data?.status === "OK" || data?.status === "NOT_ENOUGH_ITEMS",
  );
  // 항목 이름을 측정 화면과 같은 라벨로 쓰려고 받는다. 측정 화면과 같은 쿼리라 한 번 받으면 같이 쓴다
  const { data: catalogue } = useFitnessItems("성인");

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
  const last = lastKnownAge(history?.tests ?? []);

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
            {moreItemsLine(data.minItems)}
          </p>
          {last && (
            <p className="text-body mt-3 font-bold">
              지난 체력 나이 {last.fitnessAge}세
              <span className="text-caption text-ink-soft ml-1.5 font-semibold">
                {formatDate(last.testedOn)}
              </span>
            </p>
          )}
        </>
      )}
      <ItemAges data={data} catalogue={catalogue?.items} />
      <MissingItems data={data} catalogue={catalogue?.items} profileId={profileId} />
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
function ItemAges({ data, catalogue }: { data: FitnessAge; catalogue?: FitnessItem[] }) {
  if (data.items.length === 0 && data.excludedItems.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="text-caption text-ink-soft font-bold">항목별 나이</h3>
      <ul className="divide-rows mt-1">
        {data.items.map((item) => (
          <li key={item.itemCode} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="text-sm font-bold">
                {itemLabelOf(item.itemCode, item.itemName, catalogue)}
              </span>
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
            <span className="text-ink-soft min-w-0 text-sm font-bold">
              {itemLabelOf(item.itemCode, item.itemName, catalogue)}
            </span>
            <span className="text-caption text-ink-soft shrink-0 font-semibold">계산에 안 씀</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 더 측정하면 좋은 항목. 측정 화면으로 간다 */
function MissingItems({
  data,
  catalogue,
  profileId,
}: {
  data: FitnessAge;
  catalogue?: FitnessItem[];
  profileId: string;
}) {
  if (data.missingItems.length === 0) return null;
  // 맨몸으로 재는 것부터 — 측정 화면도 이 차례대로 위에 올린다
  const missing = missingInOrder(data.missingItems);
  return (
    <NavLink
      href={measureHref(
        profileId,
        missing.map((m) => m.itemCode),
      )}
      className={cn("press bg-sub mt-4 flex min-h-13 items-center gap-2 rounded-2xl px-4 py-3")}
    >
      <span className="min-w-0 flex-1">
        <span className="text-caption text-ink-soft block font-bold">더 측정할 항목</span>
        <span className="block text-sm font-extrabold">
          {/* 항목 하나는 한 줄 안에 — 「10m4회왕복달리기」 와 「(공간)」 이 줄을 넘어 갈라졌다 */}
          {missing.map((m, i) => (
            <Fragment key={m.itemCode}>
              {i > 0 && ", "}
              <span className="whitespace-nowrap">
                {missingName(itemLabelOf(m.itemCode, m.itemName, catalogue), m.equipment)}
              </span>
            </Fragment>
          ))}
        </span>
      </span>
      <ChevronRight aria-hidden className="text-ink-soft size-4 shrink-0" />
    </NavLink>
  );
}
