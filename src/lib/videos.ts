/**
 * 운동 찾기(`/videos`) 주소와 「누구의 목록인가」.
 *
 * 서버는 클립 목록을 보는 사람의 연령대로 거른다(profileId 가 없으면 로그인한 사람). 부모 홈의 영상 줄은
 * 보고 있는 아이의 목록을 보여 주므로, 누르고 들어간 운동 찾기도 같은 아이의 목록이라야 누른 클립이 들어 있다.
 * 홈은 아이를 고른 적이 없으면 첫째를 보여 주는데 운동 찾기는 그걸 모른다 — 그래서 아이를 주소에 실어 보낸다.
 */

/** 홈 영상 줄에서 운동 찾기로 가는 주소. 줄과 같은 목록(본운동 · 이 힘 · 이 아이)으로 연다 */
export function finderHref({
  factor,
  profileId,
  clipId,
}: {
  factor: string | null;
  profileId: string | undefined;
  clipId?: string;
}): string {
  const q = new URLSearchParams({ phase: "MAIN" });
  if (factor) q.set("factor", factor);
  if (profileId) q.set("profileId", profileId);
  if (clipId) q.set("clip", clipId);
  return `/videos?${q.toString()}`;
}

/**
 * 운동 찾기에서 목록 · 즐겨찾기의 주인.
 * 아이 화면은 이 기기의 아이만 — 주소로 다른 아이 목록이 열리지 않게. 부모 화면은 주소의 아이 → 고른 아이 → 나.
 */
export function finderOwner({
  kidView,
  fromUrl,
  childProfileId,
  self,
}: {
  kidView: boolean;
  fromUrl: string | null;
  childProfileId: string | null;
  self: string | undefined;
}): string | undefined {
  if (kidView) return childProfileId ?? undefined;
  return fromUrl || childProfileId || self;
}
