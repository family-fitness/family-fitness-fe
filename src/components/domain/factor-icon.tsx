import { ArtIcon } from "@/components/ui/art-icon";
import type { Factor } from "@/lib/fitness-factors";

/**
 * 여섯 요인의 그림(`icon/factor-*`). 여섯 장이 늘 같은 결로 맞아야 해서 한 번에
 * 주문했다(`ASSET_PROMPTS.md` 5장). 오기 전에는 자리만 비어 있다.
 */
const ART: Record<Factor, string> = {
  심폐지구력: "icon/factor-cardio",
  근력: "icon/factor-strength",
  근지구력: "icon/factor-endurance",
  유연성: "icon/factor-flexibility",
  민첩성: "icon/factor-agility",
  순발력: "icon/factor-power",
};

export function FactorIcon({ factor, className }: { factor: Factor; className?: string }) {
  return <ArtIcon name={ART[factor]} className={className} />;
}
