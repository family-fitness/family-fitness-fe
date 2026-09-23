"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeStrip } from "@/components/domain/badge-row";
import { RecordList } from "@/components/domain/record-list";
import { earnedBadges } from "@/lib/badges";
import { FactorRow, RecentForm, StatStrip } from "@/components/domain/stat-strip";
import { daysBefore, daysSince } from "@/lib/today";
import {
  useCheers,
  useFamilyProfiles,
  useFitnessMap,
  useLatestFitnessTest,
  useMissions,
  useVideos,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useBodyStore } from "@/stores/body-store";
import { formatDate, withJosa } from "@/lib/utils";

/**
 * 아이 한 명 자세히 — 어떻게 자라고 있나.
 * ▲ 서버가 `/fitness-tests/latest` 만 줘서 추이를 그릴 수 없다. 이력 조회를 요청해 뒀다.
 */
export default function ChildDetailPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId, isPending } = useSession();

  const { data: family, error: familyError, refetch } = useFamilyProfiles(familyId);
  const { data: map } = useFitnessMap(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL" });
  const { data: cheers } = useCheers(familyId);
  const { data: watched } = useVideos({ list: "RECENT", profileId });
  const {
    data: latest,
    isPending: latestPending,
    error: latestError,
  } = useLatestFitnessTest(profileId);
  const localBody = useBodyStore((s) => s.byProfile[profileId]);

  const profile = family?.profiles?.find((p) => p.profileId === profileId);
  const member = map?.members?.find((m) => m.profileId === profileId);

  if (isPending || latestPending) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage className="space-y-6">
          <Skeleton className="mx-auto size-44 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </Stage>
      </>
    );
  }

  // 불러오지 못한 것과 없는 것은 다르다. 섞으면 서버가 죽었을 때
  // 부모에게 "그런 아이는 없습니다" 라고 말하게 된다
  const failure = familyError ?? latestError;
  if (failure) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage>
          <ErrorState error={failure} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage>
          <EmptyState
            scene="no-record"
            title="찾을 수 없는 프로필이에요"
            description="다른 가족의 프로필이거나 지워진 프로필일 수 있어요."
          />
        </Stage>
      </>
    );
  }

  const score = member?.latest?.overallPercentile ?? null;
  const days = daysSince(latest?.testedOn);
  const radar = latest?.radar ?? [];
  const items = latest?.items ?? [];
  /* 이 아이가 참여한 미션만. 가족 전체 목록에서 걸러 낸다 */
  const recent = (missions?.missions ?? []).filter((m) =>
    m.participants?.some((p) => p.profileId === profileId),
  );
  /* 아이가 받은 기념 표시. 부모도 같은 것을 본다 */
  const badges = earnedBadges({
    watched: watched?.videos,
    missions: missions?.missions,
    cheers: cheers?.cheers,
    me: member,
    profileId,
  });
  const weakest = latest?.weakest;
  /*
    최근 7일. 측정 점수는 몇 달에 한 번 바뀌지만 이 줄은 오늘 움직이면
    오늘 바뀐다 — 부모가 매일 열어 볼 이유가 여기서 생긴다.
  */
  const sevenDaysAgo = daysBefore(6);
  const recentParts = recent
    .filter((m) => (m.endDate ?? "") >= sevenDaysAgo)
    .flatMap((m) =>
      (m.participants ?? []).filter((p) => p.profileId === profileId).map((p) => ({ m, p })),
    );
  const recentMinutes = recentParts.reduce(
    (sum, { m, p }) =>
      sum +
      (m.targetMetric === "TIMER_MINUTES"
        ? Math.round((p.progress ?? 0) * (m.targetValue ?? 0))
        : 0),
    0,
  );
  const recentPraise = (cheers?.cheers ?? []).filter(
    (c) => c.toProfileId === profileId && c.message && c.createdAt.slice(0, 10) >= sevenDaysAgo,
  ).length;
  /*
    서버가 돌려주면 서버 값을 쓴다. 기기에 들고 있는 값은 **서버가 아직 안
    돌려줄 때만** 쓰는 임시 저장이라, 둘이 다르면 서버가 맞다.
  */
  const body =
    latest?.heightCm && latest?.weightKg && latest?.testedOn
      ? { heightCm: latest.heightCm, weightKg: latest.weightKg, measuredOn: latest.testedOn }
      : localBody;

  return (
    <>
      <AppBar back title={`${profile.name} 기록`} />
      <Stage className="space-y-6">
        {/* 1. 누구인지 · 지금 몇인지 · 기준 대비 어디인지. 한 줄에 몰아 둔다 */}
        <StatStrip
          profile={profile}
          score={score}
          meta={
            latest?.testedOn
              ? `${formatDate(latest.testedOn)}${days != null ? ` · ${days}일 전` : ""}`
              : undefined
          }
        />

        {/*
          한 줄에 몰아 둔다 — 서버가 준 한마디와 받은 표시.
          개수를 세지 않는다(도메인 규칙 12). 표시는 그림으로만 보인다.
        */}
        {(member?.headline || badges.length > 0) && (
          <div className="flex items-center gap-2.5">
            {member?.headline && (
              <p className="min-w-0 flex-1 text-sm font-bold">
                {member.headline}
                {weakest && (
                  <span className="text-ink-soft font-semibold"> · 지금은 {weakest.factor}</span>
                )}
              </p>
            )}
            <BadgeStrip badges={badges} className="shrink-0" />
          </div>
        )}

        {/* 2. 최근 며칠. 통산 점수만으론 지금 어떤 상태인지 알 수 없다 */}
        <RecentForm
          days={7}
          items={[
            { label: "움직인 시간", value: recentMinutes, unit: "분" },
            { label: "끝낸 미션", value: recentParts.filter(({ p }) => p.completed).length },
            { label: "받은 칭찬", value: recentPraise },
          ]}
        />

        {/* 3. 요인별. 레이더는 모양만 보이고 값을 못 읽어서 표로 세운다 */}
        {radar.length > 0 && (
          <section>
            <div className="section-head">
              <h2>요인별</h2>
              <span className="text-faint text-micro font-bold">가운데 눈금이 또래 평균</span>
            </div>
            <div className="divide-rows">
              {radar.map((point) => (
                <FactorRow
                  key={point.factor}
                  factor={point.factor ?? ""}
                  percentile={point.percentile}
                />
              ))}
            </div>
          </section>
        )}

        {/* 4. 항목별 원값. 무엇을 재서 나온 수인지 */}
        {items.length > 0 && (
          <section>
            <div className="section-head">
              <h2>항목별</h2>
              <span className="text-faint text-micro font-bold">{items.length}개 측정</span>
            </div>
            <table className="w-full">
              <tbody className="divide-rows">
                {items.map((item) => (
                  <tr key={item.itemCode}>
                    <td className="py-2.5 text-sm font-bold">{item.itemLabel}</td>
                    <td className="board-num py-2.5 text-right text-base">
                      {item.value}
                      <span className="text-ink-soft ml-0.5 text-xs font-bold">{item.unit}</span>
                    </td>
                    <td className="text-ink-soft w-16 py-2.5 text-right text-xs font-bold tabular-nums">
                      {item.topPercentText ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 5. 지금 몸 */}
        <section>
          <div className="section-head">
            <h2>지금 몸</h2>
          </div>
          <dl className="divide-rows">
            <BodyRow
              label="키"
              value={body ? `${body.heightCm}cm` : "아직 안 적었어요"}
              note={body && formatDate(body.measuredOn)}
            />
            <BodyRow
              label="몸무게"
              value={body ? `${body.weightKg}kg` : "아직 안 적었어요"}
              note={body && formatDate(body.measuredOn)}
            />
          </dl>
        </section>

        {/* 6. 최근 기록. 무엇으로 확인된 기록인지가 줄마다 보인다 */}
        {recent.length > 0 && (
          <section>
            <div className="section-head">
              <h2>최근 기록</h2>
              <Link
                href="/parent/history"
                className="text-signal-strong -mr-3 inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-xs font-bold"
              >
                전체
              </Link>
            </div>
            <RecordList missions={recent} profileId={profileId} limit={5} />
          </section>
        )}

        <section className="grid grid-cols-2 gap-2">
          <Link
            href={`/p/${profileId}/measure`}
            className="press bg-signal-strong col-span-2 block rounded-2xl py-4 text-center text-base font-extrabold text-white"
          >
            {withJosa(profile.name ?? "아이", "을를")} 다시 재기
          </Link>
          <Link
            href={`/p/${profileId}/result`}
            className="press border-line block rounded-2xl border py-3.5 text-center text-sm font-bold"
          >
            측정 결과
          </Link>
          <Link
            href={`/p/${profileId}/future`}
            className="press border-line block rounded-2xl border py-3.5 text-center text-sm font-bold"
          >
            10년 뒤
          </Link>
        </section>
      </Stage>
    </>
  );
}

function BodyRow({ label, value, note }: { label: string; value: string; note?: string | false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3.5">
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="text-ink-soft text-right text-sm">
        {value}
        {note && <span className="text-faint text-caption ml-1.5">{note}</span>}
      </dd>
    </div>
  );
}
