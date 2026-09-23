import { Dumbbell, HeartPulse, Shuffle, Timer, Waves, Zap, type LucideIcon } from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import type { Factor } from "@/lib/fitness-factors";

/**
 * 여섯 요인의 그림. 그림(`icon/factor-*`)이 오기 전까지는 선 아이콘이 대신 선다.
 * 여섯 장이 늘 같은 결로 맞아야 해서 한 번에 주문했다(`ASSET_PROMPTS.md` 5장).
 */
const ART: Record<Factor, { name: string; fallback: LucideIcon }> = {
  심폐지구력: { name: "icon/factor-cardio", fallback: HeartPulse },
  근력: { name: "icon/factor-strength", fallback: Dumbbell },
  근지구력: { name: "icon/factor-endurance", fallback: Timer },
  유연성: { name: "icon/factor-flexibility", fallback: Waves },
  민첩성: { name: "icon/factor-agility", fallback: Shuffle },
  순발력: { name: "icon/factor-power", fallback: Zap },
};

export function FactorIcon({ factor, className }: { factor: Factor; className?: string }) {
  const art = ART[factor];
  return <ArtIcon name={art.name} fallback={art.fallback} className={className} />;
}
