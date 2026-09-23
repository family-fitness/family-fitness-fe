/**
 * 운동 클립 찾기 — `GET /clips` · `POST /clips/{clipId}/favorite`.
 *
 * ▲ 서버에 아직 없다. AI 쪽 클립 표(491개)를 그대로 거른다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type { ClipList, ClipView } from "@/lib/api/types";

import { BASE, catalog, fail, type CatalogClip } from "./db";

/** 사람마다 즐겨찾기한 클립. 탭이 살아 있는 동안만 */
const favorites = new Map<string, Set<string>>();

function viewOf(c: CatalogClip, profileId: string | null): ClipView {
  return {
    clipId: c.id,
    videoId: c.videoId,
    startSec: c.startSec,
    endSec: c.endSec,
    title: c.title,
    factor: (c.factor as ClipView["factor"]) ?? null,
    phase: c.phase,
    homeOk: c.homeOk,
    quiet: c.quiet,
    props: c.props,
    favorited: profileId ? Boolean(favorites.get(profileId)?.has(c.id)) : false,
  };
}

/** 한 번에 보내는 수. 491개를 다 보내면 첫 화면이 느리다 */
const PAGE = 40;

export const clips = [
  http.get(`${BASE}/clips`, ({ request }) => {
    const p = new URL(request.url).searchParams;
    const factor = p.get("factor");
    const phase = p.get("phase");
    const quiet = p.get("quiet") === "true";
    const q = (p.get("q") ?? "").trim();
    const list = p.get("list") ?? "ALL";
    const profileId = p.get("profileId");
    if (list === "FAVORITES" && !profileId) {
      return fail(400, "PROFILE_REQUIRED", "누구의 즐겨찾기인지 알려 주세요");
    }

    const seen = new Set<string>();
    const hits = catalog.filter((c) => {
      if (factor && c.factor !== factor) return false;
      if (phase && c.phase !== phase) return false;
      if (quiet && !c.quiet) return false;
      if (q && !c.title.includes(q)) return false;
      if (list === "FAVORITES" && !favorites.get(profileId ?? "")?.has(c.id)) return false;
      // 같은 이름의 동작이 여러 영상에 되풀이된다. 목록에는 한 번만
      if (seen.has(c.title)) return false;
      seen.add(c.title);
      return true;
    });
    const body: ClipList = {
      clips: hits.slice(0, PAGE).map((c) => viewOf(c, profileId)),
      total: hits.length,
    };
    return HttpResponse.json(body);
  }),

  http.post<PathParams>(`${BASE}/clips/:clipId/favorite`, async ({ params, request }) => {
    const body = (await request.json()) as { profileId?: string; favorited?: boolean };
    const id = String(params.clipId);
    if (!body.profileId) return fail(400, "PROFILE_REQUIRED", "누구의 즐겨찾기인지 알려 주세요");
    if (!catalog.some((c) => c.id === id))
      return fail(404, "CLIP_NOT_FOUND", "그런 클립이 없습니다");
    const set = favorites.get(body.profileId) ?? new Set<string>();
    if (body.favorited) set.add(id);
    else set.delete(id);
    favorites.set(body.profileId, set);
    return HttpResponse.json({ clipId: id, favorited: Boolean(body.favorited) });
  }),
];
