/**
 * 레벨마다 열리는 것 — 섬 꾸미기와 놀이가 번갈아 하나씩.
 *
 * 레벨은 서버가 센다. 여기서는 **몇 레벨에 무엇이 열리는지**만 정한다.
 * 레벨은 한 만큼 오르고 내려가지 않으니(규칙 10), 한 번 열린 것은 닫히지 않는다.
 *
 * 열리는 건 전부 **덤**이다. 오늘 운동 · 캘린더 · 칭찬처럼 서비스의 본 기능은 레벨로 막지 않는다.
 * 놀이는 몸으로 하는 놀이다 — 운동을 화면 시간으로 바꿔 주는 게 아니다(조사 「가져오지 않을 것」).
 */

export type DecorationId = "flag" | "fence" | "pond" | "tent" | "windmill" | "lighthouse";
export type GameId = "freeze" | "follow";

export type Unlock =
  | { kind: "decoration"; id: DecorationId; level: number; name: string; line: string }
  | { kind: "game"; id: GameId; level: number; name: string; line: string };

/** 레벨 차례. 한 레벨에 하나 — 처음(Lv.1)부터 놀이 하나는 열려 있다 */
export const UNLOCKS: readonly Unlock[] = [
  {
    kind: "game",
    id: "freeze",
    level: 1,
    name: "얼음땡",
    line: "박자에 맞춰 움직이다 얼음이면 멈춰요",
  },
  { kind: "decoration", id: "flag", level: 2, name: "깃발", line: "내 섬에 깃발이 꽂혀요" },
  {
    kind: "game",
    id: "follow",
    level: 3,
    name: "따라 해 봐",
    line: "동작 순서를 기억해 따라 해요",
  },
  { kind: "decoration", id: "fence", level: 4, name: "울타리", line: "섬 가장자리에 울타리" },
  { kind: "decoration", id: "pond", level: 5, name: "연못", line: "섬에 작은 연못이 생겨요" },
  { kind: "decoration", id: "tent", level: 6, name: "텐트", line: "섬에서 캠핑을 해요" },
  { kind: "decoration", id: "windmill", level: 7, name: "풍차", line: "바람 따라 도는 풍차" },
  { kind: "decoration", id: "lighthouse", level: 8, name: "등대", line: "섬을 비추는 등대" },
];

/** 이 레벨까지 열린 것 */
export function unlockedAt(level: number | null | undefined): Unlock[] {
  const lv = Math.max(1, level ?? 1);
  return UNLOCKS.filter((u) => u.level <= lv);
}

/** 다음에 열릴 것. 다 열렸으면 null */
export function nextUnlock(level: number | null | undefined): Unlock | null {
  const lv = Math.max(1, level ?? 1);
  return UNLOCKS.find((u) => u.level > lv) ?? null;
}

/** 섬에 세울 장식 */
export function decorationsAt(level: number | null | undefined): DecorationId[] {
  return unlockedAt(level).flatMap((u) => (u.kind === "decoration" ? [u.id] : []));
}

/** 방금 레벨이 오르며 새로 열린 것. 오르지 않았으면 빈 목록 */
export function newlyUnlocked(before: number | null, after: number | null | undefined): Unlock[] {
  if (before == null || after == null || after <= before) return [];
  return UNLOCKS.filter((u) => u.level > before && u.level <= after);
}

export function isGameOpen(id: GameId, level: number | null | undefined): boolean {
  const game = UNLOCKS.find((u) => u.kind === "game" && u.id === id);
  return game != null && game.level <= Math.max(1, level ?? 1);
}

export function gameOf(id: GameId): Extract<Unlock, { kind: "game" }> {
  const game = UNLOCKS.find(
    (u): u is Extract<Unlock, { kind: "game" }> => u.kind === "game" && u.id === id,
  );
  if (!game) throw new Error(`없는 놀이: ${id}`);
  return game;
}
