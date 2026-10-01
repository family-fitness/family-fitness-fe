/**
 * 심사용 계정 — 로그인 화면의 「심사용 계정으로 둘러보기」 에서 심사자가 고르는 세 흐름.
 *
 * 전에는 꾸며 둔 체험 가족으로만 들어가서, 심사자가 처음 가입하는 흐름과 초대받아 들어오는 흐름을
 * 해 볼 수 없었다. 개발용 로그인 묶음(「개발용 · 구글 없이 들어가기」)의 세 갈래와 같은 흐름이다.
 * 서버 API: `POST /auth/review-login` 본문 `{ kind }`. 없으면 FAMILY, 모르는 값은 400.
 */

export type ReviewKind = "FAMILY" | "FRESH" | "INVITED";

export const REVIEW_WAYS: readonly { kind: ReviewKind; title: string; description: string }[] = [
  {
    kind: "FAMILY",
    title: "체험 가족으로 둘러보기",
    description: "측정 기록과 운동 기록이 있는 가족으로 바로 들어가요",
  },
  {
    kind: "FRESH",
    title: "처음부터 가입해 보기",
    description: "가족을 만들고 아이를 등록하는 것부터 해 봐요",
  },
  {
    kind: "INVITED",
    title: "초대받은 보호자로 들어가 보기",
    description: "초대 코드를 입력하고 가족에 참여해 봐요",
  },
];

/** 로그인 응답에서 갈 곳을 정하는 데 쓰는 것만 */
interface SignedIn {
  nextStep?: string | null;
}

/**
 * 로그인하고 갈 곳 — 초대 코드를 들고 왔고 아직 가족이 없으면 그 코드를 넣는 화면으로.
 * 이미 가족이 있으면(참여 방식, 홈) 스플래시가 단계대로 보낸다. 그 코드는 쓰이지 않았다(`unusedInvite`)
 */
export function afterSignIn(auth: SignedIn, claimCode: string | null | undefined): string {
  return claimCode && auth.nextStep !== "SUPPORT_MODE" && auth.nextStep !== "HOME"
    ? `/claim?code=${encodeURIComponent(claimCode)}`
    : "/";
}

/**
 * 가족이 있는 계정이 초대 코드를 들고 로그인했다.
 *
 * 로그인은 코드를 쓰지 않는다(BE). 가족이 없는 계정이면 nextStep 이 CLAIM 이라 합류 화면으로 가지만,
 * 가족이 있으면 HOME(또는 참여 방식)이 와서 전에는 코드가 아무 말 없이 버려졌다. 이때 한 번 알린다
 */
export function unusedInvite(auth: SignedIn, claimCode: string | null | undefined): boolean {
  return Boolean(claimCode) && (auth.nextStep === "HOME" || auth.nextStep === "SUPPORT_MODE");
}

/** 코드를 쓰지 않았다는 안내. 까닭과 해결법 */
export const UNUSED_INVITE_COPY = {
  title: "이미 가족이 있는 계정이라 초대 코드를 쓰지 않았어요",
  detail: "다른 가족에 참여하려면 설정에서 계정을 탈퇴한 뒤 다시 시도해 주세요",
};

/**
 * 심사용 계정으로 들어온 뒤 갈 곳. INVITED 는 서버가 준 초대코드(`inviteCode`)를 채운 합류 화면으로,
 * 나머지는 스플래시가 단계대로(체험 가족은 홈, 처음 가입은 새 가족 만들기와 초대 코드로 참여하기를 고르는 화면) 보낸다
 */
export function reviewDestination(auth: SignedIn & { inviteCode?: string | null }): string {
  return afterSignIn(auth, auth.inviteCode);
}
