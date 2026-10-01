/**
 * 초대 코드 — 가족 초대 만들기, 아직 쓰지 않은 초대 목록, 초대 취소, 미리 보기, 코드로 참여하기, 자리 초대.
 *
 *   POST   /families/{familyId}/invites         보호자만. `{ role, guardianConsent? }` → 201 `{ code, role, expiresAt, familyId }`
 *   GET    /families/{familyId}/invites         보호자만. 아직 쓰지 않았고 기한이 남은 가족 초대
 *   DELETE /families/{familyId}/invites/{code}  보호자만. 204, 없으면 404 INVITE_NOT_FOUND
 *   GET    /invites/{code}                      미리 보기. kind 가 FAMILY 면 profileName 은 null
 *   POST   /profiles/claim                      FAMILY 초대는 이름, 생년월일, 성별(키, 몸무게는 골라서)을 함께 보낸다
 *   POST   /profiles/{profileId}/invite         자리 초대. 그대로다
 *
 * BE 와 맞춘 모양이다(9/30). 가족 초대는 자리 없이 코드부터 만든다. 받은 사람이 자기 정보를 넣고 들어온다.
 * 아이 초대는 아이 등록과 같은 보호자 동의를 만들 때 받는다(없으면 422 CONSENT_REQUIRED).
 */
import { HttpResponse, http, type PathParams } from "msw";

import { ageOf, today } from "@/lib/today";

import {
  BASE,
  acting,
  ageGroupOf,
  db,
  fail,
  mapMemberOf,
  saveExtra,
  saveFamily,
  saveInvites,
  setActingProfile,
  setStage,
  uuid,
  type InviteRow,
  type Profile,
} from "./db";

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

/** 없는 코드를 이만큼 넣으면 막는다 */
const MAX_MISSES = 10;

/**
 * 코드를 찾고 쓸 수 있는지 본다. 미리 보기와 코드 쓰기가 같은 차례로 본다:
 * 너무 많이 틀림 429, 없음 404, 이미 씀 409 ALREADY_CLAIMED, 기한 지남 410,
 * 로그인한 계정에 가족이 있으면 409 ALREADY_MEMBER(이 가족) 또는 409 ALREADY_IN_FAMILY(다른 가족).
 *
 * 미리 보기는 로그인 전에도 부른다(로그인 화면). 그때는 계정을 모르니 가족이 있는지 보지 않는다.
 * ▲ 요청: 로그인한 계정의 미리 보기도 ALREADY_MEMBER, ALREADY_IN_FAMILY 를 달라. 정보를 다 적은 뒤에야
 * 들어갈 수 없다는 걸 알면 안 된다
 */
function findInvite(
  raw: string,
  signedIn: boolean,
): { error: Response } | { invite: InviteRow; seat: Profile | undefined } {
  if (db.claimMisses >= MAX_MISSES) {
    return { error: fail(429, "TOO_MANY", "초대 코드를 너무 많이 틀렸습니다") };
  }
  const code = raw.trim().toUpperCase();
  const invite = db.invites.find((i) => i.code === code);
  if (!invite) {
    db.claimMisses += 1;
    return { error: fail(404, "CODE_NOT_FOUND", "코드를 찾을 수 없습니다") };
  }
  const seat =
    invite.kind === "PROFILE"
      ? db.profiles.profiles.find((p) => p.profileId === invite.profileId)
      : undefined;
  if (invite.claimedAt || seat?.hasAccount) {
    return { error: fail(409, "ALREADY_CLAIMED", "이미 쓴 코드입니다") };
  }
  if (Date.parse(invite.expiresAt) <= Date.now()) {
    return { error: fail(410, "CODE_EXPIRED", "기한이 지난 코드입니다") };
  }
  if (signedIn && db.stage === "home") {
    const me = acting();
    return {
      error:
        me?.familyId === invite.familyId
          ? fail(409, "ALREADY_MEMBER", "이미 이 가족의 구성원입니다")
          : fail(409, "ALREADY_IN_FAMILY", "이미 다른 가족에 속해 있습니다"),
    };
  }
  // 목은 가족을 하나만 든다. 그 가족이 없어졌으면(새 가족을 만들어 갈아 끼웠으면) 없는 코드다
  if (invite.familyId !== db.profiles.familyId || (invite.kind === "PROFILE" && !seat)) {
    return { error: fail(404, "CODE_NOT_FOUND", "코드를 찾을 수 없습니다") };
  }
  return { invite, seat };
}

/** 코드로 들어온 계정이 그 사람이 된다. 보호자는 참여 방식을 고르러, 아이는 홈으로 */
function joined(invite: InviteRow, profile: Profile) {
  invite.claimedAt = new Date().toISOString();
  saveInvites();
  saveFamily();
  setStage("home");
  setActingProfile(profile.profileId);
  db.claimMisses = 0;
  return HttpResponse.json({
    profileId: profile.profileId,
    familyId: invite.familyId,
    role: profile.role,
    nextStep: profile.role === "PARENT" ? "SUPPORT_MODE" : "HOME",
  });
}

