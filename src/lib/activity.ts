import type { Availability, DayLog, Mission } from "./api/types";
import { sessionsOf } from "./session-plan";
import { today, weekdayCode } from "./today";

/**
 * 오늘 한 만큼 — 링 셋의 숫자.
 *
 * 시간은 서버가 아는 것(영상 · 타이머)만 센다. 직접 적은 걸음수는 넣지 않는다(규칙 2).
 * 부모 홈과 아이 홈이 이 함수 하나로 센다 — 같은 날을 두 화면이 다르게 세면 안 된다.
 */
export interface TodayActivity {
  /** 오늘 확인된 운동 시간(분) */
  moved: number;
  /** 오늘 목표(분). 잡힌 운동 → 그날 적어 둔 시간 → 20 */
  goal: number;
  /** 끝낸 칸 */
  done: number;
  /** 오늘 칸. 잡힌 운동이 없으면 0 */
  total: number;
  /** 이번 주 움직인 날 */
  days: number;
  /** 이번 주 운동하기로 적어 둔 날. 없으면 3 */
  target: number;
}

/** 아무것도 정해 두지 않은 날의 목표(분). 「주말 30분부터」 보다 가볍게 */
const DEFAULT_GOAL = 20;
/** 운동할 수 있는 시간을 적어 두지 않았을 때 한 주에 움직일 날 */
const DEFAULT_DAYS = 3;

export function todayActivity({
  profileId,
  missions,
  weekLogs,
  availability,
  now = today(),
}: {
  profileId: string | undefined;
  missions: Mission[] | undefined;
  /** 이번 주 기록. 아무것도 안 한 날은 들어 있지 않다 */
  weekLogs: DayLog[] | undefined;
  availability: Availability | undefined;
  now?: string;
}): TodayActivity {
  const mine = (missions ?? []).filter(
    (m) =>
      (m.startDate ?? "") <= now &&
      now <= (m.endDate ?? "") &&
      m.targetMetric !== "STEPS" &&
      m.participants?.some((p) => p.profileId === profileId),
  );
  const sessions = mine.flatMap((m) => sessionsOf(m));
  const log = weekLogs?.find((d) => d.date === now);
  const slots = availability?.slots ?? [];
  const planned = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const written = slots.find((s) => s.day === weekdayCode(now))?.minutes;

  return {
    moved: log?.minutes ?? 0,
    goal: log?.plannedMinutes || planned || written || DEFAULT_GOAL,
    done: sessions.filter((s) => s.completed).length,
    total: sessions.length,
    days: (weekLogs ?? []).filter((d) => d.minutes > 0).length,
    target: slots.length || DEFAULT_DAYS,
  };
}
