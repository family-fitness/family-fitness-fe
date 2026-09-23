import { Card, CardHead } from "@/components/ui/card";
import { Initial } from "@/components/ui/initial";
import type { FitnessMapMember } from "@/lib/api/types";

/**
 * 가족 줄. 누가 있고 누가 아직 안 들어왔는지만.
 *
 * 점수를 나란히 적지 않는다 — 가족끼리 점수를 줄 세우면 형제 비교가 된다(규칙 10).
 * 자세한 것은 가족 관리에서.
 */
export function FamilyCard({ members }: { members: FitnessMapMember[] }) {
  return (
    <Card href="/parent/family" label="가족 관리">
      <CardHead title="가족" meta={`${members.length}명`} chevron />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {members.map((m) => (
          <li key={m.profileId} className="flex items-center gap-2">
            <Initial name={m.name} tone={m.role === "CHILD" ? "signal" : "mark"} size="sm" />
            <span className="text-sm font-bold">{m.name}</span>
            {m.role === "PARENT" && !m.hasAccount && (
              <span className="text-micro text-ink-soft bg-sub rounded-full px-2 py-0.5 font-bold">
                초대 전
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
