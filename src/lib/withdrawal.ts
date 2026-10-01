import type { ProfileSummary } from "./api/types";

/**
 * 계정 탈퇴. 누가 탈퇴하는지에 따라 지워지는 것과 안내가 다르다(BE 와 맞춘 규칙).
 *
 *   NO_FAMILY           프로필이 없는 계정. 계정만 지워진다
 *   CHILD               아이 본인 계정. 계정과 아이 프로필, 아이 기록이 모두 지워진다
 *   GUARDIAN            오너가 아닌 보호자. 내 계정과 내 기록만 지워지고 가족과 아이 기록은 남는다
 *   OWNER_ALONE         가족에 혼자 남은 오너. 가족까지 지워진다
 *   OWNER_WITH_MEMBERS  다른 구성원이 남은 오너. 서버가 409 FAMILY_NOT_EMPTY 로 거절하므로 탈퇴 버튼을 내지 않는다
 */
export type WithdrawalCase =
  "NO_FAMILY" | "CHILD" | "GUARDIAN" | "OWNER_ALONE" | "OWNER_WITH_MEMBERS";

type Who = Pick<ProfileSummary, "profileId" | "role" | "isOwner">;

/**
 * 가족 목록을 아직 못 받은 오너는 혼자로 보고 서버에 맡긴다. 다른 구성원이 있으면 서버가 409 FAMILY_NOT_EMPTY 로
 * 돌려보내고, 그때 `familyNotEmpty` 로 다시 불러 오너 안내로 바꾼다
 */
export function withdrawalCase({
  me,
  members,
  familyNotEmpty = false,
}: {
  /** 이 계정의 프로필. 보호자 프로필이 있으면 그것이다(`useSession`) */
  me: Who | undefined;
  /** 같은 가족의 구성원. 아직 못 받았으면 undefined */
  members: readonly Pick<ProfileSummary, "profileId">[] | undefined;
  /** 서버가 409 FAMILY_NOT_EMPTY 로 돌려보냈다 */
  familyNotEmpty?: boolean;
}): WithdrawalCase {
  if (familyNotEmpty) return "OWNER_WITH_MEMBERS";
  if (!me) return "NO_FAMILY";
  if (me.role === "CHILD") return "CHILD";
  if (!me.isOwner) return "GUARDIAN";
  const others = (members ?? []).some((p) => p.profileId !== me.profileId);
  return others ? "OWNER_WITH_MEMBERS" : "OWNER_ALONE";
}

/** 탈퇴 확인 시트의 제목과 글. `canWithdraw` 가 false 면 탈퇴 버튼 대신 가족 관리로 가는 버튼을 낸다 */
export const WITHDRAWAL_COPY: Record<
  WithdrawalCase,
  { title: string; lines: string[]; canWithdraw: boolean }
> = {
  NO_FAMILY: {
    title: "계정을 탈퇴할까요",
    lines: ["탈퇴하면 내 계정이 지워져요", "지운 계정은 되돌릴 수 없어요"],
    canWithdraw: true,
  },
  // 아이가 읽는다. 어려운 말 없이
  CHILD: {
    title: "정말 탈퇴할까요",
    lines: [
      "탈퇴하면 내 계정이 없어지고 지금까지 운동한 기록도 모두 지워져요",
      "한 번 지우면 다시 볼 수 없어요",
    ],
    canWithdraw: true,
  },
  GUARDIAN: {
    title: "계정을 탈퇴할까요",
    lines: [
      "탈퇴하면 내 계정과 내 기록이 지워져요",
      "가족과 아이 기록은 그대로 남아요",
      "지운 정보는 되돌릴 수 없어요",
    ],
    canWithdraw: true,
  },
  OWNER_ALONE: {
    title: "계정을 탈퇴할까요",
    lines: ["탈퇴하면 가족 정보와 내 기록이 모두 지워져요", "지운 정보는 되돌릴 수 없어요"],
    canWithdraw: true,
  },
  OWNER_WITH_MEMBERS: {
    title: "아직 탈퇴할 수 없어요",
    lines: ["가족 관리에서 다른 구성원을 모두 내보낸 뒤에 탈퇴할 수 있어요"],
    canWithdraw: false,
  },
};

/** 탈퇴한 뒤 보내는 곳. 로그인 화면이 이 표시를 보고 한 줄 안내를 띄운다 */
export const WITHDRAWN_PATH = "/login?withdrawn=1";

export const WITHDRAWN_NOTICE = "탈퇴했어요. 그동안 함께해 주셔서 고마워요";

/** 탈퇴하고 넘어온 로그인 화면인가 */
export function cameAfterWithdrawal(params: Pick<URLSearchParams, "get">): boolean {
  return params.get("withdrawn") === "1";
}
