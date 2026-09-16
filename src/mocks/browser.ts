import { setupWorker } from "msw/browser";

import { handlers, setActingProfile } from "./handlers";

export const worker = setupWorker(...handlers);

/** 개발 중에 다른 사람으로 보기. */
if (process.env.NODE_ENV === "development") {
  (window as unknown as { __ff: unknown }).__ff = {
    actAs: (profileId: string) => {
      setActingProfile(profileId);
      window.location.reload();
    },
  };
}
