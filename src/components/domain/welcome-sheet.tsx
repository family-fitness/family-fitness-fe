"use client";

import { useState, useSyncExternalStore } from "react";

import { ArtIcon } from "@/components/ui/art-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

/**
 * 처음 들어올 때 한 번 — 「환영합니다」 와 사용법 세 줄(9/28 · 9/29 「처음 시작 시 튜토리얼도 없고」).
 * 닫으면 이 기기에서 다시 뜨지 않는다. 부모 · 아이 따로 적는다 — 한 폰을 같이 쓰면 아이도 자기 것을 한 번 본다.
 *
 * 설명 문구를 두지 않는 규칙의 예외다(AGENTS 「피할 목록」). 줄마다 그림 하나 · 이름 · 한 줄.
 * 서버가 알 까닭이 없어 기기에 적는다. 못 읽는 기기(사생활 보호 창)에서는 띄우지 않는다 — 매번 뜨는 것보다 낫다.
 */
type Who = "parent" | "kid";

const KEY = "ff-welcome";

const GUIDE: Record<Who, { title: string; rows: { art: string; name: string; text: string }[] }> = {
  parent: {
    title: "환영합니다",
    rows: [
      {
        art: "icon/menu-measure",
        name: "먼저 재요",
        text: "집에서 잴 수 있는 것부터. 또래 속 자리가 육각형으로 보여요",
      },
      {
        art: "icon/menu-ai",
        name: "오늘 운동 받기",
        text: "AI 제안을 보고 「오늘 운동으로 등록」을 누르면 아이 화면에 떠요",
      },
      {
        art: "icon/menu-cheer",
        name: "칭찬하기",
        text: "아이가 다 하면 알림이 와요. 스티커를 골라 붙여 주세요",
      },
    ],
  },
  kid: {
    title: "환영해요",
    rows: [
      { art: "icon/mode-full", name: "오늘 운동", text: "큰 단추를 누르고 영상을 따라 해요" },
      { art: "icon/menu-cheer", name: "알리기", text: "다 하면 엄마 · 아빠한테 알려요" },
      {
        art: "icon/menu-trophy",
        name: "레벨",
        text: "할수록 키움이가 자라고 섬에 나무가 생겨요",
      },
    ],
  },
};

function seenOn(who: Who): boolean {
  try {
    return (localStorage.getItem(KEY) ?? "").split(",").includes(who);
  } catch {
    return true;
  }
}

function markSeen(who: Who) {
  try {
    const seen = new Set((localStorage.getItem(KEY) ?? "").split(",").filter(Boolean));
    seen.add(who);
    localStorage.setItem(KEY, [...seen].join(","));
  } catch {
    // 못 적으면 다음에 또 뜬다. 막을 방법이 없다
  }
}

const noop = () => () => {};

export function WelcomeSheet({ who }: { who: Who }) {
  // 서버가 그린 첫 화면은 「본 적 있음」 — 기기 값은 브라우저에서만 읽는다
  const seen = useSyncExternalStore(
    noop,
    () => seenOn(who),
    () => true,
  );
  const [closed, setClosed] = useState(false);
  const guide = GUIDE[who];

  const close = () => {
    markSeen(who);
    setClosed(true);
  };

  return (
    <Sheet open={!seen && !closed} onClose={close} title={guide.title}>
      <ul className="divide-rows">
        {guide.rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3.5 py-3">
            <ArtIcon name={row.art} className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="text-body font-extrabold">{row.name}</p>
              <p className="text-ink-soft mt-0.5 text-sm leading-relaxed">{row.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <Button size="block" className="mt-4" onClick={close}>
        닫기
      </Button>
    </Sheet>
  );
}
