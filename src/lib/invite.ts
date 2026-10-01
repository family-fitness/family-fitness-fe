import type { GuardianConsent, PendingInvite, Role } from "./api/types";
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
