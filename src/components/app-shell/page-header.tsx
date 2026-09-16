"use client";

import type { ReactNode } from "react";

import { AppBar } from "./app-bar";

/** 화면 머리 — 제목 아래 한 줄이 더 필요한 경우. */
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
