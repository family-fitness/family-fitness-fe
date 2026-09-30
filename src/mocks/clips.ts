/**
 * 운동 클립 찾기 — `GET /clips` · `POST /clips/{clipId}/favorite`.
 *
 * BE 의 `GET /api/v1/exercises`(`/clips` 는 같은 곳을 가리키는 옛 이름)와 같은 요청과 응답 형식을 쓴다.
 * 목록은 유튜브 구간(clips.json, AI 클립 표)과 공단 영상 452편(kspo-clips.json, BE V165 에서 뽑음)이다.
 *
 * 나이대: 보는 사람(profileId, 없으면 로그인한 사람)의 나이대에 맞는 것만 준다. `ageGroup=ALL` 이면 모든 나이.
 * 페이지 나누기: `size`(기본 40, 많아야 100)개씩 주고, 더 있으면 `nextCursor` 를 준다. 그걸 `cursor` 로 되돌려 보내면 다음 페이지다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type { ClipList, ClipView } from "@/lib/api/types";

import { BASE, acting, catalog, db, fail, type CatalogClip } from "./db";
import kspoJson from "./kspo-clips.json";
import youtubeAges from "./youtube-ages.json";

type AgeCode = "TODDLER" | "YOUTH" | "ADOLESCENT" | "ADULT" | "SENIOR";
const AGE_CODES: readonly AgeCode[] = ["TODDLER", "YOUTH", "ADOLESCENT", "ADULT", "SENIOR"];

/** 프로필의 나이대(화면 이름)를 서버 코드로 */
const AGE_CODE: Record<string, AgeCode> = {
  유아기: "TODDLER",
  유소년: "YOUTH",
  청소년: "ADOLESCENT",
  성인: "ADULT",
  어르신: "SENIOR",
};

type FinderClip = CatalogClip & { ageGroups: AgeCode[] };

/**
 * 운동 찾기가 거르는 목록. 공단 영상은 V165 에서 뽑은 것을 쓴다. 오늘 미션에 쓰려고 `catalog` 맨 앞에
 * 손으로 적어 둔 공단 영상은 같은 id 가 있으면 V165 에서 뽑은 것으로 바꾼다. 유튜브 구간은 영상의 나이대를 따른다.
 */
const kspo = kspoJson as (CatalogClip & { ageGroups: string[] })[];
const kspoIds = new Set(kspo.map((c) => c.id));
const ages = youtubeAges as Record<string, string>;
const finderCatalog: FinderClip[] = [
  ...catalog
    .filter((c) => !kspoIds.has(c.id))
    .map((c) => ({
      ...c,
      ageGroups: (c.mediaUrl
        ? ["YOUTH", "ADOLESCENT", "ADULT"]
        : [ages[c.videoId] ?? "YOUTH"]) as AgeCode[],
    })),
  ...kspo.map((c) => ({ ...c, ageGroups: c.ageGroups as AgeCode[] })),
];

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
    mediaUrl: c.mediaUrl ?? null,
    thumbnailUrl: c.thumbnailUrl ?? null,
  };
}

/** 한 번에 보내는 수. 다 보내면 첫 화면이 느리다 */
const PAGE = 40;
const MAX_PAGE = 100;

/** 서버와 같다. 어르신은 성인 영상도 본다 */
function suits(c: FinderClip, viewer: AgeCode): boolean {
  return c.ageGroups.includes(viewer) || (viewer === "SENIOR" && c.ageGroups.includes("ADULT"));
}

/** 유튜브 구간과 공단 영상을 하나씩 번갈아 세운다(서버와 같다). 한 출처가 먼저 떨어지면 남은 출처를 잇는다 */
function alternate(list: FinderClip[]): FinderClip[] {
  const youtube = list.filter((c) => !c.mediaUrl);
  const kspoClips = list.filter((c) => c.mediaUrl);
  const out: FinderClip[] = [];
  for (let i = 0; i < Math.max(youtube.length, kspoClips.length); i++) {
    if (i < youtube.length) out.push(youtube[i]);
    if (i < kspoClips.length) out.push(kspoClips[i]);
  }
  return out;
}

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
    const cursor = p.get("cursor");
    if (cursor !== null && !/^\d{1,6}$/.test(cursor)) {
      return fail(400, "INVALID_INPUT", "cursor 값을 알아볼 수 없습니다");
    }
    const sizeRaw = p.get("size");
    if (sizeRaw !== null && !/^\d{1,4}$/.test(sizeRaw)) {
      return fail(400, "INVALID_INPUT", "size 는 숫자로 보내 주세요");
    }
    const ageRaw = p.get("ageGroup");
    if (ageRaw !== null && ageRaw !== "ALL" && !AGE_CODES.includes(ageRaw as AgeCode)) {
      return fail(400, "INVALID_INPUT", "모르는 나이대입니다");
    }

    // 보는 사람의 나이대. 모르면 서버처럼 아무것도 주지 않는다
    const viewerProfile = profileId
      ? db.profiles.profiles.find((x) => x.profileId === profileId)
      : acting();
    const viewer = viewerProfile?.ageGroup ? AGE_CODE[viewerProfile.ageGroup] : undefined;
    const allAges = ageRaw === "ALL";
    const only: AgeCode | undefined = allAges ? undefined : ((ageRaw as AgeCode | null) ?? viewer);
    if (!allAges && !only) {
      return HttpResponse.json<ClipList>({ clips: [], total: 0, nextCursor: null });
    }

    const matched = finderCatalog
      .filter((c) => {
        if (only && !suits(c, only)) return false;
        if (factor && c.factor !== factor) return false;
        if (phase && c.phase !== phase) return false;
        if (quiet && !c.quiet) return false;
        if (q && !c.title.includes(q)) return false;
        if (list === "FAVORITES" && !favorites.get(profileId ?? "")?.has(c.id)) return false;
        return true;
      })
      // 보는 사람 나이대의 것을 앞에. 같은 제목이 여러 나이대에 있으면 그 나이대 것이 남는다
      .map((c, i) => ({ c, i, mine: viewer ? suits(c, viewer) : false }))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || a.i - b.i)
      .map((x) => x.c);
    // 같은 이름의 동작이 여러 영상에 되풀이된다. 목록에는 한 번만
    const seen = new Set<string>();
    const hits = alternate(
      matched.filter((c) => {
        if (seen.has(c.title)) return false;
        seen.add(c.title);
        return true;
      }),
    );

    const from = cursor === null ? 0 : Number(cursor);
    const size = Math.min(MAX_PAGE, Math.max(1, sizeRaw === null ? PAGE : Number(sizeRaw)));
    const to = from + size;
    const body: ClipList = {
      clips: hits.slice(from, to).map((c) => viewOf(c, profileId)),
      total: hits.length,
      nextCursor: to < hits.length ? String(to) : null,
    };
    return HttpResponse.json(body);
  }),

  http.post<PathParams>(`${BASE}/clips/:clipId/favorite`, async ({ params, request }) => {
    const body = (await request.json()) as { profileId?: string; favorited?: boolean };
    const id = String(params.clipId);
    if (!body.profileId) return fail(400, "PROFILE_REQUIRED", "누구의 즐겨찾기인지 알려 주세요");
    if (!finderCatalog.some((c) => c.id === id))
      return fail(404, "CLIP_NOT_FOUND", "그런 클립이 없습니다");
    const set = favorites.get(body.profileId) ?? new Set<string>();
    if (body.favorited) set.add(id);
    else set.delete(id);
    favorites.set(body.profileId, set);
    return HttpResponse.json({ clipId: id, favorited: Boolean(body.favorited) });
  }),
];
