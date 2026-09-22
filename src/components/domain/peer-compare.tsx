"use client";

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
  /** 아직 안 쟀을 때 재러 가는 곳 */
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
          <p className="text-ink-soft text-sm leading-relaxed">
            한 가지만 재도 {withJosa(name, "이가")} 또래 중 어디쯤인지 보입니다.
          </p>
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

  return (
    <section>
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
    </section>
  );
}
