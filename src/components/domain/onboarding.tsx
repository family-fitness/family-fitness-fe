"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SessionError } from "@/components/app-shell/session-error";
import { ChoiceButton, WizardShell, WizardSkeleton } from "@/components/app-shell/wizard";
import { ArtIcon } from "@/components/ui/art-icon";
import { useBackSheet } from "@/components/ui/use-back-sheet";
import { Illustration } from "@/components/ui/illustration";
import { Button } from "@/components/ui/button";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { ConsentTermsSheet, TermsLink } from "@/components/domain/consent-terms-sheet";
import type { SupportMode, Weekday } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import {
  useCreateFamily,
  useCreateProfile,
  useFamilyProfiles,
  useSaveAvailability,
  useUpdateSupportMode,
} from "@/lib/api/queries";
import { bodyError, bodyValue, rangeHint } from "@/lib/body";
import { errorMessage } from "@/lib/errors";
import { NEED_CHILD_COPY } from "@/lib/family";
import type { ConsentKind } from "@/lib/legal";
import { CREATE_AT, GUARDIAN_MIN_AGE, guardianOldEnough, onboardingSteps } from "@/lib/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";
import { useSession } from "@/lib/session";
import { ageOf, daysBefore, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";
import { useBodyStore } from "@/stores/body-store";
import { useRoleStore } from "@/stores/role-store";

/*
  첫 시작 — 가입부터 아이 등록, 참여 방식, 운동할 수 있는 시간, 첫 측정까지 한 흐름.

  묻는 것은 앱이 실제로 쓰는 것만이다.
    가족 이름, 보호자 이름, 성별(국민체력100 기준), 생년월일(또래)
    아이 이름, 생일(연령대 항목), 성별, 키, 몸무게, 보호자 동의(만 14세 미만)
    참여 방식(코치 편성), 운동할 수 있는 시간(코치 기본 시간), 첫 측정(육각형, 코치)
  「운동 수준」 처럼 앱이 쓰지 않는 것은 묻지 않는다. 사진은 설정과 가족 관리에서 올린다.

  화면 차례는 `lib/onboarding` 에 있다. 가족 화면이 먼저고 아이는 그 뒤다. 같은 사람에게 묻는 것은 한 화면에 묶었다
  (전에는 한 화면에 하나씩 열여섯 화면이었다).

  가족과 아이는 키, 몸무게 화면(CREATE_AT)을 넘길 때 함께 만든다. 그 뒤로는 앞 화면으로 되돌아가지 않는다(두 번 만들지 않게).
  아이를 만들면 주소에 `?child=` 를 남겨, 새로고침하면 그 아이로 다음 화면부터 이어 간다.
  가족이 이미 있는데 가족 만들기가 처음부터 뜨면(새로고침) 아이가 있는지 보고 홈이나 아이 등록으로 보낸다.
*/

/** 아이 생일은 만 19세 아래까지 — 1990년생이 「아이」 로 들어가 동의 칸 없이 지나가지 않게 */
const KID_OLDEST = () => daysBefore(365 * 19 + 5);

const DAYS: { code: Weekday; label: string }[] = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
];
const STARTS = [
  { value: "16:00", label: "오후 4시" },
  { value: "18:00", label: "오후 6시" },
  { value: "20:00", label: "저녁 8시" },
];
const MINUTES = [10, 20, 30] as const;

const SUPPORT: { value: SupportMode; title: string; art: string }[] = [
  {
    value: "CHEER_ONLY",
    title: "응원할게요",
    art: "icon/mode-cheer",
  },
  {
    value: "WEEKEND",
    title: "주말에는 같이",
    art: "icon/mode-weekend",
  },
  { value: "FULL", title: "매번 같이", art: "icon/mode-full" },
];

