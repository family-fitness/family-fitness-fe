import { artFor } from "./art";

/**
 * 키움이 동작 그림(ASSET_PROMPTS 8장, 9/30 「같은 동작 사진만 있어서 별로」).
 *
 * 레벨 단계와 상관없는 「운동하는 키움이」 다 — 새싹 키움이 한 모습으로 동작만 바뀐다.
 * 그림이 들어와 목록에 오르면 그 자리에 선다. 오기 전에는 부르는 쪽이 원래 그림을 그대로 둔다.
 * 이름은 틀(`pose/kiumi-${동작}`)로 만든다 — 동작 이름은 아래 타입이 막아 오타가 날 수 없다.
 */
export type Pose =
  "run" | "squat" | "jumprope" | "stretch" | "jump" | "sidestep" | "water" | "wave" | "ball";

/** 체력 요인마다 그 힘을 기르는 동작 */
export const FACTOR_POSE: Record<string, Pose> = {
  심폐지구력: "run",
  근력: "squat",
  근지구력: "jumprope",
  유연성: "stretch",
  순발력: "jump",
  민첩성: "sidestep",
};

/** 그 동작 그림. 아직 없으면 null */
export function poseArt(pose: Pose): string | null {
  return artFor(`pose/kiumi-${pose}`);
}
