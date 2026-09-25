"use client";

import type { ReactNode } from "react";

import { AppBar } from "./app-bar";

/** 화면 머리 — 제목 아래 한 줄이 더 필요한 경우. */
export function PageHeader({
  title,
  meta,
  back,
  backHref,
  action,
}: {
  title: string;
  meta?: ReactNode;
  back?: boolean;
  /** 돌아갈 곳이 정해져 있을 때 — 기록이 바꿔치기로만 이어져 뒤로 갈 곳이 없는 화면 */
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <>
      <AppBar back={back} backHref={backHref} title={title} right={action} />
      {meta && (
        <div className="text-ink-soft flex items-center justify-between gap-3 px-5 pb-2 text-xs font-semibold">
          {meta}
        </div>
      )}
    </>
  );
}
