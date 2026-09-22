import type { Video, VideoLabel } from "./api/types";
import { factorPose } from "./fitness-items";
import { isVideoDone } from "./mission";

/**
 * 영상 라벨을 읽는 곳.
 *
 * 백엔드 `exercise_videos` 가 가진 값(`factors` · `intensity` · `space` · `noise` ·
 * `age_from/to`)을 화면이 실제로 쓰게 한다. 전에는 서버가 만들어 준 `badges` 만
 * 그대로 뿌리고 있어서, 왜 이 영상이 권해졌는지 화면이 설명하지 못했다.
 *
 * 코드값을 화면에 그대로 내보내지 않는다 — `SMALL_ROOM` 은 사람 말이 아니다.
 */

/** 코드값 → 사람 말. 서버에 없는 값이 오면 조용히 뺀다 */
const INTENSITY: Record<string, string> = {
  LOW: "가볍게",
  MID: "보통",
  HIGH: "세게",
};

const SPACE: Record<string, string> = {
  SMALL_ROOM: "좁은 공간 OK",
  ROOM: "방 하나",
  OPEN: "넓은 곳 필요",
};

const NOISE: Record<string, string> = {
  QUIET: "조용함",
  NORMAL: "보통",
  LOUD: "시끄러움",
};

/** 화면에 붙일 배지. 서버가 준 badges 가 있으면 그걸 먼저 쓴다 */
export function labelBadges(video: Pick<Video, "label" | "badges">): string[] {
  if (video.badges && video.badges.length > 0) return video.badges;

  const label = video.label;
  if (!label) return [];
  return [NOISE[label.noise ?? ""], SPACE[label.space ?? ""], INTENSITY[label.intensity ?? ""]]
    .filter(Boolean)
    .slice(0, 3);
}

/** 이 영상이 키우는 체력 요인 */
export function labelFactors(label: VideoLabel | null | undefined): string[] {
  return label?.factors ?? [];
}

/** 만 몇 살부터 몇 살까지. 라벨이 없으면 빈 문자열 */
export function labelAges(label: VideoLabel | null | undefined): string {
  const from = label?.ageFrom;
  const to = label?.ageTo;
  if (from == null && to == null) return "";
  return `만 ${from ?? "?"}~${to ?? "?"}세`;
}

/**
 * 오늘 할 운동 하나를 고른다.
 *
 * 승인된 미션이 있으면 화면이 그쪽을 먼저 쓰고, 없을 때 여기로 온다.
 * 순서는 **집에서 하는 서비스**라는 전제에서 나온다 — 층간소음과 좁은 거실이
 * 실제로 운동을 막는 이유이므로, 맞는 운동보다 **할 수 있는 운동**이 먼저다.
 */
export function pickTodayVideo(
  videos: Video[],
  options: {
    /** 지금 가장 약한 요인. 서버가 `weakest.factor` 로 준다 */
    weakestFactor?: string | null;
    /** 이미 완주한 영상은 뒤로 보낸다 */
    watched?: Video[];
  } = {},
): Video | undefined {
  if (videos.length === 0) return undefined;

  const doneIds = new Set(
    (options.watched ?? []).filter((v) => isVideoDone(v.maxProgress)).map((v) => v.videoId),
  );

  const score = (video: Video) => {
    const label = video.label;
    let points = 0;

    // 1. 약한 요인을 키우는 영상
    if (options.weakestFactor && labelFactors(label).includes(options.weakestFactor)) points += 8;

    // 2. 집에서 할 수 있는가 — 이게 안 되면 아무리 맞아도 안 하게 된다
    if (label?.noise === "QUIET") points += 4;
    if (label?.space === "SMALL_ROOM") points += 4;

    // 3. 처음 하는 아이에게 센 운동을 권하지 않는다
    if (label?.intensity === "LOW") points += 2;

    // 4. 이미 끝까지 본 영상은 뒤로
    if (doneIds.has(video.videoId)) points -= 10;

    return points;
  };

  return [...videos].sort((a, b) => score(b) - score(a))[0];
}

/**
 * 왜 이 영상을 권하는지 한 줄.
 * 고른 이유를 말하지 않으면 그냥 아무거나 띄운 것처럼 보인다.
 */
export function whyThisVideo(
  video: Pick<Video, "label">,
  weakestFactor?: string | null,
): string | null {
  if (weakestFactor && labelFactors(video.label).includes(weakestFactor)) {
    return `${weakestFactor} 키우기`;
  }
  const first = labelFactors(video.label)[0];
  return first ? `${first} 운동` : null;
}

/**
 * 썸네일이 없을 때 대신 세울 그림.
 *
 * 유튜브는 **없는 영상에도 회색 자리 그림을 200 으로 돌려준다.** 그래서
 * `onError` 가 뜨지 않고, 화면에는 깨진 것처럼 보이는 회색 네모만 남는다.
 *
 * 측정 항목과 같은 표를 쓴다 — 같은 요인이면 어느 화면에서나 같은 그림이어야
 * 부모가 "이건 유연성 쪽" 을 한 번만 배운다.
 */
export function videoArt(video: Pick<Video, "label">): string {
  return factorPose(labelFactors(video.label)[0]);
}
