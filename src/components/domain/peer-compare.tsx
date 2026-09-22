"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { PeerCloud } from "@/components/domain/peer-cloud";
import { Illustration } from "@/components/ui/illustration";
import { withJosa } from "@/lib/utils";

/**
 * 또래와 견주면 어디인가.
 *
 * 그리는 일은 PeerCloud 가 한다. 여기 남은 건 **아직 안 쟀을 때**를 어떻게
 * 말할지와, 서버가 준 한 줄(headline)을 어디에 붙일지다.
 */
export function PeerCompare({
  name,
  score,
  headline,
  profileId,
}: {
  name: string;
  score: number | null;
  headline: string | null | undefined;
  /** 아직 안 쟀으면 재러, 쟀으면 자라는 기록으로 가는 곳 */
  profileId: string | undefined;
}) {
  /*
    첫 실행에 가장 오래 머무는 상태다.
    글만 두면 "뭘 해야 하지" 로 끝난다 — 바로 누를 것을 같이 둔다.
  */
  if (score == null) {
    return (
      <section className="border-line rounded-2xl border border-dashed p-4">
        <div className="flex items-center gap-3">
          <Illustration
            name="scene/scene-first-body"
            fallback="scene/scene-first-measure"
            size={56}
          />
          <p className="text-lead font-extrabold">아직 안 쟀어요</p>
        </div>
        {profileId && (
          <Link
            href={`/p/${profileId}/measure`}
            className="press bg-signal mt-3 block rounded-xl py-3 text-center text-sm font-extrabold text-white"
          >
            {withJosa(name, "은는")} 지금 재기
          </Link>
        )}
      </section>
    );
  }

  const gap = score - 50;

  /*
    점수 덩어리 전체가 자라는 기록으로 가는 문이다.
    전적 사이트에서 등급을 누르면 전적 페이지로 가는 것과 같은 자리다 —
    이게 있어서 홈에 「아이 기록」 카드를 따로 두지 않아도 된다.
  */
  const body = (
    <>
      <PeerCloud score={score} label={`${name} 신체 점수`} />

      <p className="mt-2 text-sm leading-relaxed">
        {/* 서버가 준 문구는 그대로 내보낸다. 백분위를 다시 계산하면
            반올림 기준이 달라져 두 화면이 서로 다른 말을 한다 */}
        {headline ? (
          <span className="font-bold">{headline}</span>
        ) : (
          <span className="font-bold">또래 100명 중 {score}번째 자리예요</span>
        )}
        <span className="text-ink-soft">
          {gap >= 10
            ? " · 또래보다 앞서 있어요"
            : gap <= -10
              ? " · 지금이 키우기 좋은 때예요"
              : " · 또래와 비슷해요"}
        </span>
      </p>
    </>
  );

  if (!profileId) return <section>{body}</section>;

  return (
    <Link href={`/parent/child/${profileId}`} className="press block" aria-label={`${name} 기록`}>
      {body}
      <span className="text-signal mt-1.5 flex items-center gap-0.5 text-xs font-bold">
        자라는 기록 보기
        <ChevronRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}
