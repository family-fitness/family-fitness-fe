import { http, HttpResponse, type PathParams } from "msw";
import { ageOf } from "@/lib/today";
import type { FitnessAge, FitnessAgeHistory, FitnessAgeTest } from "@/lib/api/types";
import { BASE, DEMO, acting, db, fail, fixtures, type Profile } from "./db";

/**
 * 체력 나이. 서버는 또래 분포 표에서 기록의 백분위가 50 에 가장 가까운 나이를 찾는다.
 * 목에는 분포 표가 없어 백분위로 그럴듯한 나이를 만든다. 응답 모양과 갈래만 서버와 같다.
 */
const MIN = 19;
const MAX = 64;
const MIN_ITEMS = 2;
/** 나이와 관계가 약해 서버가 빼는 항목 */
const NOT_AGE_RELATED = "012";
/** 측정 센터 기기가 있어야 재는 항목은 권하지 않는다 */
const RECOMMENDED = ["019", "020", "021", "022", "028", "041"];

/** 시연 보호자는 만 나이가 정해져 있다(은영 39, 도현 42) */
const DEMO_AGES: Record<string, number> = { [DEMO.mom]: 39, [DEMO.dad]: 42 };

function ageOfProfile(profile: Profile): number {
  return DEMO_AGES[profile.profileId] ?? ageOf(profile.birthDate) ?? 40;
}

const ageFrom = (age: number, percentile: number) => age + (50 - percentile) * 0.35;

function catalogue() {
  return fixtures.itemsByAgeGroup["성인"]?.items ?? [];
}

function estimate(profile: Profile): FitnessAge {
  const age = ageOfProfile(profile);
  const test = db.latest[profile.profileId];
  const measured = test?.fitnessTestId ? (test.items ?? []) : [];
  const base = {
    testedOn: test?.testedOn ?? null,
    age: null,
    fitnessAge: null,
    ageGap: null,
    minItems: MIN_ITEMS,
    range: { min: MIN, max: MAX },
    items: [],
    excludedItems: [],
    missingItems: [],
  };
  const missing = catalogue()
    .filter(
      (i) => RECOMMENDED.includes(i.itemCode) && !measured.some((m) => m.itemCode === i.itemCode),
    )
    .map((i) => ({
      itemCode: i.itemCode,
      itemName: i.itemName,
      unit: i.unit,
      equipment: i.equipment ?? null,
    }));

  if (measured.length === 0) return { ...base, status: "NO_TEST", missingItems: missing };
  if (profile.ageGroup !== "성인") return { ...base, status: "AGE_OUT_OF_RANGE" };

  const items = measured
    .filter((m) => m.itemCode !== NOT_AGE_RELATED && m.percentile != null)
    .map((m) => {
      const raw = Math.round(ageFrom(age, m.percentile ?? 50) * 2) / 2;
      const itemAge = Math.min(MAX, Math.max(MIN, raw));
      return {
        itemCode: m.itemCode ?? "",
        itemName: m.itemLabel ?? m.itemCode ?? "",
        unit: m.unit ?? "",
        value: m.value ?? 0,
        itemAge,
        bound:
          raw < MIN ? ("YOUNGER" as const) : raw > MAX ? ("OLDER" as const) : ("NONE" as const),
      };
    });
  const excludedItems = measured
    .filter((m) => m.itemCode === NOT_AGE_RELATED)
    .map((m) => ({
      itemCode: NOT_AGE_RELATED,
      itemName: m.itemLabel ?? NOT_AGE_RELATED,
      reason: "NOT_AGE_RELATED",
    }));
  const common = { ...base, age, items, excludedItems, missingItems: missing };
  if (items.length < MIN_ITEMS) return { ...common, status: "NOT_ENOUGH_ITEMS" };

  const fitnessAge = Math.round(items.reduce((sum, i) => sum + i.itemAge, 0) / items.length);
  return { ...common, status: "OK", fitnessAge, ageGap: fitnessAge - age };
}

function historyOf(profile: Profile): FitnessAgeHistory {
  const age = ageOfProfile(profile);
  const current = estimate(profile);
  const tests: FitnessAgeTest[] = [...(db.tests[profile.profileId] ?? [])]
    .sort((a, b) => b.testedOn.localeCompare(a.testedOn))
    .slice(0, 12)
    .map((t) => {
      if (profile.ageGroup !== "성인") {
        return {
          testedOn: t.testedOn,
          age,
          status: "AGE_OUT_OF_RANGE",
          fitnessAge: null,
          ageGap: null,
          itemCount: 0,
        };
      }
      // 가장 최근 회차는 체력 나이 조회와 같은 값이어야 한다
      const fitnessAge =
        t.testedOn === current.testedOn && current.fitnessAge != null
          ? current.fitnessAge
          : Math.round(ageFrom(age, t.overallPercentile ?? 50));
      return {
        testedOn: t.testedOn,
        age,
        status: "OK",
        fitnessAge,
        ageGap: fitnessAge - age,
        itemCount: t.testedOn === current.testedOn ? current.items.length : 5,
      };
    });
  return { tests };
}

/** 판정 차례는 서버와 같다: 프로필 없음 404, 다른 가족 403 NOT_SAME_FAMILY, 아이 계정 403 NOT_A_PARENT */
function guard(profileId: string) {
  const profile = db.profiles.profiles.find((p) => p.profileId === profileId);
  if (!profile) return fail(404, "PROFILE_NOT_FOUND", "프로필이 없습니다");
  const me = acting();
  if (me && me.familyId !== profile.familyId) {
    return fail(403, "NOT_SAME_FAMILY", "다른 가족입니다");
  }
  if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
  return profile;
}

export const fitnessAge = [
  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-age`, ({ params }) => {
    const found = guard(String(params.profileId));
    return found instanceof Response ? found : HttpResponse.json(estimate(found));
  }),
  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-age/history`, ({ params }) => {
    const found = guard(String(params.profileId));
    return found instanceof Response ? found : HttpResponse.json(historyOf(found));
  }),
];
