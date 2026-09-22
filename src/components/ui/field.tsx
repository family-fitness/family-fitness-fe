"use client";

import { useId, type ReactNode } from "react";

/**
 * 라벨 + 설명 + 입력 한 묶음.
 *
 * **입력이 하나일 때만 `<label>` 이다.** 칩 여러 개를 `<label>` 로 감싸면 브라우저가
 * 라벨을 **첫 번째 칩 하나에만** 묶고, 그 칩의 이름을 라벨 글 전체로 바꿔 버린다.
 * 실제로 「여성」 칩이 「성별 국민체력100 규준이 성별로 나뉘어 있어요 **남성**」 으로
 * 읽히고 있었다 — 스크린리더를 쓰는 사람에게 성별 칩이 서로 반대로 들렸다.
 *
 * 고를 것이 여럿이면 `group` 을 켠다. 묶음에 이름을 주되 칩 각자의 이름은 그대로 둔다.
 */
export function Field({
  label,
  hint,
  group,
  children,
}: {
  label: string;
  hint?: string;
  /** 안에 고르는 것이 여럿일 때. 칩 묶음 · 라디오 줄 */
  group?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const head = (
    <>
      <span className="text-ink-soft block text-xs font-bold" id={group ? id : undefined}>
        {label}
      </span>
      {hint && (
        <span
          className="text-faint text-caption mt-0.5 block"
          id={group ? `${id}-hint` : undefined}
        >
          {hint}
        </span>
      )}
      <span className="mt-1.5 block">{children}</span>
    </>
  );

  if (group) {
    return (
      <div role="group" aria-labelledby={hint ? `${id} ${id}-hint` : id} className="block">
        {head}
      </div>
    );
  }
  return <label className="block">{head}</label>;
}
