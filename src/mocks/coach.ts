/**
 * AI 편성 — 오늘 운동을 짜는 회차.
 *
 * 챗봇을 없앴으니 추천은 **버튼으로** 받는다(9/23 회의). 부모가 조건을 고르면
 * 회차가 하나 생기고, 코치가 단계를 하나씩 밟는다 — 측정 읽기 · 키울 힘 찾기 ·
 * 또래 처방 찾기 · 클립 고르기 · 순서 짜기. 목은 단계마다 1.1초씩 걸리게 흉내 낸다.
 * 다 짜면 **제안**이 된다. 부모가 「오늘 운동으로 등록」 해야 미션이 생긴다(규칙 1).
 *
 * ▲ 서버의 편성 요청(`StartCoachRunRequest`)은 한 주 단위다. 하루 단위와 조건
 * (`date` · `quiet` · `place` · `focusFactor` · `withParent`)을 요청해 두었다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type { CoachRun } from "@/lib/api/types";
import { toDateString } from "@/lib/today";

import {
  BASE,
  DEMO,
  acting,
  catalog,
  db,
  fail,
  fixtures,
  saveCoachRun,
  saveMissions,
  sessionsFor,
  uuid,
  type MissionRow,
} from "./db";

export interface PlanParams {
  profileId: string;
  date: string;
  minutes: number;
  quiet: boolean;
  place: "HOME" | "OUTDOOR";
  /** 부모가 고른 힘. 없으면 코치가 가장 낮은 요인을 고른다 */
  focusFactor: string | null;
  withParent: boolean;
}

type Run = CoachRun & { params?: PlanParams; startedAt?: number };

const STEP_MS = 1100;
const STEP_NAMES = ["assess", "focus", "retrieve", "select", "compose"] as const;

function nameOf(profileId: string) {
  return db.profiles.profiles.find((p) => p.profileId === profileId)?.name ?? "아이";
}

/** 가장 낮은 요인. 서버가 준 weakest 를 먼저 보고, 없으면 레이더에서 */
function weakestOf(profileId: string): string {
  const latest = db.latest[profileId];
  if (latest?.weakest?.factor) return latest.weakest.factor;
  const measured = (latest?.radar ?? []).filter((r) => r.percentile != null);
  measured.sort((a, b) => (a.percentile ?? 0) - (b.percentile ?? 0));
  return measured[0]?.factor ?? "유연성";
}

/** 단계마다 남기는 한 줄. 「왜 이 운동이지?」 를 나중에 되짚는 근거다 */
function stepSummary(name: (typeof STEP_NAMES)[number], p: PlanParams, focus: string) {
  const who = nameOf(p.profileId);
  const latest = db.latest[p.profileId];
  const pool = catalog.filter(
    (c) =>
      c.homeOk && !c.props && (!p.quiet || c.quiet) && (c.phase !== "MAIN" || c.factor === focus),
  );
  switch (name) {
    case "assess":
      return `${who} · 측정 ${latest?.items?.length ?? 0}항목 · ${latest?.testedOn ?? "측정 없음"}`;
    case "focus":
      return p.focusFactor
        ? `${focus} — 부모가 고른 힘이에요`
        : `${focus} — 또래보다 가장 낮아서 키우기 좋아요`;
    case "retrieve":
      return `국민체력100 운동처방에서 ${focus} 처방 12건을 찾았어요`;
    case "select":
      return `클립 ${catalog.length}개 중 조건에 맞는 ${pool.length}개${p.quiet ? " · 조용한 것만" : ""}`;
    case "compose":
      return `준비 2 · 본 2 · 정리 2 · ${p.minutes}분`;
  }
}

