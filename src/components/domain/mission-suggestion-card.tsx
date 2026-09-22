"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import type { MissionSuggestion } from "@/lib/api/types";
import { useCreateMission, useFamilyProfiles } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { targetCopy } from "@/lib/mission";
import { formatDate } from "@/lib/utils";

/**
 * 대화 중에 나온 미션 제안.
 *
 * 답변 글 안에 "이런 미션은 어떨까요" 라고 적어 두면 부모가 그걸 읽고 다시
 * 미션 만들기 화면으로 가서 손으로 옮겨 적어야 한다. 그 사이에 그만둔다.
 * 카드로 내놓고 버튼 하나로 만들 수 있게 한다.
 *
 * 승인 게이트는 그대로다 — 이건 코치가 자동으로 만든 주간 제안이 아니라
 * **보호자가 직접 누르는** 미션이라 원래부터 보호자 권한이다.
 */
export function MissionSuggestionCard({
  suggestion,
  familyId,
}: {
  suggestion: MissionSuggestion;
  familyId: string;
}) {
  const { data: family } = useFamilyProfiles(familyId);
  const create = useCreateMission(familyId);
  const [made, setMade] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const names = (suggestion.participantProfileIds ?? [])
    .map((id) => family?.profiles?.find((p) => p.profileId === id)?.name)
    .filter(Boolean);

  if (made) {
    return (
      <div className="border-done bg-done-soft flex items-center gap-2 rounded-2xl border p-3.5">
        <Check className="text-done size-4 shrink-0" strokeWidth={3} aria-hidden />
        <span className="text-done text-sm font-extrabold">미션이 됐어요</span>
      </div>
    );
  }

  return (
    <div className="border-signal bg-signal-soft/50 rounded-2xl border p-4">
      <p className="text-faint text-micro font-extrabold">이런 미션은 어떨까요</p>

      <div className="mt-2 flex items-start gap-3">
        <Illustration name="item/item-clipboard" size={38} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-body leading-snug font-extrabold">{suggestion.title}</p>
          <p className="text-signal-deep mt-0.5 text-sm font-bold">
            {targetCopy(suggestion.targetMetric, suggestion.targetValue)}
          </p>
          {suggestion.rationale && (
            <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{suggestion.rationale}</p>
          )}
        </div>
      </div>

      <dl className="divide-rows mt-3">
        <Row
          label="기간"
          value={`${formatDate(suggestion.startDate)} ~ ${formatDate(suggestion.endDate)}`}
        />
        {names.length > 0 && <Row label="함께" value={names.join(" · ")} />}
        {suggestion.videoTitle && <Row label="영상" value={suggestion.videoTitle} />}
      </dl>

      {error && (
        <p role="alert" className="text-signal-deep mt-2.5 text-sm font-bold">
          {error}
        </p>
      )}

      <Button
        size="md"
        className="mt-3 w-full"
        loading={create.isPending}
        onClick={async () => {
          setError(null);
          try {
            await create.mutateAsync({
              title: suggestion.title,
              startDate: suggestion.startDate,
              endDate: suggestion.endDate,
              targetMetric: suggestion.targetMetric,
              targetValue: suggestion.targetValue,
              videoId: suggestion.videoId ?? undefined,
              participantProfileIds: suggestion.participantProfileIds,
            });
            setMade(true);
          } catch (e) {
            setError(
              errorMessage(
                e,
                {
                  NOT_A_PARENT: "미션 만들기는 보호자 계정에서 할 수 있어요.",
                  VIDEO_NOT_FOUND: "영상을 찾지 못했어요. 영상 없이 만들어 볼까요?",
                },
                "만들지 못했어요. 잠시 후 다시 시도해 주세요.",
              ),
            );
          }
        }}
      >
        미션 만들기
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-faint text-caption shrink-0 font-bold">{label}</dt>
      <dd className="text-caption min-w-0 text-right font-semibold">{value}</dd>
    </div>
  );
}
