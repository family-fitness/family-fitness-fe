"use client";

import { Play } from "lucide-react";

import type { CoachProposal } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { safeUrl } from "@/lib/safe-url";
import { Citations } from "@/components/domain/citations";
import { targetCopy } from "@/lib/mission";

/** 코치가 낸 제안 하나. */
export function ProposalRow({
  proposal,
  index,
  nameOf,
}: {
  proposal: CoachProposal;
  index: number;
  /** 프로필 id → 이름. 제안에는 이름이 없고 id 만 온다 */
  nameOf: (profileId: string | undefined) => string;
}) {
  const video = proposal.video;

  return (
    <li className="py-5">
      <div className="flex items-start gap-3">
        <span className="board-num text-signal-deep w-7 shrink-0 text-2xl leading-none">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lead leading-snug font-extrabold">{proposal.title}</h3>
          <p className="text-ink-soft mt-0.5 text-xs font-semibold">
            {targetCopy(proposal.targetMetric, proposal.targetValue)}
          </p>
          {proposal.rationale && (
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">{proposal.rationale}</p>
          )}
        </div>
      </div>

      {/* 누가 뛰고 누가 함께 가는지 */}
      {proposal.participants && proposal.participants.length > 0 && (
        <ul className="mt-3 ml-10 flex flex-wrap gap-1.5">
          {proposal.participants.map((p) => (
            <li
              key={p.profileId}
              className="border-line text-ink-soft text-caption inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold"
            >
              {nameOf(p.profileId)}
              <span className="text-faint font-semibold">{p.coachRole}</span>
            </li>
          ))}
        </ul>
      )}

      {video && (
        <a
          href={safeUrl(video.url) ?? "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="press border-line mt-3 ml-10 flex items-start gap-2.5 rounded-xl border p-3"
        >
          <span className="bg-signal-soft mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg">
            <Play className="text-signal-deep size-3.5 fill-current" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.82rem] leading-snug font-bold">{video.title}</span>
            {video.badges && video.badges.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {video.badges.map((b) => (
                  <span
                    key={b}
                    className="bg-sub text-ink-soft text-micro rounded px-1.5 py-0.5 font-bold"
                  >
                    {b}
                  </span>
                ))}
              </span>
            )}
          </span>
        </a>
      )}

      {/* 근거 없는 제안은 버그다. 비어 있어도 자리를 남긴다 */}
      <Citations items={proposal.citations} className="mt-3 ml-10" />
    </li>
  );
}

/** 제안이 하나도 없을 때. 글만 두면 오류난 화면처럼 보인다 */
export function ProposalEmpty() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Illustration name="scene/scene-no-record" size={120} />
      <p className="mt-3 text-sm font-bold">제안이 만들어지지 않았어요</p>
      <p className="text-ink-soft mt-1 text-sm">
        측정 기록이 있는 구성원이 없으면 코치가 편성할 수 없어요.
      </p>
    </div>
  );
}