export function Onboarding({ mode }: { mode: "family" | "child" }) {
  const router = useRouter();
  const {
    familyId,
    profile,
    nextStep,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  const setBody = useBodyStore((s) => s.set);
  const roleMode = useRoleStore((s) => s.mode);
  const setMode = useRoleStore((s) => s.setMode);
  const setChild = useRoleStore((s) => s.setChild);
  // 새로고침 전에 만든 아이 — 이 아이로 이어 간다
  const resume = useSearchParams().get("child");

  // ─ 보호자
  const [familyName, setFamilyName] = useState("");
  const [meName, setMeName] = useState("");
  const [meSex, setMeSex] = useState<"F" | "M" | null>(null);
  const [meBirth, setMeBirth] = useState("");
  // ─ 아이
  const [kidName, setKidName] = useState("");
  const [kidBirth, setKidBirth] = useState("");
  const [kidSex, setKidSex] = useState<"F" | "M" | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [consent, setConsent] = useState({ personalData: false, healthData: false });
  // 동의 상세내용 — 시트로, 뒤로 가기를 눌러도 이 화면에 남는다(9/28)
  const terms = useBackSheet<ConsentKind>();
  // 서버가 동의를 요구하면(만 14세 생일 앞뒤로 날짜 셈이 다를 때) 동의 칸을 연다
  const [forceConsent, setForceConsent] = useState(false);
  // ─ 함께, 시간
  const [support, setSupport] = useState<SupportMode | null>(null);
  const [days, setDays] = useState<Weekday[]>(["TUE", "THU", "SAT"]);
  const [start, setStart] = useState("18:00");
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(20);

  // ─ 만든 것
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [newFamilyId, setNewFamilyId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(resume);
  const [problem, setProblem] = useState<string | null>(null);

  const fid = newFamilyId ?? familyId ?? "";
  const { data: family, error: familyError } = useFamilyProfiles(fid || undefined);
  const childProfile = family?.profiles?.find((p) => p.profileId === childId);
  const createFamily = useCreateFamily();
  const createProfile = useCreateProfile(fid);
  const updateSupport = useUpdateSupportMode(ownerId ?? profile?.profileId ?? "", fid);
  const saveAvailability = useSaveAvailability(childId ?? "");

  const kidAge = ageOf(kidBirth);
  const needsConsent = (kidAge != null && kidAge < 14) || forceConsent;
  // 만 4세 미만은 잴 수 없다 — 「지금 잴래요」 를 내지 않는다(규칙 4). 만든 뒤에는 서버가 준 값으로
  const measurable = childProfile
    ? childProfile.measurable !== false
    : kidAge == null || kidAge >= 4;
  const kid = kidName.trim() || childProfile?.name || "아이";
  /*
    참여 방식을 묻는가. 첫 시작은 늘 묻는다. 아이 더하기는 보호자가 아직 안 골랐을 때만 묻는다
    (가족을 만든 뒤 아이 전에 멈춘 가족). 한 번 정하면 그대로 둔다 — 고른 뒤 /me 가 다시 오면 칸이 빠졌다
  */
  const [askSupport, setAskSupport] = useState<boolean | null>(null);
  // 누구인지 받은 뒤에 정한다 — /me 가 먼저 실패하면 「안 묻기」 로 굳어 다시 불러온 뒤에도 묻지 않았다
  if (askSupport === null && profile) {
    setAskSupport(mode === "child" && profile.role === "PARENT" && profile.supportMode == null);
  }
  const asksSupport = mode === "family" || askSupport === true;

  const steps = onboardingSteps(mode);

  // 새로고침 전에 아이를 만들었으면 그다음 화면부터
  const [at, setAt] = useState(() => (resume ? Math.max(0, steps.indexOf("together")) : 0));
  const step: OnboardingStep = steps[Math.min(at, steps.length - 1)];
  const go = (d: number) => {
    setProblem(null);
    setAt((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
  };
  // 가족, 아이를 만든 뒤에는 그 앞으로 돌아가지 않는다(두 번 만들지 않게). 아이만 못 만들었으면 아이 화면까지는 고친다
  const firstEditable = childId
    ? steps.indexOf("together")
    : ownerId && mode === "family"
      ? steps.indexOf("kid")
      : 0;
  // 첫 화면에서는 들어온 곳으로 — 홈 화면에 얹은 앱에는 브라우저 뒤로가 없다
  // 아이가 한 명도 없는 가족은 홈이 닫혀 있다(ChildRequired) — 첫 화면의 뒤로는 설정(로그아웃)으로 보낸다
  const noChildYet =
    mode === "child" &&
    roleMode !== "kid" &&
    family != null &&
    !family.profiles?.some((p) => p.role === "CHILD");
  const exit = () =>
    router.replace(
      noChildYet ? "/settings" : mode === "child" && roleMode !== "kid" ? "/parent" : "/start",
    );
  const back =
    step === "done"
      ? undefined
      : at > firstEditable
        ? () => go(-1)
        : at === 0 && !childId
          ? exit
          : undefined;

  // 가족이 이미 있는데 가족 만들기가 처음부터 떴다 — 새로고침이다. 다시 만들면 「이미 가족이 있어요」 에 갇힌다
  const hadFamily =
    mode === "family" &&
    !resume &&
    !ownerId &&
    !createFamily.isPending &&
    !createFamily.isSuccess &&
    Boolean(familyId) &&
    nextStep !== "CREATE_FAMILY";
  useEffect(() => {
    if (!hadFamily) return;
    // 가족을 못 받으면 홈으로 — 홈이 다시 불러오기를 준다(여기서 기다리면 뼈대만 남았다)
    if (familyError) {
      router.replace("/parent");
      return;
    }
    if (!family) return;
    // 아이가 있으면 홈, 없으면 아이 등록부터 — 참여 방식은 아이 다음 차례라 여기서 가로채지 않는다
    router.replace(family.profiles?.some((p) => p.role === "CHILD") ? "/parent" : "/start/child");
  }, [hadFamily, family, familyError, router]);

  const busy =
    createFamily.isPending ||
    createProfile.isPending ||
    updateSupport.isPending ||
    saveAvailability.isPending;

  /** 키, 몸무게 화면을 넘길 때 아이보다 먼저 — 가족과 보호자 프로필을 만든다 */
  const makeFamily = async () => {
    if (mode !== "family" || ownerId || newFamilyId) return true;
    try {
      const res = await createFamily.mutateAsync({
        familyName: familyName.trim(),
        owner: { name: meName.trim(), birthDate: meBirth, sex: meSex ?? "F" },
      });
      setOwnerId(res.ownerProfile?.profileId ?? null);
      setNewFamilyId(res.familyId ?? null);
      setMode("parent");
      return true;
    } catch (e) {
      // 이미 가족이 있다 — 홈으로 보낸다. 여기 남겨 두면 앞으로도 뒤로도 못 간다
      if (e instanceof ApiError && e.code === "ALREADY_IN_FAMILY") {
        router.replace("/parent");
        return false;
      }
      // 만 14세 미만은 가족을 만들 수 없다 — 서버가 UNDER_14_NOT_ALLOWED 로 막는다. 생년월일은 가족 화면에 있다
      if (e instanceof ApiError && e.code === "UNDER_14_NOT_ALLOWED") {
        setAt(steps.indexOf("family"));
        setProblem("가족은 만 14세부터 만들 수 있어요. 생년월일을 확인해 주세요.");
        return false;
      }
      setProblem(errorMessage(e, "가족을 만들지 못했어요."));
      return false;
    }
  };

  /** 키, 몸무게 화면을 넘길 때 가족 다음에 — 아이 프로필을 만든다 */
  const makeChild = async () => {
    if (childId !== null) return true;
    try {
      const created = await createProfile.mutateAsync({
        name: kidName.trim(),
        birthDate: kidBirth,
        sex: kidSex ?? "F",
        role: "CHILD",
        // 만 14세 미만은 동의가 있어야 저장된다. 서버가 자동으로 찍지 않는다
        ...(needsConsent ? { guardianConsent: consent } : {}),
      });
      const id = created.profileId ?? "";
      setChildId(id);
      setChild(id || null);
      setMode("parent");
      // 새로고침해도 이 아이로 이어 가게 — 처음부터 다시 적으면 아이가 둘이 된다
      if (id) window.history.replaceState(null, "", `?child=${encodeURIComponent(id)}`);
      // 이 기기에만 두는 것(키, 몸무게)은 따로 — 저장소가 가득 차 못 적어도 아이는 이미 만들어졌다
      try {
        // 서버가 키, 몸무게를 따로 받지 못한다 — 첫 측정 때 같이 보낸다(BACKEND_ASKS)
        setBody(id, {
          heightCm: bodyValue("heightCm", height) ?? 0,
          weightKg: bodyValue("weightKg", weight) ?? 0,
          measuredOn: today(),
        });
      } catch {
        // 키, 몸무게는 첫 측정 화면에서 다시
      }
      return true;
    } catch (e) {
      // 서버가 동의를 요구한다 — 같은 화면에 동의 칸을 연다(만 14세 생일 앞뒤로 날짜 셈이 다를 수 있다)
      if (e instanceof ApiError && e.code === "CONSENT_REQUIRED" && !needsConsent) {
        setForceConsent(true);
        setProblem("만 14세 미만은 보호자 동의가 있어야 해요.");
        return false;
      }
      setProblem(
        errorMessage(
          e,
          {
            CONSENT_REQUIRED: "만 14세 미만은 보호자 동의가 있어야 해요.",
            NOT_A_PARENT: "아이 등록은 보호자 계정에서 할 수 있어요.",
          },
          "아이를 등록하지 못했어요.",
        ),
      );
      return false;
    }
  };

  /** 마지막 화면 — 지금 재면 측정 화면으로, 아니면 홈으로 */
  const finish = (measureNow: boolean) => {
    if (measureNow && childId) {
      // 첫 시작에서 온 측정 — 뒤로 가 돌아올 곳이 없다(여기까지 전부 바꿔치기). 뒤로는 홈으로
      router.replace(`/p/${childId}/measure?from=start`);
      return;
    }
    router.replace("/parent");
  };

  const next = async () => {
    setProblem(null);
    if (step === CREATE_AT && !((await makeFamily()) && (await makeChild()))) return;
    if (step === "together") {
      if (asksSupport && support) {
        try {
          await updateSupport.mutateAsync(support);
        } catch (e) {
          setProblem(errorMessage(e, "참여 방식을 저장하지 못했어요."));
          return;
        }
      }
      if (childId) {
        const order = DAYS.map((d) => d.code);
        // ▲ 서버에 아직 없는 주소다(BACKEND_ASKS). 못 적어도 가입은 이어 간다 — 여기서 막으면
        // 가족, 아이를 다 만든 사람이 이 화면에 갇힌다. 운동 시간은 설정에서 다시 적는다
        await saveAvailability
          .mutateAsync(
            [...days]
              .sort((a, b) => order.indexOf(a) - order.indexOf(b))
              .map((day) => ({ day, start, minutes })),
          )
          .catch(() => undefined);
      }
    }
    if (step === "done") {
      finish(measurable);
      return;
    }
    go(1);
  };

  // 다음으로 갈 수 있나 — 화면마다
  const text = (v: string) => v.trim().length >= 1 && v.trim().length <= 20;
  const meBirthOk = meBirth !== "" && meBirth <= today();
  const ok: Record<OnboardingStep, boolean> = {
    family:
      text(familyName) && text(meName) && meSex != null && meBirthOk && guardianOldEnough(meBirth),
    kid:
      text(kidName) &&
      kidBirth !== "" &&
      kidBirth <= today() &&
      kidBirth >= KID_OLDEST() &&
      kidSex != null,
    "kid-body":
      bodyValue("heightCm", height) != null &&
      bodyValue("weightKg", weight) != null &&
      (!needsConsent || (consent.personalData && consent.healthData)),
    together: days.length > 0 && (!asksSupport || support != null),
    done: true,
  };

  // 못 한 까닭은 단추 바로 위에 글자로 — 떠 있는 둥근 면에 넣지 않는다
  const problemLine = problem && (
    <p role="alert" className="text-signal-deep mb-2 text-center text-sm font-semibold">
      {problem}
    </p>
  );
  const action =
    step === "done" ? (
      <>
        {problemLine}
        <Button type="submit" size="block" loading={busy}>
          {measurable ? "지금 잴래요" : "시작하기"}
        </Button>
        {measurable && (
          <Button
            type="button"
            variant="outline"
            size="block"
            className="mt-2"
            onClick={() => finish(false)}
          >
            나중에 할게요
          </Button>
        )}
      </>
    ) : (
      <>
        {problemLine}
        <Button type="submit" size="block" disabled={!ok[step]} loading={busy}>
          다음
        </Button>
      </>
    );
  const submit = () => {
    if (ok[step] && !busy) void next();
  };

  const common = { step: at, total: steps.length, onBack: back, action, onSubmit: submit };

  // 누구인지 못 받으면 가족이 있는지 모른다 — 모르는 채 만들기 시작하면 끝에서 막힌다
  if (sessionError) {
    return <SessionError error={sessionError} onRetry={() => void refetchMe()} />;
  }
  // 세션을 기다리는 동안, 이미 가족이 있어 다른 곳으로 보내는 동안. 아이 더하기도 세션을 기다린다 —
  // 참여 방식을 물을지는 나(/me)를 받아야 안다
  if (sessionPending || (mode === "family" && hadFamily)) return <WizardSkeleton />;

  switch (step) {
    case "family":
      return (
        <WizardShell
          {...common}
          art={<Illustration name="scene/kiumi-hello" size={112} priority />}
          title={
            <>
              안녕하세요! 저는 키움이에요
              <br />
              우리 가족을 알려 주세요
            </>
          }
        >
          <div className="space-y-5">
            <Field label="가족 이름">
              <BigInput
                label="가족 이름"
                value={familyName}
                onChange={setFamilyName}
                placeholder="서준이네"
                autoFocus
              />
            </Field>
            <Field label="보호자님 이름">
              <BigInput
                label="보호자 이름"
                value={meName}
                onChange={setMeName}
                placeholder="은영"
              />
            </Field>
            <Field label="보호자님 성별" as="div">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="보호자 성별">
                <ChoiceButton selected={meSex === "F"} onClick={() => setMeSex("F")} title="여성" />
                <ChoiceButton selected={meSex === "M"} onClick={() => setMeSex("M")} title="남성" />
              </div>
            </Field>
            <Field
              label="보호자님 생년월일"
              problem={
                meBirthOk && !guardianOldEnough(meBirth)
                  ? `가족은 만 ${GUARDIAN_MIN_AGE}세부터 만들 수 있어요`
                  : null
              }
            >
              <DateInput label="보호자 생년월일" value={meBirth} onChange={setMeBirth} />
            </Field>
          </div>
        </WizardShell>
      );
    case "kid":
      return (
        <WizardShell {...common} title="아이를 알려 주세요">
          {/* 아이 없는 가족이 앱 화면에서 여기로 왔다 — 왜 왔는지 한 줄로 */}
          {noChildYet && (
            <p role="status" className="text-ink-soft mb-4 text-sm font-semibold">
              {NEED_CHILD_COPY}
            </p>
          )}
          <div className="space-y-5">
            <Field label="아이 이름">
              <BigInput
                label="아이 이름"
                value={kidName}
                onChange={setKidName}
                placeholder="서준"
                autoFocus
              />
            </Field>
            <Field label="생일">
              <DateInput
                label="아이 생일"
                value={kidBirth}
                onChange={setKidBirth}
                min={KID_OLDEST()}
              />
            </Field>
            <Field label="성별" as="div">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="아이 성별">
                <ChoiceButton
                  selected={kidSex === "F"}
                  onClick={() => setKidSex("F")}
                  title="여자아이"
                />
                <ChoiceButton
                  selected={kidSex === "M"}
                  onClick={() => setKidSex("M")}
                  title="남자아이"
                />
              </div>
            </Field>
          </div>
        </WizardShell>
      );
    case "kid-body":
      return (
        <WizardShell {...common} title={`${withJosa(kid, "은는")} 지금 얼마나 컸나요?`}>
          <div className="space-y-4">
            <UnitInput
              label="키"
              unit="cm"
              value={height}
              onChange={setHeight}
              placeholder="138"
              hint={rangeHint("heightCm")}
              problem={bodyError("heightCm", height)}
            />
            <UnitInput
              label="몸무게"
              unit="kg"
              value={weight}
              onChange={setWeight}
              placeholder="34"
              hint={rangeHint("weightKg")}
              problem={bodyError("weightKg", weight)}
            />
          </div>
          {needsConsent && (
            <fieldset className="mt-7">
              <legend className="text-ink-soft text-sm font-bold">보호자 동의가 필요해요</legend>
              <div className="mt-2 space-y-2">
                <div>
                  <ChoiceButton
                    multi
                    selected={consent.personalData}
                    onClick={() => setConsent((c) => ({ ...c, personalData: !c.personalData }))}
                    title="개인정보 처리에 동의해요"
                  />
                  <div className="flex">
                    <TermsLink label="개인정보 처리" onClick={() => terms.show("personal")} />
                  </div>
                </div>
                <div>
                  <ChoiceButton
                    multi
                    selected={consent.healthData}
                    onClick={() => setConsent((c) => ({ ...c, healthData: !c.healthData }))}
                    title="건강정보 처리에 동의해요"
                  />
                  <div className="flex">
                    <TermsLink label="건강정보 처리" onClick={() => terms.show("health")} />
                  </div>
                </div>
              </div>
              <ConsentTermsSheet kind={terms.value} open={terms.open} onClose={terms.hide} />
            </fieldset>
          )}
        </WizardShell>
      );
    case "together":
      return (
        <WizardShell {...common} title={`${withJosa(kid, "은는")} 언제 운동할 수 있어요?`}>
          <div className="space-y-6">
            <fieldset>
              <legend className="text-ink-soft text-sm font-bold">요일</legend>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {DAYS.map((d) => {
                  const on = days.includes(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setDays((all) => (on ? all.filter((x) => x !== d.code) : [...all, d.code]))
                      }
                      className={cn(
                        "press grid min-h-12 place-items-center rounded-2xl text-base font-extrabold",
                        on ? "bg-signal-strong text-white" : "bg-paper shadow-card",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-ink-soft text-sm font-bold">몇 시쯤</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {STARTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={start === s.value}
                    onClick={() => setStart(s.value)}
                    className={cn(
                      "press min-h-12 rounded-2xl text-sm font-extrabold",
                      start === s.value ? "bg-signal-strong text-white" : "bg-paper shadow-card",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-ink-soft text-sm font-bold">한 번에</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={minutes === m}
                    onClick={() => setMinutes(m)}
                    className={cn(
                      "press min-h-12 rounded-2xl text-sm font-extrabold",
                      minutes === m ? "bg-signal-strong text-white" : "bg-paper shadow-card",
                    )}
                  >
                    {m}분
                  </button>
                ))}
              </div>
            </fieldset>
            {asksSupport && (
              <fieldset>
                <legend className="text-ink-soft text-sm font-bold">
                  보호자님은 얼마나 같이 하실래요?
                </legend>
                <div className="mt-2 space-y-2" role="radiogroup" aria-label="참여 방식">
                  {SUPPORT.map((s) => (
                    <ChoiceButton
                      key={s.value}
                      selected={support === s.value}
                      onClick={() => setSupport(s.value)}
                      title={s.title}
                      art={<ArtIcon name={s.art} className="size-9" />}
                    />
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </WizardShell>
      );
    case "done":
      return (
        <WizardShell
          {...common}
          art={<LevelBuddy stage={3} size={168} cheer />}
          title="준비됐어요!"
        >
          {measurable && (
            <p className="text-ink-soft text-base font-bold">{`지금 ${kid} 체력을 재 볼까요?`}</p>
          )}
        </WizardShell>
      );
  }
}

/** 이름이 보이는 입력 한 칸 — 한 화면에 여러 칸이 서니 칸마다 무엇인지 적는다 */
function Field({
  label,
  children,
  problem,
  as = "label",
}: {
  label: string;
  children: ReactNode;
  /** 넘어가지 못하는 까닭 한 줄 */
  problem?: string | null;
  /** 단추 묶음은 label 로 감싸지 않는다(누르면 첫 단추가 눌린다) */
  as?: "label" | "div";
}) {
  const Tag = as;
  return (
    <Tag className="block">
      <span className="text-ink-soft block text-sm font-bold">{label}</span>
      {as === "div" ? (
        <div className="mt-1.5">{children}</div>
      ) : (
        <span className="mt-1.5 block">{children}</span>
      )}
      {problem && (
        <span role="alert" className="text-caption text-signal-deep mt-1 block font-bold">
          {problem}
        </span>
      )}
    </Tag>
  );
}

/** 큰 글자 입력 한 칸 */
function BigInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** 화면의 첫 칸만 — 여러 칸이 다 잡으면 마지막 칸에 커서가 간다 */
  autoFocus?: boolean;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 20))}
      placeholder={placeholder}
      autoFocus={autoFocus}
      enterKeyHint="next"
      className="field text-xl font-bold"
    />
  );
}

/** 날짜 한 칸 — 폰의 날짜 고르기가 열린다 */
function DateInput({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      min={min}
      max={today()}
      onChange={(e) => onChange(e.target.value)}
      className="field text-xl font-bold"
    />
  );
}

/** 단위가 붙은 숫자 칸 — 키 · 몸무게 */
function UnitInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
  hint,
  problem,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
  /** 범위를 벗어나면 까닭 한 줄 — 「다음」 이 왜 안 눌리는지 */
  problem: string | null;
}) {
  return (
    <label className="block">
      <span className="text-ink-soft text-sm font-bold">{label}</span>
      <span className="relative mt-1.5 flex items-center">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          aria-label={label}
          aria-invalid={problem != null}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="next"
          className="field pr-14 text-xl font-bold"
        />
        <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-base font-bold">
          {unit}
        </span>
      </span>
      <span
        className={cn(
          "text-caption mt-1 block",
          problem ? "text-signal-deep font-bold" : "text-faint",
        )}
      >
        {problem ?? hint}
      </span>
    </label>
  );
}
