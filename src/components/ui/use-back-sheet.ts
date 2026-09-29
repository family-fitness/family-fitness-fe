"use client";

import { useEffect, useRef, useState } from "react";

let seq = 0;

type Marked = { __sheet?: number } | null;

/**
 * 뒤로 가기로 닫히는 시트. 폰의 뒤로 · 브라우저 뒤로를 누르면 시트만 닫히고 그 화면에 남는다
 * (9/28 「돌아오면 이상한 화면 가지 말고 다시 저 화면」 — 첫 시작은 단계가 주소에 없어 뒤로 가면 첫 시작 밖으로 나갔다).
 *
 * 열 때 같은 주소로 한 칸을 쌓고, 뒤로 가기가 그 칸을 걷으면 닫는다. 단추로 닫으면 쌓은 칸을 되돌린다.
 * 쌓는 일은 누른 자리에서 한다 — effect 에서 쌓으면 개발 모드에서 두 번 도는 effect 가 칸을 둘 쌓고 곧바로 닫혔다.
 * 시트 안에 다른 화면으로 가는 길이 없을 때만 쓴다(닫을 때 뒤로 한 칸을 간다).
 *
 * 닫혀도 마지막에 연 값(`value`)은 남긴다 — 내려가는 동안 시트가 빈 채로 내려가지 않게.
 */
export function useBackSheet<T>() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<T | null>(null);
  const mine = useRef<number | null>(null);

  useEffect(() => {
    const onPop = () => {
      if (mine.current == null) return;
      // 앞으로 가기로 다시 그 칸에 왔으면 그대로 둔다
      if ((window.history.state as Marked)?.__sheet === mine.current) return;
      mine.current = null;
      setOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const show = (next: T) => {
    const token = ++seq;
    mine.current = token;
    // Next 의 기록(__NA · 트리)을 그대로 얹는다 — 빼면 뒤로 갈 때 Next 가 화면을 새로 불러온다
    window.history.pushState({ ...(window.history.state ?? {}), __sheet: token }, "");
    setValue(next);
    setOpen(true);
  };

  const hide = () => {
    const token = mine.current;
    mine.current = null;
    setOpen(false);
    if (token != null && (window.history.state as Marked)?.__sheet === token) window.history.back();
  };

  return { open, value, show, hide };
}
