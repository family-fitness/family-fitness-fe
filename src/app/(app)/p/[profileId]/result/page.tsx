"use client";

import { LineChart, Ruler } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordRow } from "@/components/domain/record-bar";
import { GRADE_LABEL, gradeSeal, itemLabel, itemUnit } from "@/lib/fitness-items";
import { useLatestFitnessTest, useMyProfiles } from "@/lib/api/queries";
import { formatDate, withJosa } from "@/lib/utils";

/**
 * 측정 결과 — 국민체력100 규준 대비 백분위와 등급.
 *
 * 등급은 도장으로 보여준다. 색으로 좋고 나쁨을 가르지 않는다.
 * 도장은 테두리 겹수만 다르다 — 1등급이 다섯 겹, 5등급이 한 겹이다.
 */
export default function ResultPage() {
  const { profileId } = useParams<{ profileId: string }>();

  const { data: profiles } = useMyProfiles();
  const profile = profiles?.find((p) => p.id === profileId);
  const { data: test, isPending } = useLatestFitnessTest(profileId);

  if (isPending) return <ResultSkeleton />;

  if (!test) {
    return (
      <>
        <PageHeader eyebrow="RESULT" title="측정 결과" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="아직 기록이 없어요"
            description="집에서 잴 수 있는 항목부터 넣어 보세요. 한 개만 넣어도 또래 중 어디쯤인지 알 수 있어요."
            action={
              <Link
                href={`/p/${profileId}/measure`}
                className="press bg-signal mt-1 rounded-xl px-5 py-3 text-[0.95rem] font-bold text-white"
              >
                측정 입력하기
              </Link>
            }
          />
        </Screen>
      </>
    );
  }

  const sorted = [...test.items].sort((a, b) => (a.percentile ?? 0) - (b.percentile ?? 0));
  const weakest = sorted[0];

  return (
    <>
      <PageHeader
        eyebrow="RESULT"
        title={profile ? `${profile.displayName} 결과` : "측정 결과"}
        back
        meta={
          <>
            <span>{formatDate(test.measuredOn)} 측정</span>
            <span className="text-faint">
              {test.source === "HOME" ? "집에서 직접" : "센터 결과지"}
            </span>
          </>
        }
      />

      <Screen className="space-y-7">
        {/* 종합 — 기록이 주인공이라 크게 띄운다 */}
        <div className="flex items-center gap-4">
          {test.overallGrade && (
            <Illustration
              name={gradeSeal(test.overallGrade)}
              size={88}
              alt={GRADE_LABEL[test.overallGrade]}
            />
          )}
          <div className="min-w-0">
            <p className="text-ink-soft text-sm font-semibold">또래 중 내 자리</p>
            <p className="board-num text-[3.4rem] leading-none">{test.overallPercentile}</p>
            <p className="text-ink-soft mt-1 text-sm">
              {test.overallGrade && `${GRADE_LABEL[test.overallGrade]} · `}
              상위 {Math.max(1, 100 - (test.overallPercentile ?? 0))}%
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="section-head">
            <h2>항목별</h2>
          </div>
          {test.items.map((entry, index) => (
            <div key={entry.item} className="flex items-start gap-3">
              <Illustration name={`move/move-${poseKey(entry.item)}`} size={52} className="mt-1" />
              <div className="min-w-0 flex-1">
                <RecordRow
                  label={itemLabel(entry.item)}
                  value={`${entry.value}${itemUnit(entry.item)}`}
                  percentile={entry.percentile ?? 0}
                  delay={index * 0.08}
                />
              </div>
            </div>
          ))}
        </section>

        {/* 약한 항목을 짚되 아이 화면에서는 이 화면 자체를 보여주지 않는다 */}
        {weakest && (
          <div className="bg-signal-soft rounded-2xl p-4">
            <p className="text-signal-deep text-sm font-bold">
              {withJosa(itemLabel(weakest.item), "이가")} 가장 낮아요
            </p>
            <p className="text-ink-soft mt-1 text-sm leading-relaxed">
              코치가 이 항목을 올리는 운동을 찾아 줍니다. 승인하면 이번 주 미션이 돼요.
            </p>
            <Link href="/coach/weekly" className="text-signal mt-2 inline-block text-sm font-bold">
              이번 주 제안 보기
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/p/${profileId}/future`}
            className="press border-line flex items-center gap-2 rounded-xl border px-4 py-3.5"
          >
            <LineChart className="text-signal size-4" aria-hidden />
            <span className="text-sm font-bold">10년 후 보기</span>
          </Link>
          <Link
            href={`/p/${profileId}/measure`}
            className="press border-line flex items-center gap-2 rounded-xl border px-4 py-3.5"
          >
            <Ruler className="text-signal size-4" aria-hidden />
            <span className="text-sm font-bold">다시 측정</span>
          </Link>
        </div>

        <p className="text-faint text-[0.7rem] leading-relaxed">
          국민체력100 규준에 따라 나이와 성별이 같은 사람들과 비교한 값이에요. 측정 환경에 따라
          결과가 달라질 수 있어요.
        </p>
      </Screen>
    </>
  );
}

/** FitnessItemCode 를 move 에셋 이름으로 바꾼다 */
function poseKey(code: string): string {
  return (
    {
      SIT_UP: "situp",
      SIT_AND_REACH: "sit-and-reach",
      SINGLE_LEG_STAND: "single-leg",
      GRIP_STRENGTH: "grip",
      STANDING_LONG_JUMP: "long-jump",
      SHUTTLE_RUN: "shuttle-run",
    }[code] ?? "situp"
  );
}

function ResultSkeleton() {
  return (
    <>
      <PageHeader eyebrow="RESULT" title="측정 결과" back />
      <Screen className="space-y-7">
        <div className="flex items-center gap-4">
          <Skeleton className="size-22 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-28" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-13 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </Screen>
    </>
  );
}
