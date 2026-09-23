/**
 * 새 그림이 오기 전까지 **있는 그림**으로 대신 선다.
 *
 * 주문한 그림(`icon/*` · `sticker/*` · `badge/*`)이 들어오면 그걸 쓰고, 아직이면 여기 적은
 * 옛 그림을, 그것도 없으면 선 아이콘을 쓴다. 옛 그림은 1 · 2차에 받은 것으로 결이
 * 비슷하다(납작한 면 · 남색 외곽선 · 파랑 노랑).
 *
 * 새 그림이 다 오면 이 표는 비워도 된다. 그때까지는 화면에 이모트 대신 그림이 선다.
 */
export const INTERIM: Readonly<Record<string, string>> = {
  // 체력 요인 — 그 요인을 재는 도구
  "icon/factor-cardio": "item/item-shoes",
  "icon/factor-strength": "item/item-grip",
  "icon/factor-endurance": "item/item-mat",
  "icon/factor-flexibility": "item/item-tape",
  "icon/factor-agility": "item/item-cone",
  "icon/factor-power": "item/item-stopwatch",

  // 메뉴 줄
  "icon/menu-consent": "item/item-clipboard",
  "icon/menu-cheer": "item/item-whistle",
  "icon/menu-measure": "item/item-ruler-tall",
  "icon/menu-equipment": "item/item-grip",
  "icon/menu-invite": "scene/scene-invite",
  "icon/menu-schedule": "item/item-calendar",
  "icon/menu-calendar": "item/item-streak",
  "icon/menu-ai": "deco/deco-sparkle",
  "icon/menu-trophy": "item/item-trophy",

  // 참여 방식
  "icon/mode-cheer": "item/item-whistle",
  "icon/mode-weekend": "item/item-calendar",
  "icon/mode-full": "item/item-shoes",

  // 칭찬 스티커 — 옛 도장
  "sticker/sticker-star": "stamp/stamp-star",
  "sticker/sticker-thumb": "stamp/stamp-great",
  "sticker/sticker-medal": "stamp/stamp-medal",
  "sticker/sticker-heart": "stamp/stamp-heart",
  "sticker/sticker-crown": "stamp/stamp-crown",
  "sticker/sticker-clap": "stamp/stamp-clap",
  "sticker/sticker-sprout": "stamp/stamp-flower",
  "sticker/sticker-sun": "stamp/stamp-smile",

  // 업적 배지
  "badge/badge-first-step": "item/item-shoes",
  "badge/badge-streak-3": "item/item-streak",
  "badge/badge-streak-7": "item/item-streak",
  "badge/badge-full-set": "item/item-check-big",
  "badge/badge-min-30": "item/item-stopwatch",
  "badge/badge-min-100": "item/item-stopwatch",
  "badge/badge-min-300": "item/item-medal",
  "badge/badge-weekend": "item/item-calendar",
  "badge/badge-together": "scene/scene-together",
  "badge/badge-remeasure": "item/item-ruler-tall",
  "badge/badge-first-sticker": "stamp/stamp-star",
  "badge/badge-six-powers": "item/item-trophy",

  // 빈 화면
  "scene/kiumi-no-record": "scene/scene-first-body",
  "scene/kiumi-no-mission": "scene/scene-no-mission",
  "scene/kiumi-waiting": "scene/scene-waiting-stamp",
  "scene/kiumi-done": "scene/scene-done",
  "scene/kiumi-rest": "scene/scene-rest-day",
};
