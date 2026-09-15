"use client";

import Link from "next/link";

import { Illustration } from "@/components/ui/illustration";
import { withJosa } from "@/lib/utils";

/**
 * 또래와 견주면 어디인가.
 *
 * 점수만 크게 띄우면 62가 좋은 건지 알 수 없다. **또래 평균(50)을 같은 축 위에**
 * 놓아야 비로소 뜻이 생긴다. 이게 부모가 이 앱을 여는 이유다.
 *
 * 문구는 서버가 준 `headline` 을 그대로 쓴다. 백분위에서 "상위 N%" 를 프론트가
 * 다시 만들면 반올림이 서버와 달라져 화면마다 다른 말을 한다.
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
            한 가지만 재도 {withJosa(name, "이가")} 또래 중 어디쯤인지 바로 보여요. 자 하나면 집에서
            됩니다.
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

  const average = 50;
  const gap = score - average;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{name}</span>
        <span className="text-ink-soft text-sm font-bold">또래 평균</span>
      </div>

      {/* 같은 축 위에 둘을 얹는다. 막대 두 개를 따로 그리면 비교가 안 된다 */}
      <div className="relative mt-2 h-11">
        <div className="bg-sub absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full" />
        <div
          className="bg-signal absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-full"
          style={{ width: `${score}%` }}
        />
        {/* 또래 평균 눈금 */}
        <div
          className="bg-ink-soft absolute top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${average}%` }}
          aria-hidden
        />
        <span
          className="border-signal bg-paper absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2"
          style={{ left: `${score}%` }}
        >
          <span className="text-signal-deep text-[0.7rem] font-extrabold tabular-nums">
            {score}
          </span>
        </span>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed">
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