/** 넣은 키, 몸무게가 쓸 수 있는 값인가. 비었으면 괜찮다. 범위는 측정 등록과 같다 */
const bodyOk = (value: unknown, min: number, max: number) =>
  value == null || (typeof value === "number" && value >= min && value <= max);

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

  /**
   * 자리 초대. 보호자가 먼저 등록한 구성원(폰 없던 아이)에게 계정을 붙이는 코드다.
   * 그 자리에 걸린 코드가 남아 있으면 같은 코드를 새 기한으로 준다. 도현 자리는 K7M2QT 다
   */
  http.post<PathParams>(`${BASE}/profiles/:profileId/invite`, ({ params }) => {
    const profile = db.profiles.profiles.find((p) => p.profileId === params.profileId);
    if (!profile) return fail(404, "PROFILE_NOT_FOUND", "가족에 없는 프로필입니다");
    if (profile.hasAccount) return fail(409, "ALREADY_CLAIMED", "이미 계정이 연결된 자리입니다");
    const now = Date.now();
    let row = db.invites.find(
      (i) => i.kind === "PROFILE" && i.profileId === profile.profileId && !i.claimedAt,
    );
    if (!row) {
      const me = acting();
      row = {
        code: newCode(),
        kind: "PROFILE",
        familyId: profile.familyId,
        role: profile.role,
        profileId: profile.profileId,
        issuedBy: me?.profileId ?? null,
        issuedByName: me?.name ?? null,
        createdAt: new Date(now).toISOString(),
        expiresAt: "",
        claimedAt: null,
        guardianConsent: null,
      };
      db.invites.push(row);
    }
    row.expiresAt = new Date(now + INVITE_DAYS * 864e5).toISOString();
    profile.inviteStatus = "ISSUED";
    saveInvites();
    saveFamily();
    return HttpResponse.json(
      {
        claimCode: row.code,
        expiresAt: row.expiresAt,
        // 목은 지금 연 주소로 — 3000 에 박아 두면 다른 포트로 띄운 개발 서버에서 링크가 남의 곳으로 간다
        shareUrl: `${location.origin}/claim?code=${row.code}`,
      },
      { status: 201 },
    );
  }),

  /**
   * 코드를 넣기 전에 어느 가족의 무슨 초대인지 본다. 가족 초대(FAMILY)는 자리가 없어 profileName 이 null 이다.
   * 로그인 화면에서도 부른다(토큰 없이). 그래서 문지기(authGate)가 이 길만 열어 둔다
   */
  http.get<PathParams>(`${BASE}/invites/:claimCode`, ({ params, request }) => {
    const found = findInvite(String(params.claimCode), !!request.headers.get("authorization"));
    if ("error" in found) return found.error;
    const { invite, seat } = found;
    return HttpResponse.json({
      kind: invite.kind,
      familyName: db.profiles.familyName,
      profileName: seat?.name ?? null,
      role: seat?.role ?? invite.role,
      ageGroup: seat?.ageGroup ?? null,
      invitedByName: invite.issuedByName,
      expiresAt: invite.expiresAt,
    });
  }),

  /**
   * 코드로 가족에 참여한다.
   *   PROFILE  코드만 보낸다. 그 자리가 내 것이 된다
   *   FAMILY   이름, 생년월일, 성별을 함께 보낸다(키, 몸무게는 골라서). 그 정보로 새 구성원이 된다.
   *            빠지면 400, 보호자 초대인데 만 14세 미만이면 422 UNDER_14_NOT_ALLOWED
   */
  http.post(`${BASE}/profiles/claim`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const found = findInvite(String(body.claimCode ?? ""), true);
    if ("error" in found) return found.error;
    const { invite, seat } = found;

    if (invite.kind === "PROFILE" && seat) {
      seat.hasAccount = true;
      seat.inviteStatus = "CLAIMED";
      const member = db.fitnessMap.members.find((m) => m.profileId === seat.profileId);
      if (member) member.hasAccount = true;
      return joined(invite, seat);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
    const age = birthDate > today() ? null : ageOf(birthDate);
    const sex = body.sex === "M" || body.sex === "F" ? body.sex : null;
    if (!name || name.length > 20 || age == null || !sex) {
      return fail(400, "BAD_REQUEST", "이름, 생년월일, 성별이 필요합니다");
    }
    if (!bodyOk(body.heightCm, 30, 230) || !bodyOk(body.weightKg, 5, 250)) {
      return fail(400, "BAD_REQUEST", "키는 30~230cm, 몸무게는 5~250kg 입니다");
    }
    if (invite.role === "PARENT" && age < 14) {
      return fail(422, "UNDER_14_NOT_ALLOWED", "만 14세 미만은 보호자가 될 수 없습니다");
    }

    const consentRequired = age < 14;
    // 아이 초대는 만들 때 받은 보호자 동의를 그대로 쓴다
    const consentGiven =
      !consentRequired ||
      Boolean(invite.guardianConsent?.personalData && invite.guardianConsent?.healthData);
    const profile: Profile = {
      profileId: uuid(),
      familyId: invite.familyId,
      name,
      role: invite.role,
      ageGroup: ageGroupOf(age),
      sex,
      birthDate,
      hasAccount: true,
      inviteStatus: "CLAIMED",
      // 참여 방식은 다음 화면에서 고른다
      supportMode: null,
      measurable: age >= 4 && consentGiven,
      consentRequired,
      consentGiven,
      isOwner: false,
    };
    db.profiles.profiles.push(profile);
    db.fitnessMap.members.push(mapMemberOf(profile));
    if (typeof body.heightCm === "number" && typeof body.weightKg === "number") {
      db.body[profile.profileId] = { heightCm: body.heightCm, weightKg: body.weightKg };
      saveExtra("body");
    }
    return joined(invite, profile);
  }),
];
