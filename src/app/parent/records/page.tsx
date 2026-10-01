"use client";

import { HomeHeader } from "@/components/app-shell/home-header";
import { ParentHeadActions } from "@/components/app-shell/parent-head-actions";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ListRow } from "@/components/ui/list-row";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import type { FitnessMapMember } from "@/lib/api/types";
import { useFitnessMap } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { longDate } from "@/lib/today";

/**
 * 기록 탭. 캘린더와 체력.
 *
 *   「캘린더」  아이마다 한 달 기록(`/calendar?profileId=`)
 *   「체력」    나와 아이들. 사람마다 측정하기, 측정한 적이 있으면 결과 보기
 *
 * 보호자도 자기 체력을 측정한다. 측정 항목은 측정하는 사람의 연령대로 받고(성인 항목이 있다), 결과도 같은 화면이다.
 * 사람 줄은 나 먼저, 그다음 아이를 등록한 차례로 둔다. 점수로 줄 세우지 않는다(규칙 10)
 */
export default function RecordsTabPage() {
  const { familyId, profile, isPending, error: sessionError, refetch: refetchMe } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다. isLoading 으로 본다
  const { data: map, isLoading, error, refetch, isRefetching } = useFitnessMap(familyId);

  const header = <HomeHeader eyebrow={longDate()} title="기록" actions={<ParentHeadActions />} />;

  const failure = sessionError ?? (map ? null : error);
  if (failure) {
    return (
      <>
        {header}
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
            retrying={isRefetching}
          />
        </Stage>
      </>
    );
  }
  if (isPending || isLoading) {
    return (
      <>
        {header}
        <Stage wide className="space-y-3">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  const members = map?.members ?? [];
  const kids = members.filter((m) => m.role === "CHILD");
  const me = members.find((m) => m.profileId === profile?.profileId);
  const people = [...(me ? [me] : []), ...kids];

  return (
    <>
      {header}
      <Stage wide className="space-y-3">
        <section className="card" aria-label="캘린더">
          <CardHead title="캘린더" />
          <ul className="divide-rows">
            {kids.map((k) => (
              <ListRow
                key={k.profileId}
                href={`/calendar?profileId=${encodeURIComponent(k.profileId ?? "")}`}
                art="icon/menu-calendar"
                title={`${k.name}의 캘린더`}
              />
            ))}
          </ul>
        </section>

        <section className="card-hero" aria-label="체력">
          <CardHead title="체력" meta={`${people.length}명`} />
          <ul className="divide-rows">
            {people.map((p) => (
              <PersonLine key={p.profileId} person={p} me={p.profileId === profile?.profileId} />
            ))}
          </ul>
        </section>
      </Stage>
    </>
  );
}

/** 한 사람의 체력. 마지막으로 잰 날과 신체 점수, 측정하기와 결과 보기 */
function PersonLine({ person, me }: { person: FitnessMapMember; me: boolean }) {
  const testedOn = person.latest?.testedOn;
  const score = person.latest?.overallPercentile ?? null;
  // 만 4세 미만은 국민체력100 기준이 없다. 측정 화면도 폼을 띄우지 않는다
  const measurable = person.measurable !== false;
  const id = encodeURIComponent(person.profileId ?? "");

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <ProfileAvatar
          profileId={person.profileId}
          name={person.name}
          tone={person.role === "CHILD" ? "signal" : "mark"}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-extrabold">{person.name}</span>
            {me && <span className="text-ink-soft text-caption font-bold">나</span>}
          </span>
          <span className="text-caption text-ink-soft block truncate">
            {!measurable
              ? "만 4세부터 측정할 수 있어요"
              : testedOn
                ? `${longDate(testedOn)}에 측정했어요`
                : "아직 측정하지 않았어요"}
          </span>
        </span>
        {testedOn && score != null && (
          <span
            className="metric-value shrink-0 text-2xl leading-none"
            aria-label={`신체 점수 ${score}점`}
          >
            {score}
            <span className="metric-unit">점</span>
          </span>
        )}
      </div>
      {measurable && (
        <div className={testedOn ? "mt-2.5 grid grid-cols-2 gap-2" : "mt-2.5 grid"}>
          <NavLink
            href={`/p/${id}/measure`}
            className="press bg-sub flex min-h-11 items-center justify-center rounded-2xl text-sm font-extrabold"
          >
            측정하기
          </NavLink>
          {testedOn && (
            <NavLink
              href={`/p/${id}/result`}
              className="press bg-signal-soft text-signal-deep flex min-h-11 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              결과 보기
            </NavLink>
          )}
        </div>
      )}
    </li>
  );
}
