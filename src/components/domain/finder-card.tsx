import { Card, CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { FactorIcon } from "@/components/domain/factor-icon";
import { FACTORS } from "@/lib/fitness-factors";

/**
 * 키우고 싶은 힘으로 운동 찾기.
 *
 * AI 편성과 다른 길이다 — 부모가 "우리 애 유연성 좀" 하고 직접 고르는 길(회의:
 * 검색이 안 되면 카테고리를 눌렀을 때 해당 영상이 쫙 나오게).
 */
export function FinderCard() {
  return (
    <Card>
      <CardHead title="키우고 싶은 힘으로 찾기" href="/videos" />
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {FACTORS.map((f) => {
          return (
            <li key={f}>
              <NavLink
                href={`/videos?factor=${encodeURIComponent(f)}`}
                className="press bg-sub flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5"
              >
                <FactorIcon factor={f} className="text-signal-strong size-7" />
                <span className="text-caption font-bold">{f}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
