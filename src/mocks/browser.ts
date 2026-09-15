import { setupWorker } from "msw/browser";

import { handlers, setActingProfile } from "./handlers";

export const worker = setupWorker(...handlers);

/**
 * 개발 중에 다른 사람으로 보기.
 *
 * 콘솔에서 `__ff.actAs("<profileId>")` 를 치면 그 프로필로 로그인한 것처럼 된다.
 * 자녀 계정 화면이나 승인 권한처럼 **누구로 보느냐에 따라 달라지는 것**을
 * 확인하려면 계정을 바꿔 가며 봐야 하는데, 목에는 로그인이 없다.
 *
 * 개발 빌드에서만 붙는다.
 */
if (process.env.NODE_ENV === "development") {
  (window as unknown as { __ff: unknown }).__ff = {
    actAs: (profileId: string) => {
      setActingProfile(profileId);
      window.location.reload();
    },
  };
}
