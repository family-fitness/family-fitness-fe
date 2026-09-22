"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Illustration } from "@/components/ui/illustration";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachSteps } from "@/components/domain/coach-steps";
import { ProposalEmpty, ProposalRow } from "@/components/domain/proposal-row";
import { errorMessage } from "@/lib/errors";
import {
  useApproveCoachRun,
  useCoachRun,
  useFamilyProfiles,
  useRejectCoachRun,
  useStartCoachRun,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useCoachRunId, useCoachStore } from "@/stores/coach-store";
import { formatDate } from "@/lib/utils";

/** 이번 주 코치 제안 — 승인 게이트. ★ */
export default function WeeklyCoachPage() {
  const router = useRouter();
  const { profile, familyId, isPending: sessionPending } = useSession();

  // 제안에는 가족 전체가 들어간다. useSession().profiles 는 이 계정이 관리하는
  // 프로필만이라 자녀 이름이 빠진다 — 이름은 가족 프로필 조회에서 찾는다
  const { data: family } = useFamilyProfiles(familyId);

  const runId = useCoachRunId(familyId);
  const setRunId = useCoachStore((s) => s.setRunId);

  const { data: run, isPending: runPending, error: runError, refetch } = useCoachRun(runId);
  const start = useStartCoachRun(familyId ?? "");
  const approve = useApproveCoachRun(runId ?? "", familyId ?? "");
  const reject = useRejectCoachRun(runId ?? "");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 승인하면 미션이 생긴다. 그 순간 미션 목록으로 보낸다
  useEffect(() => {
    if (approve.isSuccess) router.push("/parent");
  }, [approve.isSuccess, router]);

  const nameOf = (profileId: string | undefined) =>
    family?.profiles.find((p) => p.profileId === profileId)?.name ?? "가족";

  if (sessionPending) return <WeeklySkeleton />;

  // 만든 제안이 있는데 불러오지 못한 것. 처음부터 다시 만들라고 하면 안 된다
  if (runId && runError) {
    return (
      <>
        <PageHeader title="이번 주 제안" back />
        <Screen>
          <ErrorState error={runError} onRetry={() => void refetch()} />
        </Screen>
      </>
    );
  }

  /* 아직 한 번도 돌리지 않았다 */
  if (!runId) {
    return (
      <>
        <PageHeader title="이번 주 제안" back />
        <Screen>
          <EmptyState
            scene="waiting-approval"
            title="이번 주 제안을 만들어 볼까요"
            description="보호자가 승인해야 미션이 됩니다"
            action={
              <Button
                size="md"
                loading={start.isPending}
                onClick={async () => {
                  setError(null);
                  try {
                    const created = await start.mutateAsync({});
                    if (familyId) setRunId(familyId, created.coachRunId);
                  } catch (e) {
                    setError(startMessage(e));
                  }
                }}
              >
                제안 만들기
              </Button>
            }
          />
          {error && (
            <p
              role="alert"
              className="bg-signal-soft text-signal-deep mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {error}
            </p>
          )}
        </Screen>
      </>
    );
  }

  if (runPending || !run) return <WeeklySkeleton />;

  const proposals = run.proposals ?? [];

  return (
    <>
      <PageHeader
        title="이번 주 제안"
        back
        meta={
          <>
            {run.weekStart && <span>{formatDate(run.weekStart)} 주간</span>}
            <span className="text-faint">{statusCopy(run.status)}</span>
          </>
        }
      />

      <Screen className="space-y-7">
        {/* 이건 아직 미션이 아니다. 한 번은 분명히 말하고 넘어간다 */}
        {run.status === "AWAITING_APPROVAL" && (
          <div className="flex items-start gap-3">
            <Illustration name="scene/scene-waiting-approval" size={56} />
            <p className="text-ink-soft pt-1 text-sm leading-relaxed">
              아직 미션이 아니에요. 보호자가 승인하면 이번 주 미션으로 시작돼요.
            </p>
          </div>
        )}

        {/* 코치가 뭘 하고 있는지. 스피너 하나로 때우면 아무것도 설명되지 않는다 */}
        {(run.status === "RUNNING" || run.status === "FAILED") && (
          <section>
            <div className="section-head">
              <h2>코치가 하는 일</h2>
            </div>
            <CoachSteps steps={run.steps} />
          </section>
        )}

        {run.status === "RUNNING" && (
          <p className="text-ink-soft text-sm">자료를 찾는 중이에요. 보통 10초 안에 끝나요.</p>
        )}

        {run.status === "FAILED" && (
          <div className="space-y-4">
            <EmptyState
              scene="no-record"
              title="이번엔 제안을 만들지 못했어요"
              description="측정 기록이 있는 구성원이 없거나 자료를 찾지 못했어요. 한 명이라도 측정을 등록하면 다시 시도할 수 있어요."
            />
            <Button
              size="block"
              variant="outline"
              loading={start.isPending}
              onClick={async () => {
                setError(null);
                try {
                  const created = await start.mutateAsync({});
                  if (familyId) setRunId(familyId, created.coachRunId);
                } catch (e) {
                  setError(startMessage(e));
                }
              }}
            >
              다시 시도
            </Button>
          </div>
        )}

        {run.status === "REJECTED" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Illustration name="scene/scene-waiting-approval" size={64} />
              <div className="min-w-0">
                <p className="text-sm font-bold">이 제안은 거절했어요</p>
                {run.rejectedReason && (
                  <p className="text-ink-soft mt-1 text-sm leading-relaxed">
                    “{run.rejectedReason}”
                  </p>
                )}
                <p className="text-faint mt-1 text-xs">적어 주신 이유는 다음 주 편성에 참고돼요.</p>
              </div>
            </div>
            <Button
              size="block"
              variant="outline"
              loading={start.isPending}
              onClick={async () => {
                setError(null);
                try {
                  const created = await start.mutateAsync({});
                  if (familyId) setRunId(familyId, created.coachRunId);
                } catch (e) {
                  setError(startMessage(e));
                }
              }}
            >
              새 제안 만들기
            </Button>
          </div>
        )}

        {run.status === "APPROVED" && (
          <div className="flex items-start gap-3">
            <Illustration name="scene/scene-done" size={72} />
            <div className="min-w-0">
              <p className="text-sm font-bold">승인했어요</p>
              <p className="text-ink-soft mt-1 text-sm leading-relaxed">
                제안 {run.missionCount}개가 이번 주 미션이 됐어요.
              </p>
              <button
                type="button"
                onClick={() => router.push("/parent")}
                className="text-signal mt-2 text-sm font-bold"
              >
                미션 보러 가기
              </button>
            </div>
          </div>
        )}

        {/* 제안 목록. 승인 전에도 승인 후에도 내용은 같다 */}
        {proposals.length > 0 && (
          <section>
            <div className="section-head">
              <h2>{proposals.length}개 제안</h2>
            </div>
            {/* 제안이 하나면 요약과 이유가 같은 문장으로 온다. 두 번 읽히게 두지 않는다 */}
            {run.summary && !proposals.some((p) => p.rationale === run.summary) && (
              <p className="text-ink-soft mb-1 text-sm leading-relaxed">{run.summary}</p>
            )}
            <ul className="divide-rows">
              {proposals.map((p, i) => (
                <ProposalRow key={p.position ?? i} proposal={p} index={i} nameOf={nameOf} />
              ))}
            </ul>
          </section>
        )}

        {run.status === "AWAITING_APPROVAL" && proposals.length === 0 && <ProposalEmpty />}

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}
      </Screen>

      {/* 승인 · 거절. 서버가 canApprove 로 권한을 정한다 — 자녀에겐 버튼이 없다 */}
      {run.status === "AWAITING_APPROVAL" && proposals.length > 0 && (
        <div className="border-line bg-paper sticky bottom-0 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {run.canApprove ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="md"
                className="flex-1"
                onClick={() => setRejectOpen(true)}
              >
                거절
              </Button>
              <Button
                size="md"
                className="flex-[2]"
                loading={approve.isPending}
                onClick={async () => {
                  setError(null);
                  try {
                    await approve.mutateAsync();
                  } catch (e) {
                    setError(approveMessage(e));
                  }
                }}
              >
                승인하고 미션 만들기
              </Button>
            </div>
          ) : (
            <p className="text-ink-soft py-2 text-center text-sm">
              {profile?.role === "CHILD"
                ? "보호자가 승인하면 미션이 시작돼요"
                : "승인은 보호자 계정에서 할 수 있어요"}
            </p>
          )}
        </div>
      )}

      <Sheet open={rejectOpen} onClose={() => setRejectOpen(false)} title="제안을 거절할까요">
        <div className="space-y-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="예) 이번 주는 시험 기간이라 시간이 없어요"
            className="border-line focus:border-signal placeholder:text-faint field-focus w-full rounded-xl border bg-transparent p-3.5 text-sm"
          />
          <Button
            size="block"
            variant="danger"
            loading={reject.isPending}
            onClick={async () => {
              setError(null);
              try {
                await reject.mutateAsync(reason.trim() || undefined);
                setRejectOpen(false);
              } catch (e) {
                setError(approveMessage(e));
              }
            }}
          >
            거절하기
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function statusCopy(status: string | undefined) {
  switch (status) {
    case "RUNNING":
      return "만드는 중";
    case "AWAITING_APPROVAL":
      return "승인 기다리는 중";
    case "APPROVED":
      return "승인함";
    case "REJECTED":
      return "거절함";
    case "FAILED":
      return "만들지 못함";
    default:
      return "";
  }
}

const startMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      RUN_IN_PROGRESS: "이미 만드는 중이에요. 잠시만 기다려 주세요.",
      ALREADY_RUN_THIS_WEEK: "이번 주 제안이 이미 있어요. 아래에서 확인해 주세요.",
      NO_MEASURED_MEMBER: "측정 기록이 있는 구성원이 없어요. 한 명이라도 측정을 등록해 주세요.",
    },
    "제안을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
  );

const approveMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      NOT_A_PARENT: "승인은 보호자 계정에서 할 수 있어요.",
      ALREADY_APPROVED: "이미 승인된 제안이에요.",
      INVALID_STATE: "이미 처리된 제안이에요.",
    },
    "처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );

function WeeklySkeleton() {
  return (
    <>
      <PageHeader title="이번 주 제안" back />
      <Screen className="space-y-6">
        <Skeleton className="h-6 w-32" />
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </Screen>
    </>
  );
}
