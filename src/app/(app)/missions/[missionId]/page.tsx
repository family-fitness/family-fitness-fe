"use client";

import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { Celebrate } from "@/components/scene/celebrate";
import { MissionTimer } from "@/components/domain/mission-timer";
import { VerifyLabel } from "@/components/domain/mission-row";
import { YouTubePlayer } from "@/components/domain/youtube-player";
import { errorMessage } from "@/lib/errors";
import { safeUrl } from "@/lib/safe-url";
import {
  useConfirmParticipant,
  useFamilyProfiles,
  useMissions,
  useRecordSteps,
  useRecordTimer,
  useRecordVideoProgress,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { today } from "@/lib/today";
import { progressPercent, targetCopy } from "@/lib/mission";
import { cn, formatDate } from "@/lib/utils";

/**
 * 미션 하나 — 기록하는 곳.
 * ▲ 백엔드에 GET /missions/{missionId} 를 요청해 뒀다.
 */
export default function MissionDetailPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const { profile, familyId, isPending: sessionPending } = useSession();

  const { data, isLoading } = useMissions(familyId, { scope: "ALL" });
  const { data: family } = useFamilyProfiles(familyId);
  const mission = data?.missions?.find((m) => m.missionId === missionId);

  const [error, setError] = useState<string | null>(null);
  /** 누구 몫을 적는 중인지. 고르지 않았으면 첫 번째 */
  const [recordForId, setRecordForId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  // 내가 방금 끝냈을 때만 한 번 터뜨린다. 들어올 때마다 터지면 축하가 아니라 소음이다
  const myCompletion = mission?.participants?.find(
    (p) => p.profileId === profile?.profileId,
  )?.completed;
  const wasCompleted = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (myCompletion && wasCompleted.current === false) {
      setCelebrating(true);
      const id = setTimeout(() => setCelebrating(false), 2600);
      return () => clearTimeout(id);
    }
    wasCompleted.current = myCompletion;
  }, [myCompletion]);

  const recordTimer = useRecordTimer(missionId, familyId ?? "");
  const recordSteps = useRecordSteps(missionId, familyId ?? "");
  const recordVideo = useRecordVideoProgress(mission?.video?.videoId ?? "");
  const confirm = useConfirmParticipant(missionId, familyId ?? "");

  if (sessionPending || isLoading) return <DetailSkeleton />;

  if (!mission) {
    return (
      <>
        <PageHeader title="미션" back />
        <Screen>
          <EmptyState
            scene="no-mission"
            title="미션을 찾지 못했어요"
            description="기간이 지나 정리됐거나 다른 가족의 미션일 수 있어요."
          />
        </Screen>
      </>
    );
  }

  const participants = mission.participants ?? [];
  const isParent = profile?.role === "PARENT";

  /*
    적을 수 있는 몫: 내 것 + (보호자라면) 계정이 없는 참여자의 것.
    계정이 있는 사람 몫을 대신 적지는 않는다 — 자기 기록은 자기가 적는다.
  */
  const recordable = participants.filter((p) => {
    if (p.profileId === profile?.profileId) return true;
    if (!isParent) return false;
    const inFamily = family?.profiles?.find((member) => member.profileId === p.profileId);
    return inFamily?.hasAccount === false;
  });
  const recordFor =
    recordable.find((p) => p.profileId === recordForId) ?? recordable[0] ?? undefined;

  return (
    <>
      <Celebrate show={celebrating} />
      <PageHeader
        title={mission.title ?? "미션"}
        back
        meta={
          <>
            <span>{targetCopy(mission.targetMetric, mission.targetValue)}</span>
            {mission.endDate && (
              <span className="text-faint">{formatDate(mission.endDate)}까지</span>
            )}
          </>
        }
      />

      <Screen className="space-y-7">
        {mission.rationale && (
          <p className="text-ink-soft text-sm leading-relaxed">{mission.rationale}</p>
        )}

        {/*
          기록하기.

          내 몫만 적을 수 있으면 **폰이 없는 아이의 기록이 영영 안 남는다** —
          이 서비스는 프로필만 있으면 굴러가게 만들어 뒀다. 계약상 가족 구성원은
          다른 참여자 몫도 적을 수 있으므로(profileId 를 본문에 싣는다),
          계정이 없는 참여자가 있으면 보호자가 누구 몫인지 골라 적는다.
        */}
        {recordFor && (
          <section>
            <div className="section-head">
              <h2>오늘 기록하기</h2>
            </div>

            {recordable.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {/*
                  고른 칸은 recordForId 가 아니라 **실제로 기록될 사람**으로 친다.
                  아직 누르지 않았을 때 recordForId 는 비어 있어서, 이걸로 비교하면
                  어느 칸도 켜지지 않은 채 첫 사람 몫이 조용히 적히고 있었다.
                */}
                {recordable.map((p) => (
                  <button
                    key={p.profileId}
                    type="button"
                    aria-pressed={p.profileId === recordFor.profileId}
                    onClick={() => setRecordForId(p.profileId ?? null)}
                    className={cn("chip press", p.profileId === recordFor.profileId && "chip-on")}
                  >
                    {p.profileId === profile?.profileId ? "나" : p.name}
                  </button>
                ))}
              </div>
            )}

            {mission.targetMetric === "TIMER_MINUTES" && (
              <MissionTimer
                missionId={missionId}
                pending={recordTimer.isPending}
                onFinish={async (body) => {
                  setError(null);
                  try {
                    await recordTimer.mutateAsync({
                      profileId: recordFor.profileId ?? "",
                      ...body,
                    });
                  } catch (e) {
                    setError(activityMessage(e));
                  }
                }}
              />
            )}

            {mission.targetMetric === "VIDEO_DONE" && mission.video && (
              <div className="space-y-2">
                <YouTubePlayer
                  videoId={mission.video.videoId ?? ""}
                  startSec={mission.video.startSec}
                  onProgress={(progress, watchedSec) => {
                    recordVideo.mutate({
                      profileId: recordFor.profileId ?? "",
                      progress,
                      watchedSec,
                      missionId,
                    });
                  }}
                />
              </div>
            )}

            {mission.targetMetric === "STEPS" && (
              <StepsForm
                pending={recordSteps.isPending}
                onSubmit={async (steps) => {
                  setError(null);
                  try {
                    await recordSteps.mutateAsync({
                      profileId: recordFor.profileId ?? "",
                      activityDate: today(),
                      steps,
                    });
                  } catch (e) {
                    setError(activityMessage(e));
                  }
                }}
              />
            )}
          </section>
        )}

        {/*
          어떤 운동인지.

          제목만 있으면 부모는 "줄넘기 2분" 이 무슨 영상인지 모른 채 아이에게
          시키게 된다. 같이 하려면 먼저 봐야 한다 — 새 탭으로 연다.
          영상 미션이면 위에서 이미 플레이어가 돌고 있으니 두 번 두지 않는다.
        */}
        {mission.video?.url && mission.targetMetric !== "VIDEO_DONE" && (
          <section>
            <div className="section-head">
              <h2>이 운동</h2>
            </div>
            <a
              href={safeUrl(mission.video.url) ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="press mt-1 flex items-center gap-3 py-2"
            >
              <span className="bg-signal-soft grid size-14 shrink-0 place-items-center rounded-xl">
                <Illustration name="item/item-shoes" size={30} />
              </span>
              <span className="text-body min-w-0 flex-1 leading-snug font-bold">
                {mission.video.title}
              </span>
              <ExternalLink className="text-faint size-4 shrink-0" aria-hidden />
            </a>
          </section>
        )}

        {/* 같이 하는 사람들 */}
        <section>
          <div className="section-head">
            <h2>함께하는 가족</h2>
          </div>
          <ul className="divide-rows">
            {participants.map((p) => {
              const percent = progressPercent(p.progress);
              return (
                <li key={p.profileId} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold">{p.name}</span>
                    <span className="tabular text-faint text-xs">{percent}%</span>
                  </div>
                  <div className="record-rail mt-1.5">
                    <span className="record-fill" style={{ width: `${percent}%` }} aria-hidden />
                  </div>
                  <VerifyLabel participant={p} />

                  {/* 걸음수 미션의 마지막 관문. 보호자만 누를 수 있다 */}
                  {p.needsGuardianCheck && isParent && (
                    <Button
                      size="sm"
                      variant="soft"
                      className="mt-2"
                      loading={confirm.isPending}
                      onClick={async () => {
                        setError(null);
                        try {
                          await confirm.mutateAsync(p.profileId ?? "");
                        } catch (e) {
                          setError(activityMessage(e));
                        }
                      }}
                    >
                      {p.name} 확인해 주기
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}
      </Screen>
    </>
  );
}

/** 걸음수 입력. */
function StepsForm({
  onSubmit,
  pending,
}: {
  onSubmit: (steps: number) => void;
  pending?: boolean;
}) {
  const [value, setValue] = useState("");
  const steps = Number(value);
  const valid = value !== "" && Number.isFinite(steps) && steps >= 0 && steps <= 100000;

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="오늘 걸은 수"
          aria-label="오늘 걸음수"
          className="border-line focus:border-signal placeholder:text-faint field-focus h-13 w-full rounded-xl border bg-transparent pr-14 pl-4 text-base"
        />
        <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold">
          걸음
        </span>
      </div>
      <p className="text-faint text-xs leading-relaxed">
        직접 입력한 값이라 보호자 확인이 필요합니다.
      </p>
      <Button size="block" disabled={!valid} loading={pending} onClick={() => onSubmit(steps)}>
        기록하기
      </Button>
    </div>
  );
}

const activityMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      NOT_PARTICIPANT: "이 미션의 참여자가 아니에요.",
      INVALID_METRIC: "이 미션은 다른 방식으로 기록해요. 새로고침 후 다시 시도해 주세요.",
      TARGET_NOT_REACHED: "아직 목표에 닿지 않았어요.",
      NOT_A_PARENT: "확인은 보호자 계정에서 할 수 있어요.",
    },
    "기록하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );

function DetailSkeleton() {
  return (
    <>
      <PageHeader title="미션" back />
      <Screen className="space-y-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Screen>
    </>
  );
}