/** 다 짠 제안 하나 */
function proposalFor(p: PlanParams, focus: string, runId: string) {
  const sessions = sessionsFor(focus, p.minutes, { quiet: p.quiet, skip: runId.charCodeAt(0) % 7 });
  const kid = nameOf(p.profileId);
  const first = sessions.find((s) => s.phase === "MAIN") ?? sessions[0];
  return {
    position: 0,
    title: `${focus} 키우기 ${p.minutes}분`,
    rationale: p.focusFactor
      ? `고르신 ${focus}을 본운동에 넣고, 몸을 푸는 동작을 앞뒤에 붙였어요.`
      : `${kid}의 ${focus}이 또래보다 가장 낮아요. ${focus}을 기르는 동작을 본운동에 넣고, 늘이는 동작으로 시작과 끝을 잡았어요.`,
    targetMetric: "TIMER_MINUTES",
    targetValue: p.minutes,
    startDate: p.date,
    endDate: p.date,
    participants: [
      { profileId: p.profileId, role: "CHILD", coachRole: "주인공" },
      ...(p.withParent
        ? [{ profileId: DEMO.mom, role: "PARENT", coachRole: "같이 하는 사람" }]
        : []),
    ],
    video: null,
    citations: [
      {
        index: 1,
        label: "국민체력100 운동처방 · 유소년 11세",
        chunkId: `prescription:유소년-11-${focus}`,
        url: null,
      },
      {
        index: 2,
        label: `국민체력100 운동영상 · ${first?.title ?? "기초체력"}`,
        chunkId: `video:${first?.clip.videoId ?? ""}`,
        url: first
          ? `https://www.youtube.com/watch?v=${first.clip.videoId}&t=${first.clip.startSec}s`
          : null,
      },
    ],
    sessions,
  };
}

/** 회차를 지금 시각에 맞춰 한 걸음 앞으로. 다 짰으면 제안을 단다 */
function advance(run: Run) {
  if (run.status !== "RUNNING" || !run.params) return run;
  const elapsed = Date.now() - (run.startedAt ?? Date.now());
  const done = Math.min(STEP_NAMES.length, Math.floor(elapsed / STEP_MS));
  const focus = run.params.focusFactor ?? weakestOf(run.params.profileId);
  run.steps = STEP_NAMES.slice(0, Math.min(STEP_NAMES.length, done + 1)).map((name, i) => ({
    seq: i + 1,
    name,
    status: i < done ? "ok" : "running",
    summary: i < done ? stepSummary(name, run.params!, focus) : "",
  }));
  if (done >= STEP_NAMES.length) {
    const proposal = proposalFor(run.params, focus, run.coachRunId ?? "x");
    run.status = "AWAITING_APPROVAL";
    run.summary = proposal.rationale;
    run.proposals = [proposal] as unknown as Run["proposals"];
    run.canApprove = true;
  }
  return run;
}

/**
 * 시연을 여는 가족에게 이미 와 있는 제안.
 *
 * 승인 전이라 미션은 0건이다(규칙 1 — `check:mocks` 가 이걸 센다).
 * 회차 번호는 픽스처(실제 서버 응답)와 같게 둔다.
 */
export function seedCoachRun(): Run {
  const params: PlanParams = {
    profileId: DEMO.kid,
    date: toDateString(new Date()),
    minutes: 20,
    quiet: true,
    place: "HOME",
    focusFactor: null,
    withParent: true,
  };
  const run: Run = {
    ...structuredClone(fixtures.coachRun),
    status: "RUNNING",
    params,
    startedAt: 0,
  } as Run;
  return advance(run);
}

/**
 * 지금 회차. 탭 저장소나 `db` 초기값이 옛 모양(한 주 단위 픽스처)이면
 * 같은 번호로 오늘 제안을 새로 단다 — `db.ts` 가 이 파일을 부르면 서로 물고 물린다.
 */
function current(): Run {
  const run = db.coachRun as Run;
  if (!run.params) db.coachRun = seedCoachRun() as typeof db.coachRun;
  return db.coachRun as Run;
}

