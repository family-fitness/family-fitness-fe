"use client";

/**
 * 임시 확인용 화면.
 *
 * 이 PR 의 목적은 "백엔드 없이도 API 레이어가 끝까지 동작한다"를 증명하는 것이다.
 * MSW → api client → TanStack Query 까지 한 줄로 이어지는지 눈으로 보려고 만들었다.
 * 실제 홈 화면(가족 체력 지도)은 디자인 시스템 PR 뒤에 만든다.
 */
import { FAMILY_ID } from "@/mocks/data";
import { useFitnessMap } from "@/lib/api/queries";
import { percentileText } from "@/lib/fitness-items";

export default function Page() {
  const { data, isPending, error } = useFitnessMap(FAMILY_ID);

  if (isPending) {
    return <main className="p-6 text-sm text-neutral-500">불러오는 중</main>;
  }

  if (error) {
    return <main className="p-6 text-sm text-red-600">{error.message}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <p className="text-xs tracking-wide text-neutral-400 uppercase">임시 확인 화면</p>
      <h1 className="mt-1 text-xl font-semibold">{data.family.name}</h1>

      <ul className="mt-6 space-y-3">
        {data.members.map(({ profile, headline, weakestItem }) => (
          <li key={profile.id} className="rounded-xl border border-neutral-200 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{profile.displayName}</span>
              <span className="text-xs text-neutral-500">
                {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
              </span>
            </div>

            <p className="mt-2 text-sm text-neutral-600">
              {headline ?? "첫 측정을 등록하면 지도가 그려져요"}
            </p>

            {/* 만 4세 미만은 규준 자체가 없어서 측정 버튼을 아예 렌더링하지 않는다 */}
            {!profile.measurable && (
              <p className="mt-1 text-xs text-neutral-400">
                만 4세부터 체력 측정 결과를 볼 수 있어요
              </p>
            )}

            {weakestItem && (
              <p className="mt-1 text-xs text-neutral-400">
                약점 {weakestItem}
                {typeof data.members[0].overallPercentile === "number" &&
                profile.id === data.members[0].profile.id
                  ? ` · ${percentileText(data.members[0].overallPercentile)}`
                  : ""}
              </p>
            )}

            {profile.userId === null && profile.role === "PARENT" && (
              <p className="mt-1 text-xs text-neutral-400">아직 합류하지 않았어요</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
