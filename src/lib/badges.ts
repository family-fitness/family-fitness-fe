import type { CheerLog, FitnessMapMember, Mission, Video } from "./api/types";
import { isVideoDone, serverKnows } from "./mission";
import { today } from "./today";

/**
 * 기념 표시.
 *
 * **목표가 아니라 기록이다.** 몇 개를 모으면 무엇이 열린다는 식으로 만들지 않는다 —
 * 못 채운 날이 실패가 되기 때문이다(도메인 규칙 12). 그래서 **받은 것만** 화면에
 * 나오고, 아직 못 받은 칸은 회색으로도 자물쇠로도 그리지 않는다.
 *
 * 전부 지금 있는 데이터에서 계산한다. 서버에 저장하지 않으므로 기록이 바뀌면
 * 표시도 따라 바뀐다 — 한 번 받으면 영영 남는 트로피가 아니라 **지금의 기록**이다.
 */
export interface Badge {
  id: string;
  label: string;
  art: string;
  /** 새 그림이 오기 전까지 쓸 그림 */
  fallback: string;
}

export function earnedBadges(input: {
  /** 이 아이가 본 영상 */
  watched?: Video[];
  /** 가족 미션 */
  missions?: Mission[];
  /** 주고받은 칭찬 · 알림 */
  cheers?: CheerLog[];
  /** 가족 지도에서 이 아이 */
  me?: FitnessMapMember;
  profileId?: string;
}): Badge[] {
  const { watched = [], missions = [], cheers = [], me, profileId } = input;
  const badges: Badge[] = [];

  const finished = watched.filter((v) => isVideoDone(v.maxProgress));
  const myParts = missions.flatMap((m) =>
    (m.participants ?? []).filter((p) => p.profileId === profileId).map((p) => ({ m, p })),
  );
  const told = cheers.filter((c) => c.fromProfileId === profileId);
  const praised = cheers.filter((c) => c.toProfileId === profileId && c.message);

  if (finished.length > 0) {
    badges.push({
      id: "first-video",
      label: "첫 완주",
      art: "badge/badge-video",
      fallback: "stamp/stamp-star",
    });
  }
  if (finished.length >= 5) {
    badges.push({
      id: "five-video",
      label: "다섯 편",
      art: "badge/badge-collection",
      fallback: "stamp/stamp-crown",
    });
  }
  if (myParts.some(({ p }) => serverKnows(p.verifiedBy))) {
    badges.push({
      id: "verified",
      label: "확인된 기록",
      art: "badge/badge-timer",
      fallback: "stamp/stamp-medal",
    });
  }
  if (myParts.some(({ m }) => (m.participants?.length ?? 0) > 1 && m.participants)) {
    badges.push({
      id: "together",
      label: "같이 하기",
      art: "badge/badge-together",
      fallback: "stamp/stamp-clap",
    });
  }
  if (me?.latest?.fitnessTestId) {
    badges.push({
      id: "measured",
      label: "첫 측정",
      art: "badge/badge-measure",
      fallback: "stamp/stamp-great",
    });
  }
  if (praised.length > 0) {
    badges.push({
      id: "praised",
      label: "첫 칭찬",
      art: "badge/badge-praise",
      fallback: "stamp/stamp-heart",
    });
  }

  /* 이번 주에 움직인 날. 연속이 아니라 **합계**다 — 끊겼다고 0 이 되지 않는다 */
  const movedDays = new Set(told.map((c) => c.createdAt.slice(0, 10)));
  if (movedDays.size >= 3) {
    badges.push({
      id: "three-days",
      label: "세 날",
      art: "badge/badge-week",
      fallback: "stamp/stamp-flower",
    });
  }
  if (told.some((c) => c.createdAt.slice(0, 10) === today())) {
    badges.push({
      id: "today",
      label: "오늘도",
      art: "badge/badge-first",
      fallback: "stamp/stamp-smile",
    });
  }

  return badges;
}
