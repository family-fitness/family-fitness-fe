"use client";

import { ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSwitch } from "@/components/domain/child-switch";
import { FactorIcon } from "@/components/domain/factor-icon";
import { FactorRadar } from "@/components/domain/factor-radar";
import { ScoreLine } from "@/components/domain/factor-view";
import { ErrorState } from "@/components/ui/error-state";
import { ApiError } from "@/lib/api/client";
import { BAND_COPY, FOCUS_COPY } from "@/lib/api/types";
import {
  useAvailability,
  useFitnessMap,
  useLatestCoachRun,
  useLatestFitnessTest,
  useStartCoachRun,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { FACTORS, isFactor, memberNoPeerNormsNote, type Factor } from "@/lib/fitness-factors";
import { togetherBlock } from "@/lib/schedule";
import { useSession } from "@/lib/session";
import { today, weekdayCode } from "@/lib/today";
import { cn } from "@/lib/utils";
import { childFinderHref } from "@/lib/videos";
import { useBodyStore } from "@/stores/body-store";
import { useRoleStore } from "@/stores/role-store";
import { useTabStore } from "@/stores/tab-store";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * AI 편성 — 조건 고르기.
 *
 * **채팅이 아니라 칩이다.** 열린 질문을 받으면 「우리 애 살 빼려면?」 같은 답하면 안 되는
 * 질문까지 들어온다. 고를 수 있는 것만 두면 막을 것이 없고, 부모는 자기가 조종한다고 느낀다.
 *
 * 보호자가 키워 주고 싶은 역량(focus_factor)을 고르지 않으면 코치가 가장 낮은 요인을 고른다 — 육각형에서 안쪽으로
 * 들어간 꼭지점이다. 그래서 여기에 그 육각형을 같이 둔다.
 *
 * 추천 대상은 아이들과 로그인한 보호자 본인이다. 보호자를 고르면 서버가 성인 나이로 AI 에 보내 성인 영상으로 짠다.
 * 그때는 「같이」 칩과 시간표 겹침 안내처럼 아이에게만 맞는 칸을 숨긴다. 다른 보호자는 고르지 않는다.
 */
const MINUTES = [10, 20, 30, 40] as const;

/** 적어 둔 시간을 고를 수 있는 칸 중 가장 가까운 것으로 */
function nearest(m: number) {
  return MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
}

export default function PlanPage() {
  return (
    <ParentOnly>
      <PlanForm />
    </ParentOnly>
  );
}

function PlanForm() {
  const router = useRouter();
  const {
    familyId,
    profile,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: map, isLoading: mapLoading, error: mapError, refetch } = useFitnessMap(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);
  // 방금 잰 사람의 결과에서 왔으면 그 사람으로 — 홈에서 고른 아이로 짜면 다른 아이의 제안이 된다
  const wanted = useSearchParams().get("profileId");
  // 뒤로는 들어온 탭으로. 운동 탭에서 왔으면 운동 탭, 홈에서 왔으면 홈
  const back = useTabStore((s) => s.last);
  const members = map?.members ?? [];
  const kids = members.filter((m) => m.role === "CHILD");
  // 추천 대상 칩은 아이들 다음에 나(로그인한 보호자). 다른 보호자는 넣지 않는다
  const me = members.find((m) => m.role === "PARENT" && m.profileId === profile?.profileId);
  const choices = me ? [...kids, me] : kids;
  // 고른 적이 없으면 홈에서 고른 아이, 아이가 없으면 나
  const who =
    choices.find((m) => m.profileId === wanted) ??
    kids.find((k) => k.profileId === childProfileId) ??
    kids[0] ??
    me;
  const forMe = who != null && who === me;
  const { data: latest } = useLatestFitnessTest(who?.profileId);
  // 안 잰 사람은 연령대 · 성별 · 키 · 몸무게로 짠다(9/30 시연) — 키 · 몸무게는 가입 때 이 기기에 적은 값
  const deviceBody = useBodyStore((s) => (who?.profileId ? s.byProfile[who.profileId] : undefined));
  const start = useStartCoachRun(familyId ?? "");
  // 이미 짜고 있거나 받아 둔 제안 — 다시 짜 달라고 했다가 막히면 그리로 간다
  // 지금 짜려는 사람의 것만 — 「제안 보기」 가 형제의 제안으로 가지 않게
  const { data: current } = useLatestCoachRun(familyId, who?.profileId);

  const { data: availability } = useAvailability(who?.profileId);
  // 「같이」 는 아이와 나(보호자)의 시간표가 오늘 요일에 겹칠 때만
  const { data: myWeek } = useAvailability(profile?.profileId);
  // 고르기 전에는 오늘 적어 둔 시간이 기본이다. 적어 둔 게 없으면 20분
  const [picked, setPicked] = useState<number | null>(null);
  const todaySlot = availability?.slots.find((s) => s.day === weekdayCode());
  const minutes = picked ?? nearest(todaySlot?.minutes ?? 20);
  const [place, setPlace] = useState<"HOME" | "OUTDOOR">("HOME");
  const [quiet, setQuiet] = useState(true);
  const [focus, setFocus] = useState<Factor | null>(null);
  // 운동 찾기에서 담아 둔 동작 — 있으면 직접 만들기로 바로
  const gathered = useRoutineStore((s) => s.moves.length);
  useRoutineReady();
  // 참여 방식이 「매번 같이」 면 부모도 같이가 기본이다 — 「주말에는 같이」 면 토 · 일에. 고르기 전에는 기본값을 따른다 —
  // 처음 한 번만 읽으면 새로고침 직후(/me 가 오기 전)에는 늘 「혼자」 였다
  const [pickedWithParent, setWithParent] = useState<boolean | null>(null);
  const weekend = weekdayCode() === "SAT" || weekdayCode() === "SUN";
  // 「같이」 는 아이와 나의 시간표가 오늘 요일에 겹칠 때만 한다(사용자 결정). 겹치지 않으면
  // 「매번 같이」 와 「주말에는 같이」 의 기본값도 끈다. 두 시간표를 다 받기 전에는 막지 않는다.
  // 내 운동을 받을 때는 같이 할 사람이 따로 없다. 겹침을 보지 않고 「같이」 도 끈다
  const notTogether =
    who && !forMe && availability && myWeek
      ? togetherBlock(
          weekdayCode(),
          { name: who.name ?? "아이", slots: availability.slots },
          { name: profile?.name ?? "나", slots: myWeek.slots },
        )
      : null;
  const withParent =
    !forMe &&
    !notTogether &&
    (pickedWithParent ??
      (profile?.supportMode === "FULL" || (profile?.supportMode === "WEEKEND" && weekend)));
  const [error, setError] = useState<string | null>(null);
  /** 막힌 까닭이 「이미 있는 제안」 이면 그리로 가는 길 */
  const [existing, setExisting] = useState(false);
  /** 막힌 까닭이 「잰 사람이 없다」 면 첫 측정으로 가는 길(규칙 4) */
  const [unmeasured, setUnmeasured] = useState(false);
  // 막힌 까닭 카드는 폼 맨 끝(단추 바로 위)에 그려진다. 나타나면 그리로 내려 준다 — 화면 위쪽은 그대로라 눌러도 아무 일 없는 줄 알았다
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  const failure = sessionError ?? (map ? null : mapError);
  if (failure) {
    return (
      <>
        <AppBar backHref={back} title="AI 운동 추천" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
          />
        </Stage>
      </>
    );
  }

  if (sessionPending || mapLoading) {
    return (
      <>
        <AppBar backHref={back} title="AI 운동 추천" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  // 고를 사람이 없다(아이도 없고 체력 지도에 나도 없다). 꺼진 단추만 두지 않고 아이 등록 화면으로 가는 링크를 보인다.
  // 아이가 없어도 내가 있으면 내 운동을 받는다
  if (!who) {
    return (
      <>
        <AppBar backHref={back} title="AI 운동 추천" />
        <Stage wide>
          <EmptyState
            scene="hello"
            title="아이를 등록하면 운동을 만들어 줘요"
            action={
              <NavLink
                href="/start/child"
                className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
              >
                아이 등록하기
              </NavLink>
            }
          />
        </Stage>
      </>
    );
  }

  const name = who.name ?? (forMe ? "나" : "아이");
  // 서버가 준 가장 낮은 요인. 보호자가 키워 주고 싶은 역량을 고르지 않으면 코치가 이걸 키운다 — 육각형 밖(협응력 · 평형성)이면 두지 않는다
  const given = latest?.weakest?.factor;
  const weakest = isFactor(given) ? given : undefined;
  const shownFocus = focus ?? weakest ?? null;
  // 이 사람을 잰 적이 있나. 없으면 빈 육각형 대신 연령대 · 키 · 몸무게와 「아직 측정하지 않았어요」(규칙 4)
  // 안 잰 사람도 AI 단추는 둔다(9/30 시연). 지금 서버가 422 NO_MEASURED_MEMBER 로 막으면
  // 아래 알림 카드가 첫 측정으로 가는 길을 주고, 화면이 그 카드까지 내려간다
  const measured = Boolean(who.latest?.testedOn);
  const heightCm = latest?.heightCm ?? deviceBody?.heightCm;
  const weightKg = latest?.weightKg ?? deviceBody?.weightKg;
  const measureHref = `/p/${who.profileId}/measure`;

  // 대상 칩. 주소에 실어 두면 새로고침해도 그 사람이다. 아이를 고르면 홈의 아이도 같이 바꾼다(캘린더와 같다)
  const choose = (id: string) => {
    if (kids.some((k) => k.profileId === id)) setChild(id);
    setError(null);
    setExisting(false);
    setUnmeasured(false);
    router.replace(`/plan?profileId=${encodeURIComponent(id)}`, { scroll: false });
  };

  const submit = async () => {
    if (!who.profileId) return;
    setError(null);
    setExisting(false);
    setUnmeasured(false);
    try {
      const run = await start.mutateAsync({
        profileId: who.profileId,
        date: today(),
        minutes,
        quiet,
        place,
        focusFactor: focus,
        withParent,
        // ▲ 요청: 서버가 받게 되면 안 잰 아이도 이걸로 짠다(BACKEND_API)
        ...(heightCm && weightKg ? { heightCm, weightKg } : {}),
      });
      router.push(`/plan/run/${run.coachRunId}`);
    } catch (e) {
      setExisting(
        e instanceof ApiError &&
          (e.code === "RUN_IN_PROGRESS" || e.code === "ALREADY_RUN_THIS_WEEK"),
      );
      setUnmeasured(e instanceof ApiError && e.code === "NO_MEASURED_MEMBER");
      setError(
        errorMessage(
          e,
          {
            NOT_A_PARENT: "보호자만 운동을 짤 수 있어요.",
            ALREADY_RUN_THIS_WEEK: "이번 주 제안은 이미 받았어요.",
            RUN_IN_PROGRESS: "짜고 있는 제안이 있어요.",
            CONSENT_REQUIRED: "보호자 동의가 필요해요.",
            TEMPORARILY_UNAVAILABLE: "코치가 잠깐 쉬고 있어요.",
            // 지금 서버는 가족 중 잰 사람이 없으면 짜지 않는다(422) — 신체 정보로 짜 달라고 요청해 두었다
            NO_MEASURED_MEMBER: "아직 측정하지 않았어요.",
            // 심사용 계정만 하루(한국 시간)에 20번까지 짠다. 자정이 지나면 다시 센다
            TOO_MANY: "심사용 계정은 하루에 20번까지 짤 수 있어요. 내일 다시 짜 주세요.",
          },
          "운동을 짜 달라고 보내지 못했어요.",
        ),
      );
    }
  };

  return (
    <>
      <AppBar backHref={back} title="AI 운동 추천" />
      <Stage wide className="space-y-3 pb-28">
        {/* 누구 운동을 받을지. 아이 칩들 다음에 나. 고를 사람이 하나면 그리지 않는다 */}
        <ChildSwitch kids={choices} selectedId={who.profileId} onSelect={choose} />
        <section className="card-hero">
          <p className="text-lead font-extrabold">{name}의 체력</p>
          {!measured ? (
            <>
              {/* 안 쟀어도 AI 는 연령대 · 성별 · 키 · 몸무게로 짠다(9/30). 체력은 모른다 — 0점으로 그리지 않는다(규칙 10) */}
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <BodyTile label="연령대" value={who.ageGroup} />
                <BodyTile label="키" value={heightCm} unit="cm" />
                <BodyTile label="몸무게" value={weightKg} unit="kg" />
              </dl>
              <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
                {/* 글만 두지 않고 측정 전 키움이를 작게 같이 */}
                <p className="text-ink-soft flex items-center gap-2 text-sm font-bold">
                  <ArtIcon name="scene/kiumi-no-record" className="size-12" />
                  아직 측정하지 않았어요
                </p>
                {/* 만 4세 미만은 잴 수 없다 — 길을 두지 않는다(규칙 4) */}
                {who.measurable !== false && (
                  <NavLink
                    href={measureHref}
                    className="press text-signal-strong inline-flex min-h-11 items-center text-sm font-extrabold"
                  >
                    체력 측정하기
                  </NavLink>
                )}
              </div>
              {focus && (
                <p className="mt-1 text-center text-sm font-bold">
                  <span className="text-ink-soft">{FOCUS_COPY}</span>{" "}
                  <span className="text-signal-deep font-extrabold">{focus}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <FactorRadar
                points={latest?.radar}
                name={name}
                focus={shownFocus}
                legend={false}
                note={memberNoPeerNormsNote(who)}
                className="mx-auto mt-2 max-w-72"
              />
              {/* 육각형 아래 통합 신체 점수(9/25). 안 쟀으면 그리지 않는다 */}
              {who.latest?.overallPercentile != null && (
                <ScoreLine score={who.latest.overallPercentile} />
              )}
              {shownFocus && (
                <p className="mt-3 text-center text-sm font-bold">
                  <span className="text-ink-soft">{focus ? FOCUS_COPY : BAND_COPY.growth}</span>{" "}
                  <span className="text-signal-deep font-extrabold">{shownFocus}</span>
                </p>
              )}
            </>
          )}
        </section>

        {/* AI 말고 직접 — 운동 찾기에서 동작을 담아 짠다 */}
        <NavLink
          href={gathered > 0 ? "/plan/custom" : childFinderHref(who.profileId)}
          className="card press flex min-h-16 items-center gap-3"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">직접 만들기</span>
            {gathered > 0 && (
              <span className="text-caption text-ink-soft mt-0.5 block">
                담아 둔 동작 {gathered}개
              </span>
            )}
          </span>
          <ChevronRight aria-hidden className="text-ink-soft size-5 shrink-0" />
        </NavLink>

        {/* 고르는 것 넷은 한 카드 안에 선으로 — 같은 무게의 카드 넷을 줄줄이 세우지 않는다(9/30 점검 · AGENTS 「피할 목록」) */}
        <section className="card divide-rows py-1">
          <div className="py-3.5">
            <CardHead
              title="몇 분 할까요"
              meta={
                <NavLink
                  href="/settings/schedule"
                  className="press text-signal-deep inline-flex min-h-11 items-center font-bold"
                >
                  {todaySlot
                    ? `오늘은 ${todaySlot.minutes}분으로 적어 뒀어요. 바꾸기`
                    : "운동 루틴 적기"}
                </NavLink>
              }
            />
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="운동 시간">
              {MINUTES.map((m) => (
                <Chip key={m} on={minutes === m} onClick={() => setPicked(m)}>
                  {m}분
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-3 py-3.5">
            <div>
              <CardHead title="어디서" />
              <div className="mt-2 flex gap-2" role="group" aria-label="어디서">
                <Chip on={place === "HOME"} onClick={() => setPlace("HOME")}>
                  집에서
                </Chip>
                <Chip on={place === "OUTDOOR"} onClick={() => setPlace("OUTDOOR")}>
                  밖에서
                </Chip>
              </div>
            </div>
            <div>
              <CardHead title="소리" />
              <div className="mt-2 flex gap-2" role="group" aria-label="소리">
                <Chip on={quiet} onClick={() => setQuiet(true)}>
                  조용히 할래요
                </Chip>
                <Chip on={!quiet} onClick={() => setQuiet(false)}>
                  상관없어요
                </Chip>
              </div>
            </div>
          </div>

          <div className="py-3.5">
            <CardHead title={FOCUS_COPY} />
            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label={FOCUS_COPY}>
              {/* 다른 고르기와 같은 칩이다. 폭을 다 채운 파랑 단추로 두었더니 아래 주 버튼과 누를 곳이 둘로 보였다 */}
              <span className="col-span-3 flex">
                <Chip on={focus === null} onClick={() => setFocus(null)}>
                  알아서 골라 주세요
                </Chip>
              </span>
              {FACTORS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={focus === f}
                  onClick={() => setFocus(f)}
                  className={cn(
                    "press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2",
                    focus === f ? "bg-signal-strong text-white" : "bg-sub",
                  )}
                >
                  <FactorIcon
                    factor={f}
                    className={cn("size-6", focus === f ? "text-white" : "text-signal-strong")}
                  />
                  <span className="text-caption font-bold">{f}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 내 운동이면 같이 할 사람을 고를 것이 없어 칸째 두지 않는다 */}
          {!forMe && (
            <div className="py-3.5">
              <CardHead title="누가 해요" />
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="누가 해요">
                <Chip on={!withParent} onClick={() => setWithParent(false)}>
                  <Named name={name} tail="혼자" spaced />
                </Chip>
                <Chip
                  on={withParent}
                  disabled={Boolean(notTogether)}
                  onClick={() => setWithParent(true)}
                >
                  <Named name={profile?.name ?? "나"} tail="도 같이" />
                </Chip>
              </div>
              {/* 같이를 못 켜는 날은 까닭과 시간표로 가는 길을 둔다 */}
              {notTogether && (
                <div className="mt-2">
                  <p className="text-caption text-ink-soft">{notTogether}</p>
                  <NavLink
                    href="/settings/schedule"
                    className="press text-signal-deep inline-flex min-h-11 items-center text-sm font-bold"
                  >
                    운동 루틴 바꾸기
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </section>
        {error && (
          <div ref={errorRef} role="alert" className="card flex items-center justify-between gap-3">
            <p className="text-signal-deep text-sm font-semibold">{error}</p>
            {existing && current?.coachRunId && (
              <NavLink
                href={
                  current.status === "RUNNING"
                    ? `/plan/run/${current.coachRunId}`
                    : `/plan/${current.coachRunId}`
                }
                className="press text-signal-strong min-h-11 shrink-0 content-center text-sm font-extrabold"
              >
                제안 보기
              </NavLink>
            )}
            {/* 만 4세 미만이면 측정 길을 두지 않는다(규칙 4) */}
            {unmeasured && who.profileId && who.measurable !== false && (
              <NavLink
                href={measureHref}
                className="press text-signal-strong min-h-11 shrink-0 content-center text-sm font-extrabold"
              >
                체력 측정하기
              </NavLink>
            )}
          </div>
        )}
      </Stage>

      {/* 아래에 붙는 한 단추. 조건을 다 내려 보고 나서 누른다 */}
      <Dock>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={start.isPending}
          className="press bg-signal-strong shadow-lift flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white disabled:opacity-100"
        >
          <ArtIcon name="icon/menu-ai" className="size-5" />
          {start.isPending ? "AI에게 보내는 중" : `AI에게 ${minutes}분 운동 받기`}
        </button>
      </Dock>
    </>
  );
}

/** 연령대 · 키 · 몸무게 한 칸. 모르면 「없어요」 로 알린다 */
function BodyTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
}) {
  // 좁은 폰(320)에서는 칸이 50px 남짓이라 「유소년」 이 「유소 / 년」 으로 꺾였다 — 글자 · 칸 여백을 줄이고 꺾지 않는다
  return (
    <div className="tile max-[359px]:px-2.5">
      <dt className="metric-label">{label}</dt>
      {/* 빈 값은 대시 대신 말로 알린다. 다른 화면의 빈 칸과 같은 「없어요」 */}
      {value != null ? (
        <dd className="metric-value text-metric mt-1 whitespace-nowrap max-[359px]:text-xl">
          {value}
          {unit && <span className="metric-unit">{unit}</span>}
        </dd>
      ) : (
        <dd className="text-caption text-faint mt-2 font-bold">없어요</dd>
      )}
    </div>
  );
}

function Chip({
  on,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn("chip press max-w-full disabled:opacity-40", on && "chip-on")}
    >
      {children}
    </button>
  );
}

/** 이름이 길면 이름만 줄이고 뒤 말(혼자 · 도 같이)은 남긴다 — 칩이 한 줄을 넘겨 화면이 옆으로 밀렸다 */
function Named({ name, tail, spaced }: { name: string; tail: string; spaced?: boolean }) {
  return (
    <span className="flex min-w-0 items-center">
      <span className="max-w-28 truncate">{name}</span>
      <span className={cn("shrink-0", spaced && "ml-1")}>{tail}</span>
    </span>
  );
}
