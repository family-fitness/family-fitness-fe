import type { Role } from "./api/types";

/** 지금 이 기기를 누가 쓰고 있는가 */
export type ViewMode = "parent" | "kid";

/**
 * 이 기기를 누가 쓰는지 정한다. 계정의 역할이 먼저다.
 *
 *   자녀 계정    늘 아이 화면. 기기에 부모가 남아 있어도 부모 화면을 내주지 않는다
 *   보호자 계정  정해 둔 것이 있으면 그대로(설정의 「누가 쓰는지 바꾸기」 로 폰을 아이에게 빌려준 중이면 아이),
 *               없으면 부모 화면
 *
 * 전에는 정해 둔 것이 없으면 늘 「누가 쓰고 있나요」 를 물었다. 계정을 보면 답이 있는 질문이었다.
 * 역할을 모르면(계정을 아직 못 받았으면) 정해 둔 것만 따른다.
 */
export function modeFor(role: Role | null | undefined, stored: ViewMode | null): ViewMode | null {
  if (role === "CHILD") return "kid";
  if (stored) return stored;
  if (role === "PARENT") return "parent";
  return null;
}

/** 그 화면의 홈. 정하지 못했으면 누가 쓰는지 고르는 화면(`/start`) */
export function homeOf(mode: ViewMode | null): "/kid" | "/parent" | "/start" {
  if (mode === "kid") return "/kid";
  if (mode === "parent") return "/parent";
  return "/start";
}
