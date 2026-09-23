import { Dumbbell, HeartPulse, Shuffle, Timer, Waves, Zap, type LucideIcon } from "lucide-react";

import type { Factor } from "@/lib/fitness-factors";

/**
 * 여섯 요인의 아이콘. 그림을 뽑지 않고 선 아이콘으로 둔다 —
 * 헬스 앱들이 지표마다 쓰는 방식이고, 여섯 장이 늘 같은 굵기로 맞는다.
 */
export const FACTOR_ICON: Record<Factor, LucideIcon> = {
  심폐지구력: HeartPulse,
  근력: Dumbbell,
  근지구력: Timer,
  유연성: Waves,
  민첩성: Shuffle,
  순발력: Zap,
};
