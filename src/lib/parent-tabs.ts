/**
 * 부모 화면의 하단 탭 다섯 칸. 설정은 탭에 두지 않고 지금처럼 화면 오른쪽 위에 둔다.
 *
 *   홈    부모 홈
 *   운동  오늘 가족 운동(내 몫이 있으면 시작하기), 운동 짜기, 운동 찾기
 *   기록  캘린더, 나와 아이들의 체력(측정하기, 결과 보기)
 *   리그  가족 리그
 *   가족  가족 대시보드. 가족 관리는 여기서 들어간다
 *
 * 아이 화면에는 탭이 없다. 부모 화면이라도 탭의 첫 화면에만 탭을 둔다. 운동하기, 칭찬 스티커처럼
 * 한 가지 일을 하는 화면은 아래를 그 일에 쓴다(아래에 붙는 단추 `Dock` 와 겹치지 않게).
 */
export const PARENT_TABS = [
  { id: "home", label: "홈", href: "/parent" },
  { id: "workout", label: "운동", href: "/parent/workout" },
  { id: "records", label: "기록", href: "/parent/records" },
  { id: "league", label: "리그", href: "/parent/league" },
  { id: "family", label: "가족", href: "/parent/dashboard" },
] as const;

export type ParentTab = (typeof PARENT_TABS)[number]["id"];

/** 이 주소에서 켜지는 탭. 탭의 첫 화면이 아니면 null(탭을 두지 않는다) */
export function parentTabOf(pathname: string): ParentTab | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PARENT_TABS.find((t) => t.href === path)?.id ?? null;
}
