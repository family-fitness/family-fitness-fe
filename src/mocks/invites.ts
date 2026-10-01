/**
 * 초대 코드 — 가족 초대 만들기, 아직 쓰지 않은 초대 목록, 초대 취소.
 *
 *   POST   /families/{familyId}/invites         보호자만. `{ role, guardianConsent? }` → 201 `{ code, role, expiresAt, familyId }`
 *   GET    /families/{familyId}/invites         보호자만. 아직 쓰지 않았고 기한이 남은 가족 초대
 *   DELETE /families/{familyId}/invites/{code}  보호자만. 204, 없으면 404 INVITE_NOT_FOUND
 *
 * BE 와 맞춘 모양이다(9/30). 가족 초대는 자리 없이 코드부터 만든다. 받은 사람이 자기 정보를 넣고 들어온다.
 * 아이 초대는 아이 등록과 같은 보호자 동의를 만들 때 받는다(없으면 422 CONSENT_REQUIRED).
 */
import { HttpResponse, http, type PathParams } from "msw";

import { BASE, acting, db, fail, saveInvites, type InviteRow } from "./db";

/** 초대 코드는 일주일 쓴다 */
const INVITE_DAYS = 7;

/** 헷갈리는 글자(I · O · 0 · 1)를 뺀 글자로 여섯 자리 */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  for (;;) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join("");
    if (!db.invites.some((i) => i.code === code)) return code;
  }
}

/** 아직 쓸 수 있는 가족 초대인가 — 쓰지 않았고 기한이 남았다 */
const pending = (invite: InviteRow, now = Date.now()) =>
  invite.kind === "FAMILY" && !invite.claimedAt && Date.parse(invite.expiresAt) > now;

/**
 * 이 가족의 초대를 다뤄도 되는 보호자인가. 판정 차례는 BE 와 같다:
 * 가족 없음 404 FAMILY_NOT_FOUND, 다른 가족 403 NOT_SAME_FAMILY, 아이 계정 403 NOT_A_PARENT
 */
function guard(familyId: string) {
  const me = db.stage === "home" ? acting() : undefined;
  if (!me) return fail(404, "FAMILY_NOT_FOUND", "가족을 찾을 수 없습니다");
  if (familyId !== me.familyId) return fail(403, "NOT_SAME_FAMILY", "다른 가족입니다");
  if (me.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자만 할 수 있습니다");
  return null;
}

export const invites = [
  http.post<PathParams>(`${BASE}/families/:familyId/invites`, async ({ params, request }) => {
    const denied = guard(String(params.familyId));
    if (denied) return denied;
    const body = (await request.json().catch(() => ({}))) as {
      role?: unknown;
      guardianConsent?: { personalData?: boolean; healthData?: boolean } | null;
    };
    if (body.role !== "PARENT" && body.role !== "CHILD") {
      return fail(400, "BAD_REQUEST", "role 은 PARENT 나 CHILD 입니다");
    }
    // 아이 초대는 아이 등록과 같다 — 개인정보와 건강정보 둘 다 동의해야 만든다
    const consent = body.guardianConsent;
    if (body.role === "CHILD" && !(consent?.personalData && consent?.healthData)) {
      return fail(422, "CONSENT_REQUIRED", "보호자 동의가 필요합니다");
    }

    const me = acting();
    const now = Date.now();
    const invite: InviteRow = {
      code: newCode(),
      kind: "FAMILY",
      familyId: String(params.familyId),
      role: body.role,
      profileId: null,
      issuedBy: me?.profileId ?? null,
      issuedByName: me?.name ?? null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + INVITE_DAYS * 864e5).toISOString(),
      claimedAt: null,
      guardianConsent: body.role === "CHILD" ? { personalData: true, healthData: true } : null,
    };
    db.invites.push(invite);
    saveInvites();
    return HttpResponse.json(
      {
        code: invite.code,
        role: invite.role,
        expiresAt: invite.expiresAt,
        familyId: invite.familyId,
      },
      { status: 201 },
    );
  }),

  http.get<PathParams>(`${BASE}/families/:familyId/invites`, ({ params }) => {
    const familyId = String(params.familyId);
    const denied = guard(familyId);
    if (denied) return denied;
    const now = Date.now();
    const list = db.invites
      .filter((i) => i.familyId === familyId && pending(i, now))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((i) => ({
        code: i.code,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        issuedByName: i.issuedByName,
      }));
    return HttpResponse.json({ invites: list });
  }),

  http.delete<PathParams>(`${BASE}/families/:familyId/invites/:code`, ({ params }) => {
    const familyId = String(params.familyId);
    const denied = guard(familyId);
    if (denied) return denied;
    const code = String(params.code).toUpperCase();
    const at = db.invites.findIndex((i) => i.code === code && i.familyId === familyId);
    if (at < 0 || !pending(db.invites[at])) {
      return fail(404, "INVITE_NOT_FOUND", "초대를 찾을 수 없습니다");
    }
    db.invites.splice(at, 1);
    saveInvites();
    return new HttpResponse(null, { status: 204 });
  }),
];
