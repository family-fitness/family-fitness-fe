"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChoiceButton, WizardShell, WizardSkeleton } from "@/components/app-shell/wizard";
import { ArtIcon } from "@/components/ui/art-icon";
import { Illustration } from "@/components/ui/illustration";
import { Button } from "@/components/ui/button";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { PhotoPicker } from "@/components/domain/photo-picker";
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
import { useSession } from "@/lib/session";
import { ageOf, daysBefore, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";
import { useBodyStore } from "@/stores/body-store";
import { usePhotoStore } from "@/stores/photo-store";
import { useRoleStore } from "@/stores/role-store";

/*
  첫 시작 — 가입부터 아이 등록 · 참여 방식 · 운동할 수 있는 시간 · 첫 측정까지 한 흐름(9/25).

  「이름 나이 몸무게 키 말고도 좀 물어보는 식으로 최소한 앱 구동을 위한 최소치를 받았으면 · 진행 게이지도」.
  한 화면에 질문 하나, 위에 게이지. 묻는 것은 **앱이 실제로 쓰는 것만**이다 —
    가족 이름 · 보호자 이름 · 성별(국민체력100 기준 · 엄마/아빠 부름) · 생년월일(또래)
    아이 이름 · 생일(연령대 항목) · 성별 · 키 · 몸무게 · 보호자 동의(만 14세 미만)
    참여 방식(코치 편성) · 운동할 수 있는 시간(코치 기본 시간) · 첫 측정(육각형 · 코치)
    프로필 사진(선택, 이 기기에만)
  「운동 수준」 처럼 앱이 쓰지 않는 것은 묻지 않는다.

  가족은 보호자 사진 칸을 지날 때 만들고, 아이는 동의(또는 사진) 칸을 지날 때 만든다 — 그 뒤로는 앞 칸으로
  되돌아가지 않는다(두 번 만들지 않게).

  새로고침(사진을 고르는 사이 폰이 탭을 내리는 것 포함)해도 두 번 만들지 않는다 —
    가족이 이미 있으면 아이가 있는지 보고 홈이나 아이 등록으로 보낸다(다시 만들면 「이미 가족이 있어요」 에 갇혔다)
    아이를 만들면 주소에 `?child=` 를 남겨, 새로고침하면 그 아이로 다음 칸부터 이어 간다
*/

/** 아이 생일은 만 19세 아래까지 — 1990년생이 「아이」 로 들어가 동의 칸 없이 지나가지 않게 */
const KID_OLDEST = () => daysBefore(365 * 19 + 5);

type StepId =
  | "hello"
  | "family"
  | "me-name"
  | "me-sex"
  | "me-birth"
  | "me-photo"
  | "kid-name"
  | "kid-birth"
  | "kid-sex"
  | "kid-body"
  | "kid-photo"
  | "consent"
  | "support"
  | "schedule"
  | "measure"
  | "done";

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
  const { familyId, profile, nextStep, isPending: sessionPending } = useSession();
  const setBody = useBodyStore((s) => s.set);
  const setPhoto = usePhotoStore((s) => s.set);
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
  const [mePhoto, setMePhoto] = useState<string | null>(null);
  // ─ 아이
  const [kidName, setKidName] = useState("");
  const [kidBirth, setKidBirth] = useState("");
  const [kidSex, setKidSex] = useState<"F" | "M" | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [kidPhoto, setKidPhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState({ personalData: false, healthData: false });
  // 서버가 동의를 요구하면(만 14세 생일 앞뒤로 날짜 셈이 다를 때) 동의 칸을 넣는다
  const [forceConsent, setForceConsent] = useState(false);
  // ─ 함께 · 시간
  const [support, setSupport] = useState<SupportMode | null>(null);
  const [days, setDays] = useState<Weekday[]>(["TUE", "THU", "SAT"]);
  const [start, setStart] = useState("18:00");
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(20);
  const [later, setLater] = useState<boolean | null>(null);

  // ─ 만든 것
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [newFamilyId, setNewFamilyId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(resume);
  const [problem, setProblem] = useState<string | null>(null);

  const fid = newFamilyId ?? familyId ?? "";
  const { data: family } = useFamilyProfiles(fid || undefined);
  const childProfile = family?.profiles?.find((p) => p.profileId === childId);
  const createFamily = useCreateFamily();
  const createProfile = useCreateProfile(fid);
  const updateSupport = useUpdateSupportMode(ownerId ?? profile?.profileId ?? "", fid);
  const saveAvailability = useSaveAvailability(childId ?? "");

  const kidAge = ageOf(kidBirth);
  const needsConsent = (kidAge != null && kidAge < 14) || forceConsent;
  // 만 4세 미만은 잴 수 없다 — 측정 칸을 건너뛴다(규칙 4). 만든 뒤에는 서버가 준 값으로
  const measurable = childProfile
    ? childProfile.measurable !== false
    : kidAge == null || kidAge >= 4;
  const kid = kidName.trim() || childProfile?.name || "아이";

  const steps: StepId[] = (
    mode === "family"
      ? [
          "hello",
          "family",
          "me-name",
          "me-sex",
          "me-birth",
          "me-photo",
          "kid-name",
          "kid-birth",
          "kid-sex",
          "kid-body",
          "kid-photo",
          "consent",
          "support",
          "schedule",
          "measure",
          "done",
        ]
      : [
          "kid-name",
          "kid-birth",
          "kid-sex",
          "kid-body",
          "kid-photo",
          "consent",
          "schedule",
          "measure",
          "done",
        ]
  ).filter((s) => (s !== "consent" || needsConsent) && (s !== "measure" || measurable)) as StepId[];

  // 새로고침 전에 아이를 만들었으면 그다음 칸부터
  const [at, setAt] = useState(() =>
    resume ? Math.max(0, steps.indexOf(mode === "family" ? "support" : "schedule")) : 0,
  );
  const step = steps[Math.min(at, steps.length - 1)];
  const go = (d: number) => {
    setProblem(null);
    setAt((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
  };
  // 가족 · 아이를 만든 뒤에는 그 앞으로 돌아가지 않는다(두 번 만들지 않게)
  const firstEditable = childId
    ? steps.indexOf("kid-photo") + (needsConsent ? 2 : 1)
    : ownerId && mode === "family"
      ? steps.indexOf("kid-name")
      : 0;
  // 첫 칸에서는 들어온 곳으로 — 홈 화면에 얹은 앱에는 브라우저 뒤로가 없다
  const exit = () => router.replace(mode === "child" && roleMode !== "kid" ? "/parent" : "/start");
  const back = at > firstEditable ? () => go(-1) : at === 0 && !childId ? exit : undefined;

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
    if (!hadFamily || !family) return;
    // 아이가 있으면 홈, 없으면 아이 등록부터
    router.replace(family.profiles?.some((p) => p.role === "CHILD") ? "/parent" : "/start/child");
  }, [hadFamily, family, router]);

  const busy =
    createFamily.isPending ||
    createProfile.isPending ||
    updateSupport.isPending ||
    saveAvailability.isPending;

  /** 보호자 사진 칸을 지날 때 — 가족과 보호자 프로필을 만든다 */
  const makeFamily = async () => {
    if (ownerId || newFamilyId) return true;
    try {
      const res = await createFamily.mutateAsync({
        familyName: familyName.trim(),
        owner: { name: meName.trim(), birthDate: meBirth, sex: meSex ?? "F" },
      });
      const id = res.ownerProfile?.profileId ?? null;
      setOwnerId(id);
      setNewFamilyId(res.familyId ?? null);
      setMode("parent");
      // 이 기기에만 두는 사진은 따로 — 저장소가 가득 차 못 적어도 가족은 이미 만들어졌다
      try {
        if (id && mePhoto) setPhoto(id, mePhoto);
      } catch {
        // 사진은 설정에서 다시 올린다
      }
      return true;
    } catch (e) {
      // 이미 가족이 있다 — 홈으로 보낸다. 여기 남겨 두면 앞으로도 뒤로도 못 간다
      if (e instanceof ApiError && e.code === "ALREADY_IN_FAMILY") {
        router.replace("/parent");
        return false;
      }
      setProblem(errorMessage(e, "가족을 만들지 못했어요. 잠시 후 다시 해 주세요."));
      return false;
    }
  };

  /** 아이 정보의 마지막 칸을 지날 때 — 아이 프로필을 만든다 */
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
      // 이 기기에만 두는 것(키 · 몸무게 · 사진)은 따로 — 저장소가 가득 차 못 적어도 아이는 이미 만들어졌다
      try {
        // 서버가 키 · 몸무게를 따로 받지 못한다 — 첫 측정 때 같이 보낸다(BACKEND_ASKS)
        setBody(id, {
          heightCm: bodyValue("heightCm", height) ?? 0,
          weightKg: bodyValue("weightKg", weight) ?? 0,
          measuredOn: today(),
        });
        if (kidPhoto) setPhoto(id, kidPhoto);
      } catch {
        // 키 · 몸무게는 첫 측정 화면에서, 사진은 가족 관리에서 다시
      }
      return true;
    } catch (e) {
      // 서버가 동의를 요구한다 — 동의 칸을 넣고 그리로(만 14세 생일 앞뒤로 날짜 셈이 다를 수 있다)
      if (e instanceof ApiError && e.code === "CONSENT_REQUIRED" && !needsConsent) {
        setForceConsent(true);
        setAt((i) => i + 1);
        return false;
      }
      setProblem(
        errorMessage(
          e,
          {
            CONSENT_REQUIRED: "만 14세 미만은 보호자 동의가 있어야 해요.",
            NOT_A_PARENT: "아이 등록은 보호자 계정에서 할 수 있어요.",
          },
          "아이를 등록하지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
      return false;
    }
  };

  const next = async () => {
    setProblem(null);
    if (step === "me-photo" && !(await makeFamily())) return;
    // 동의가 필요 없으면 사진 칸, 필요하면 동의 칸이 아이 정보의 마지막이다
    if ((step === "consent" || (step === "kid-photo" && !needsConsent)) && !(await makeChild()))
      return;
    if (step === "support" && support) {
      try {
        await updateSupport.mutateAsync(support);
      } catch (e) {
        setProblem(errorMessage(e, "참여 방식을 저장하지 못했어요. 잠시 후 다시 해 주세요."));
        return;
      }
    }
    if (step === "schedule" && childId) {
      const order = DAYS.map((d) => d.code);
      // ▲ 서버에 아직 없는 주소다(BACKEND_ASKS). 못 적어도 가입은 이어 간다 — 여기서 막으면
      // 가족 · 아이를 다 만든 사람이 이 칸에 갇힌다. 운동 시간은 설정에서 다시 적는다
      await saveAvailability
        .mutateAsync(
          [...days]
            .sort((a, b) => order.indexOf(a) - order.indexOf(b))
            .map((day) => ({ day, start, minutes })),
        )
        .catch(() => undefined);
    }
    if (step === "measure" && later === false && childId) {
      // 첫 시작에서 온 측정 — 뒤로 가 돌아올 곳이 없다(여기까지 전부 바꿔치기). 뒤로는 홈으로
      router.replace(`/p/${childId}/measure?from=start`);
      return;
    }
    if (step === "done") {
      router.replace("/parent");
      return;
    }
    go(1);
  };

  // 다음으로 갈 수 있나 — 칸마다
  const text = (v: string) => v.trim().length >= 1 && v.trim().length <= 20;
  const ok: Record<StepId, boolean> = {
    hello: true,
    family: text(familyName),
    "me-name": text(meName),
    "me-sex": meSex != null,
    "me-birth": meBirth !== "" && meBirth <= today(),
    "me-photo": true,
    "kid-name": text(kidName),
    "kid-birth": kidBirth !== "" && kidBirth <= today() && kidBirth >= KID_OLDEST(),
    "kid-sex": kidSex != null,
    "kid-body": bodyValue("heightCm", height) != null && bodyValue("weightKg", weight) != null,
    "kid-photo": true,
    consent: consent.personalData && consent.healthData,
    support: support != null,
    schedule: days.length > 0,
    measure: later != null,
    done: true,
  };

  const skipPhoto = (step === "me-photo" && !mePhoto) || (step === "kid-photo" && !kidPhoto);
  const action = (
    <Button type="submit" size="block" disabled={!ok[step]} loading={busy}>
      {step === "hello" ? "좋아요" : step === "done" ? "시작하기" : skipPhoto ? "건너뛰기" : "다음"}
    </Button>
  );
  const submit = () => {
    if (ok[step] && !busy) void next();
  };

  const common = { step: at, total: steps.length, onBack: back, action, onSubmit: submit };

  // 세션을 기다리는 동안 · 이미 가족이 있어 다른 곳으로 보내는 동안
  if (mode === "family" && (sessionPending || hadFamily)) return <WizardSkeleton />;

  const body = (() => {
    switch (step) {
      case "hello":
        return (
          <WizardShell
            {...common}
            art={<Illustration name="scene/kiumi-hello" size={200} priority />}
            title="안녕하세요! 저는 키움이에요"
          />
        );
      case "family":
        return (
          <WizardShell {...common} title="가족 이름을 정해 주세요">
            <BigInput
              label="가족 이름"
              value={familyName}
              onChange={setFamilyName}
              placeholder="서준이네"
            />
          </WizardShell>
        );
      case "me-name":
        return (
          <WizardShell {...common} title="보호자님 이름을 알려 주세요">
            <BigInput label="보호자 이름" value={meName} onChange={setMeName} placeholder="은영" />
          </WizardShell>
        );
      case "me-sex":
        return (
          <WizardShell {...common} title="보호자님의 성별을 알려 주세요">
            <div className="space-y-3" role="radiogroup" aria-label="보호자 성별">
              <ChoiceButton selected={meSex === "F"} onClick={() => setMeSex("F")} title="여성" />
              <ChoiceButton selected={meSex === "M"} onClick={() => setMeSex("M")} title="남성" />
            </div>
          </WizardShell>
        );
      case "me-birth":
        return (
          <WizardShell {...common} title="생년월일을 알려 주세요">
            <DateInput label="보호자 생년월일" value={meBirth} onChange={setMeBirth} />
          </WizardShell>
        );
      case "me-photo":
        return (
          <WizardShell {...common} title="프로필 사진을 올릴까요?">
            <PhotoPicker value={mePhoto} name={meName} onChange={setMePhoto} />
          </WizardShell>
        );
      case "kid-name":
        return (
          <WizardShell {...common} title="아이 이름을 알려 주세요">
            <BigInput label="아이 이름" value={kidName} onChange={setKidName} placeholder="서준" />
          </WizardShell>
        );
      case "kid-birth":
        return (
          <WizardShell {...common} title={`${kid}의 생일은 언제예요?`}>
            <DateInput
              label="아이 생일"
              value={kidBirth}
              onChange={setKidBirth}
              min={KID_OLDEST()}
            />
          </WizardShell>
        );
      case "kid-sex":
        return (
          <WizardShell
            {...common}
            title={`${withJosa(kid, "은는")} 여자아이인가요, 남자아이인가요?`}
          >
            <div className="space-y-3" role="radiogroup" aria-label="아이 성별">
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
          </WizardShell>
        );
      case "kid-photo":
        return (
          <WizardShell {...common} title={`${kid} 사진도 올릴까요?`}>
            <PhotoPicker value={kidPhoto} name={kidName} onChange={setKidPhoto} />
          </WizardShell>
        );
      case "consent":
        return (
          <WizardShell {...common} title="보호자 동의가 필요해요">
            <div className="space-y-3">
              <ChoiceButton
                multi
                selected={consent.personalData}
                onClick={() => setConsent((c) => ({ ...c, personalData: !c.personalData }))}
                title="개인정보 처리에 동의해요"
              />
              <ChoiceButton
                multi
                selected={consent.healthData}
                onClick={() => setConsent((c) => ({ ...c, healthData: !c.healthData }))}
                title="건강정보 처리에 동의해요"
              />
            </div>
          </WizardShell>
        );
      case "support":
        return (
          <WizardShell {...common} title="얼마나 같이 하실래요?">
            <div className="space-y-3" role="radiogroup" aria-label="참여 방식">
              {SUPPORT.map((s) => (
                <ChoiceButton
                  key={s.value}
                  selected={support === s.value}
                  onClick={() => setSupport(s.value)}
                  title={s.title}
                  art={<ArtIcon name={s.art} className="size-10" />}
                />
              ))}
            </div>
          </WizardShell>
        );
      case "schedule":
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
                          setDays((all) =>
                            on ? all.filter((x) => x !== d.code) : [...all, d.code],
                          )
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
            </div>
          </WizardShell>
        );
      case "measure":
        return (
          <WizardShell {...common} title={`지금 ${kid} 체력을 재 볼까요?`}>
            <div className="space-y-3" role="radiogroup" aria-label="첫 측정">
              <ChoiceButton
                selected={later === false}
                onClick={() => setLater(false)}
                title="지금 잴래요"
                art={<ArtIcon name="icon/menu-measure" className="size-10" />}
              />
              <ChoiceButton
                selected={later === true}
                onClick={() => setLater(true)}
                title="나중에 할게요"
              />
            </div>
          </WizardShell>
        );
      case "done":
        return (
          <WizardShell
            {...common}
            onBack={undefined}
            art={<LevelBuddy stage={3} size={168} cheer />}
            title="준비됐어요!"
          />
        );
    }
  })();

  return (
    <>
      {body}
      {problem && (
        <p
          role="alert"
          className="bg-signal-soft text-signal-deep fixed inset-x-4 bottom-28 z-30 mx-auto max-w-(--width-phone) rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          {problem}
        </p>
      )}
    </>
  );
}

/** 큰 글자 입력 한 칸 */
function BigInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 20))}
      placeholder={placeholder}
      autoFocus
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
