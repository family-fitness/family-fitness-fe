/**
 * 도장.
 *
 * 부모가 아이에게 찍어 주는 것이다. **아이는 자기 도장을 찍을 수 없다** —
 * 그래야 도장에 값이 생긴다(AGENTS.md 규칙 12).
 *
 * 서버의 cheer 에는 `emoji` 칸밖에 없어서 거기에 도장 **키**를 싣는다.
 * 화면에는 이모지 문자가 아니라 우리 그림을 그린다.
 * ▲ 백엔드에 `stamp` 칸을 따로 두자고 요청해 뒀다.
 */
export interface Stamp {
  key: string;
  label: string;
  /** 기본 칭찬글. 부모가 아무 말도 안 적었을 때 쓴다 */
  message: string;
}

export const STAMPS: Stamp[] = [
  { key: "stamp-great", label: "잘했어", message: "오늘 정말 잘했어!" },
  { key: "stamp-star", label: "최고야", message: "오늘의 별은 너야" },
  { key: "stamp-muscle", label: "힘세졌네", message: "힘이 부쩍 늘었는데?" },
  { key: "stamp-fire", label: "불타올라", message: "열심히 하는 게 보여" },
  { key: "stamp-heart", label: "고마워", message: "같이 해 줘서 고마워" },
  { key: "stamp-clap", label: "박수", message: "박수 보낼게" },
  { key: "stamp-medal", label: "메달", message: "오늘은 메달감이야" },
  { key: "stamp-crown", label: "왕관", message: "오늘의 주인공" },
  { key: "stamp-rocket", label: "쑥쑥", message: "쑥쑥 자라고 있어" },
  { key: "stamp-smile", label: "웃음", message: "네 웃는 얼굴이 좋아" },
  { key: "stamp-flower", label: "꽃", message: "예쁘게 잘 해냈어" },
];

export function stampOf(key: string | null | undefined): Stamp | undefined {
  return STAMPS.find((s) => s.key === key);
}

/** 도장 그림 경로. 2차 에셋이 오기 전에는 1차 메달로 대신한다 */
export function stampArt(key: string | null | undefined): string {
  return `stamp/${key ?? "stamp-empty"}`;
}
