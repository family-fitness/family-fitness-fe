"use client";

import type { ReactNode } from "react";

import { AppBar } from "./app-bar";

/**
 * 화면 머리 — 제목 아래 한 줄이 더 필요한 경우.
 *
 * 예전에는 영문 eyebrow 와 큰 제목, 굵은 선을 두는 "기록판" 모양이었다.
 * 탭바를 없애고 역할별 홈을 만들면서 **머리가 두 가지 모양으로 갈렸고**,
 * 한 앱에서 섞이니 덜 만든 것처럼 보였다.
 *
 * 이제 `AppBar` 와 같은 얇은 막대를 쓰고, 큰 제목은 화면 본문의 첫 줄이 맡는다.
 * 폰 화면에서 머리와 본문이 같은 말을 두 번 하면 자리만 먹는다.
 *
 * `meta` 는 제목 아래 보조 정보(측정한 날, 항목 수)를 넣는 자리다.
 * 이게 필요 없으면 `AppBar` 를 그냥 쓴다.
 */
export function PageHeader({
  title,
  meta,
  back,
  action,
}: {
  title: string;
  meta?: ReactNode;
  back?: boolean;
  action?: ReactNode;
}) {
  return (
    <>
      <AppBar back={back} title={title} right={action} />
      {meta && (
        <div className="text-ink-soft flex items-center justify-between gap-3 px-5 pb-2 text-xs font-semibold">
          {meta}
        </div>
      )}
    </>
  );
}
