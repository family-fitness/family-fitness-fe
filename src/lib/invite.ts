import type { ClaimBody, GuardianConsent, InvitePeek, PendingInvite, Role } from "./api/types";
import { bodyError, bodyValue } from "./body";
import { type DateRule, childBirthRule, guardianBirthRule, inRule } from "./date-pick";
import { GUARDIAN_MIN_AGE, guardianOldEnough } from "./onboarding";
import { today } from "./today";
import { formatDate, withJosa } from "./utils";

/**
 * 초대 코드.
 *
 * 보호자와 아이 모두 초대를 먼저 한다(10번). 보호자가 역할(보호자, 아이)만 정해 가족 초대 코드를 만들고,
 * 받은 사람이 자기 이름, 생년월일, 성별을 넣고 들어온다. 폰 없는 아이는 지금처럼 「아이 등록하기」 로
 * 보호자가 정보를 넣고, 그 아이에게 나중에 폰이 생기면 그 자리에 계정을 붙이는 자리 초대를 쓴다.
 */

/** 초대할 때 역할을 부르는 말 */
export const INVITE_ROLE_NAME: Record<Role, string> = { PARENT: "보호자", CHILD: "아이" };

/**
 * 가족 초대를 만드는 본문. 아이로 부르면 아이 등록과 같은 보호자 동의(개인정보, 건강정보)를 둘 다 받아야 한다.
 * 하나라도 빠지면 null — 단추를 잠근다(서버도 422 CONSENT_REQUIRED 로 거절한다)
 */
export function familyInviteBody(
  role: Role,
  consent: GuardianConsent,
): { role: Role; guardianConsent?: GuardianConsent } | null {
  if (role === "PARENT") return { role };
  if (!consent.personalData || !consent.healthData) return null;
  return { role, guardianConsent: { personalData: true, healthData: true } };
}

/** 초대 링크. 서버가 준 주소가 없을 때 이 앱의 합류 화면으로 */
export function inviteLink(origin: string, code: string): string {
  return `${origin}/claim?code=${encodeURIComponent(code)}`;
}

/** 만든 코드 위에 다는 제목. 가족 초대는 역할로, 자리 초대는 그 사람 이름으로 */
export function inviteCodeTitle({ role, seatName }: { role: Role; seatName?: string }): string {
  return seatName ? `${seatName} 자리 초대 코드` : `${INVITE_ROLE_NAME[role]} 초대 코드`;
}

/** 카카오톡이나 문자로 보낼 글 */
export function inviteShareText({
  familyName,
  code,
  role,
  seatName,
}: {
  familyName: string;
  code: string;
  role: Role;
  seatName?: string;
}): string {
  const as = seatName ? `${seatName} 자리로` : withJosa(INVITE_ROLE_NAME[role], "으로로");
  return `${familyName}에 ${as} 초대해요. 초대 코드 ${code}`;
}

/** 보낸 초대 한 줄의 제목 — 「보호자 초대」 */
export function pendingInviteTitle(invite: Pick<PendingInvite, "role">): string {
  return `${INVITE_ROLE_NAME[invite.role ?? "PARENT"]} 초대`;
}

/** 보낸 초대 한 줄의 설명 — 「10월 8일까지, 은영님이 보냈어요」 */
export function pendingInviteDetail(
  invite: Pick<PendingInvite, "expiresAt" | "issuedByName">,
): string {
  const until = invite.expiresAt ? `${formatDate(invite.expiresAt)}까지` : "";
  const by = invite.issuedByName ? `${invite.issuedByName}님이 보냈어요` : "";
  return [until, by].filter(Boolean).join(", ");
}

/* ─── 초대 코드로 참여하기(/claim) ─────────────────────────── */

/** 대문자와 숫자 여섯 자리. 링크로 온 코드도 같은 손질을 거친다 */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

/** 가족 초대인가 — 들어오는 사람이 자기 정보를 넣는다. kind 를 아직 안 주는 서버면 자리 초대로 본다 */
export function isFamilyInvite(peek: Pick<InvitePeek, "kind"> | null | undefined): boolean {
  return peek?.kind === "FAMILY";
}

/** 미리 보기 한 줄 — 「서준이네에 보호자로 초대받았어요」, 자리 초대면 「서준이네 도현 자리」 */
export function invitePeekLine(
  peek: Pick<InvitePeek, "kind" | "familyName" | "role"> & { profileName?: string | null },
): string {
  if (isFamilyInvite(peek)) {
    return `${peek.familyName}에 ${withJosa(INVITE_ROLE_NAME[peek.role], "으로로")} 초대받았어요`;
  }
  return `${peek.familyName} ${peek.profileName ?? ""} 자리`.trim();
}

/** 들어오는 사람의 생년월일 고르기. 지금 쓰는 규칙 그대로 — 보호자는 보호자 규칙, 아이는 아이 생일 규칙 */
export function inviteBirthRule(role: Role, on: string = today()): DateRule {
  return role === "CHILD" ? childBirthRule(on) : guardianBirthRule(on);
}

/** 가족 초대로 들어오는 사람이 넣는 것. 키와 몸무게는 골라서 넣는다(빈 칸이면 보내지 않는다) */
export type JoinForm = {
  name: string;
  birthDate: string;
  sex: "M" | "F" | null;
  height: string;
  weight: string;
};

/**
 * 넘어가지 못하는 까닭 한 줄. 빈 칸은 까닭으로 치지 않는다(단추만 잠근다).
 * 보호자로 초대받았는데 만 14세 미만이면 서버도 422 UNDER_14_NOT_ALLOWED 로 거절한다
 */
export function joinProblem(role: Role, form: JoinForm, on: string = today()): string | null {
  if (role === "PARENT" && form.birthDate && form.birthDate <= on) {
    if (!guardianOldEnough(form.birthDate, on)) {
      return `보호자는 만 ${GUARDIAN_MIN_AGE}세부터 참여할 수 있어요`;
    }
  }
  return bodyError("heightCm", form.height) ?? bodyError("weightKg", form.weight);
}

/** 가족 참여 단추를 누를 수 있나 — 이름, 생년월일(고르기 범위 안), 성별이 있고 막는 까닭이 없다 */
export function joinReady(role: Role, form: JoinForm, on: string = today()): boolean {
  return (
    form.name.trim() !== "" &&
    inRule(inviteBirthRule(role, on), form.birthDate) &&
    form.sex != null &&
    joinProblem(role, form, on) === null
  );
}

/** 코드로 참여하기 본문. 자리 초대는 코드만, 가족 초대는 넣은 정보를 함께 */
export function claimBody(
  code: string,
  peek: Pick<InvitePeek, "kind"> | null | undefined,
  form: JoinForm,
): ClaimBody {
  if (!isFamilyInvite(peek)) return { claimCode: code };
  const heightCm = bodyValue("heightCm", form.height);
  const weightKg = bodyValue("weightKg", form.weight);
  return {
    claimCode: code,
    name: form.name.trim(),
    birthDate: form.birthDate,
    ...(form.sex ? { sex: form.sex } : {}),
    ...(heightCm != null ? { heightCm } : {}),
    ...(weightKg != null ? { weightKg } : {}),
  };
}

/** 참여 단추 글 — 가족 초대면 「가족 참여하기」, 자리 초대면 그 자리로 */
export function joinButtonLabel(
  peek: (Pick<InvitePeek, "kind"> & { profileName?: string | null }) | null | undefined,
): string {
  if (!peek || isFamilyInvite(peek) || !peek.profileName) return "가족 참여하기";
  return `${peek.profileName} 자리로 들어가기`;
}
