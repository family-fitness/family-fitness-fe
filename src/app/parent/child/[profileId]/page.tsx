"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorRow, StatStrip } from "@/components/domain/stat-strip";
import { daysSince } from "@/lib/today";
import { useFamilyProfiles, useFitnessMap, useLatestFitnessTest } from "@/lib/api/queries";
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
  const {
    data: latest,
    isPending: latestPending,
    error: latestError,
  } = useLatestFitnessTest(profileId);
  const body = useBodyStore((s) => s.byProfile[profileId]);

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
  const weakest = latest?.weakest;

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

        {member?.headline && (
          <p className="text-sm font-bold">
            {member.headline}
            {weakest && (
              <span className="text-ink-soft font-semibold"> · 지금은 {weakest.factor}</span>
            )}
          </p>
        )}

        {/* 2. 요인별. 레이더는 모양만 보이고 값을 못 읽어서 표로 세운다 */}
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

        {/* 3. 항목별 원값. 무엇을 재서 나온 수인지 */}
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

        {/* 4. 지금 몸 */}
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

        <section className="grid grid-cols-2 gap-2">
          <Link
            href={`/p/${profileId}/measure`}
            className="press bg-signal col-span-2 block rounded-2xl py-4 text-center text-base font-extrabold text-white"
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

        {!latest?.fitnessTestId && (
          <div className="border-line flex items-center gap-3 rounded-2xl border border-dashed p-4">
            <Illustration
              name="scene/scene-first-measure"
              fallback="scene/scene-first-body"
              size={52}
            />
            <p className="text-ink-soft text-sm leading-relaxed">
              한 가지만 재도 또래 중 어디쯤인지 바로 보여요.
            </p>
          </div>
        )}
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
