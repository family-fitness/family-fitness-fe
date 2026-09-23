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

/**
 * 아이가 운동을 바꾸고 싶어 하는 이유.
 *
 * **목록을 보여 주지 않는다.** 지금 「다른 운동 고르기」는 연령대에 맞는 영상을
 * 쭉 나열할 뿐이라, 왜 이게 떴는지 아이도 부모도 모른다. 이유를 받으면 그 이유에
 * 맞는 것만 골라 올 수 있고, 고른 이유가 다음 편성에도 남는다.
 */
export type SwapReason = "hard" | "noise" | "time" | "bored";

export const SWAP_REASONS: { key: SwapReason; label: string }[] = [
  { key: "hard", label: "너무 힘들어요" },
  { key: "noise", label: "쿵쿵거려서 안 돼요" },
  { key: "time", label: "시간이 없어요" },
  { key: "bored", label: "재미없어요" },
];

/** 이유마다 무엇을 근거로 골랐는지 한 줄. 아이도 부모도 읽는다 */
export const SWAP_WHY: Record<SwapReason, string> = {
  hard: "같은 곳을 키우면서 힘은 한 단계 낮은 것으로 골랐어요",
  noise: "앉거나 누워서 하는 것만 골랐어요. 발소리가 안 나요",
  time: "같은 곳을 키우는 것 중에 제일 짧은 걸로 골랐어요",
  bored: "같은 곳을 키우는데 아직 안 해 본 것으로 골랐어요",
};

const INTENSITY_RANK: Record<string, number> = { LOW: 0, MID: 1, HIGH: 2 };

/**
 * 바꿀 운동을 고른다.
 *
 * **방향은 그대로 둔다.** 키우려던 요인을 바꾸면 그건 다른 운동이 아니라
 * 다른 계획이다 — 코치가 짠 한 주가 무너진다.
 */
export function pickAlternatives(
  videos: Video[],
  options: {
    reason: SwapReason;
    /** 지금 하려던 것. 같은 요인 안에서 고르고, 이건 뺀다 */
    factor?: string | null;
    currentVideoId?: string | null;
    currentSeconds?: number | null;
    /** 이미 완주한 영상 */
    watched?: Video[];
  },
): Video[] {
  const { reason, factor, currentVideoId, currentSeconds, watched = [] } = options;
  const doneIds = new Set(watched.filter((v) => isVideoDone(v.maxProgress)).map((v) => v.videoId));

  const sameFactor = videos.filter((v) => {
    if (v.videoId === currentVideoId) return false;
    if (!factor) return true;
    return labelFactors(v.label).includes(factor);
  });
  /* 같은 요인이 없으면 요인을 풀되, 그 사실을 화면이 말한다 */
  const pool =
    sameFactor.length > 0 ? sameFactor : videos.filter((v) => v.videoId !== currentVideoId);

  const score = (video: Video) => {
    const label = video.label;
    let points = 0;
    if (reason === "hard") {
      points += 6 - (INTENSITY_RANK[label?.intensity ?? "MID"] ?? 1) * 3;
    }
    if (reason === "noise") {
      if (label?.noise === "QUIET") points += 8;
      if (label?.space === "SMALL_ROOM") points += 3;
    }
    if (reason === "time") {
      const sec = video.durationSec ?? 0;
      if (sec > 0 && (currentSeconds == null || sec <= currentSeconds)) points += 6;
      points += Math.max(0, 6 - Math.floor(sec / 120));
    }
    if (reason === "bored") {
      if (!doneIds.has(video.videoId)) points += 8;
    }
    // 어느 이유든 집에서 되는 것이 먼저다
    if (label?.noise === "QUIET") points += 1;
    if (label?.space === "SMALL_ROOM") points += 1;
    return points;
  };

  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 2);
}