export const coaching = [
  /** 조건을 받아 회차를 연다. 실행은 비동기라 접수만 하고 202 */
  http.post(`${BASE}/families/:familyId/coach/runs`, async ({ request }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자만 편성을 받을 수 있습니다");
    const body = ((await request.json().catch(() => ({}))) ?? {}) as Partial<PlanParams> & {
      minutesPerSession?: number;
    };
    const kid =
      body.profileId ?? db.profiles.profiles.find((p) => p.role === "CHILD")?.profileId ?? DEMO.kid;
    const minutes = Math.max(5, Math.min(60, body.minutes ?? body.minutesPerSession ?? 20));
    const run: Run = {
      coachRunId: uuid(),
      familyId: db.profiles.familyId,
      status: "RUNNING",
      weekStart: body.date ?? toDateString(new Date()),
      summary: null,
      steps: [],
      proposals: null,
      canApprove: false,
      missionCount: 0,
      rejectedReason: null,
      params: {
        profileId: kid,
        date: body.date ?? toDateString(new Date()),
        minutes,
        quiet: body.quiet ?? true,
        place: body.place ?? "HOME",
        focusFactor: body.focusFactor ?? null,
        withParent: body.withParent ?? false,
      },
      startedAt: Date.now(),
    };
    db.coachRun = run as typeof db.coachRun;
    db.hasCoachRun = true;
    saveCoachRun();
    return HttpResponse.json(
      { coachRunId: run.coachRunId, status: "RUNNING", pollAfterMs: 700 },
      { status: 202 },
    );
  }),

  http.get<PathParams>(`${BASE}/coach/runs/:runId`, ({ params }) => {
    const run = current();
    if (run.coachRunId !== String(params.runId))
      return fail(404, "RUN_NOT_FOUND", "회차가 없습니다");
    advance(run);
    saveCoachRun();
    return HttpResponse.json(run);
  }),

  /** ▲ 서버에 아직 없다. 기기에 든 runId 가 없어도 오늘 제안을 다시 찾게 */
  http.get(`${BASE}/families/:familyId/coach/runs/latest`, () => {
    if (!db.hasCoachRun) return fail(404, "NO_RUN", "회차가 없습니다");
    const run = advance(current());
    return HttpResponse.json(run);
  }),

  /**
   * ★ 미션이 만들어지는 유일한 지점. 등록 전까지 이 회차의 미션은 0건이다.
   */
  http.post<PathParams>(`${BASE}/coach/runs/:runId/approve`, ({ params }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    const run = current();
    if (run.coachRunId !== String(params.runId))
      return fail(404, "RUN_NOT_FOUND", "회차가 없습니다");
    if (run.status === "APPROVED") return fail(409, "ALREADY_APPROVED", "이미 등록했습니다");
    if (run.status !== "AWAITING_APPROVAL") {
      return fail(409, "INVALID_STATE", "등록할 수 없는 상태입니다");
    }

    const proposal = (run.proposals ?? [])[0] as unknown as ReturnType<typeof proposalFor>;
    const mission = {
      missionId: uuid(),
      title: proposal.title,
      origin: "COACH",
      coachRunId: run.coachRunId,
      targetMetric: "TIMER_MINUTES",
      targetValue: proposal.targetValue,
      serverVerifiable: true,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      rationale: proposal.rationale,
      video: null,
      sessions: proposal.sessions,
      participants: proposal.participants.map((p) => ({
        profileId: p.profileId,
        name: nameOf(p.profileId),
        progress: 0,
        completed: false,
        verifiedBy: null,
        needsGuardianCheck: false,
      })),
    } as unknown as MissionRow;
    db.missions = [...db.missions, mission];
    run.status = "APPROVED";
    run.missionCount = 1;
    run.canApprove = false;
    saveMissions();
    saveCoachRun();
    return HttpResponse.json({
      coachRunId: run.coachRunId,
      status: "APPROVED",
      approvedBy: me.profileId,
      approvedAt: new Date().toISOString(),
      createdMissions: [{ missionId: mission.missionId, title: mission.title, origin: "COACH" }],
    });
  }),

  http.post<PathParams>(`${BASE}/coach/runs/:runId/reject`, async ({ params, request }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    const run = current();
    if (run.coachRunId !== String(params.runId))
      return fail(404, "RUN_NOT_FOUND", "회차가 없습니다");
    if (run.status !== "AWAITING_APPROVAL") {
      return fail(409, "INVALID_STATE", "처리할 수 없는 상태입니다");
    }
    const { reason } = ((await request.json().catch(() => ({}))) ?? {}) as { reason?: string };
    run.status = "REJECTED";
    run.rejectedReason = reason ?? null;
    saveCoachRun();
    // 거절해도 미션은 0건 유지
    return HttpResponse.json({
      coachRunId: run.coachRunId,
      status: "REJECTED",
      rejectedReason: reason ?? null,
      missionCount: 0,
    });
  }),
];
