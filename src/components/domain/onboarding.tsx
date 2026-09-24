"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChoiceButton, WizardShell } from "@/components/app-shell/wizard";
import { ArtIcon } from "@/components/ui/art-icon";
import { Illustration } from "@/components/ui/illustration";
import { Button } from "@/components/ui/button";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { PhotoPicker } from "@/components/domain/photo-picker";
import type { SupportMode, Weekday } from "@/lib/api/types";
import {
  useCreateFamily,
  useCreateProfile,
  useSaveAvailability,
  useUpdateSupportMode,
} from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { bodyValue, rangeHint } from "@/lib/body";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { ageOf, today } from "@/lib/today";
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
*/

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

const SUPPORT: { value: SupportMode; title: string; note: string; art: string }[] = [
  {
    value: "CHEER_ONLY",
    title: "응원할게요",
    note: "아이 운동을 보고 칭찬 스티커를 보내요",
    art: "icon/mode-cheer",
  },
  {
    value: "WEEKEND",
    title: "주말에는 같이",
    note: "주말 운동에 나도 들어가요",
    art: "icon/mode-weekend",
  },
  { value: "FULL", title: "매번 같이", note: "나도 재고 같이 운동해요", art: "icon/mode-full" },
];

export function Onboarding({ mode }: { mode: "family" | "child" }) {
  const router = useRouter();
  const { familyId, profile } = useSession();
  const setBody = useBodyStore((s) => s.set);
  const setPhoto = usePhotoStore((s) => s.set);
  const setMode = useRoleStore((s) => s.setMode);
  const setChild = useRoleStore((s) => s.setChild);

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
  // ─ 함께 · 시간
  const [support, setSupport] = useState<SupportMode | null>(null);
  const [days, setDays] = useState<Weekday[]>(["TUE", "THU", "SAT"]);
  const [start, setStart] = useState("18:00");
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(20);
  const [later, setLater] = useState<boolean | null>(null);

  // ─ 만든 것
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [newFamilyId, setNewFamilyId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const fid = newFamilyId ?? familyId ?? "";
  const createFamily = useCreateFamily();
  const createProfile = useCreateProfile(fid);
  const updateSupport = useUpdateSupportMode(ownerId ?? profile?.profileId ?? "", fid);
  const saveAvailability = useSaveAvailability(childId ?? "");

  const kidAge = ageOf(kidBirth);
  const needsConsent = kidAge != null && kidAge < 14;
  // 만 4세 미만은 잴 수 없다 — 측정 칸을 건너뛴다(규칙 4)
  const measurable = kidAge == null || kidAge >= 4;
  const kid = kidName.trim() || "아이";

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

  const [at, setAt] = useState(0);
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
  const back = at > firstEditable ? () => go(-1) : undefined;

  const busy =
    createFamily.isPending ||
    createProfile.isPending ||
    updateSupport.isPending ||
    saveAvailability.isPending;

  /** 보호자 사진 칸을 지날 때 — 가족과 보호자 프로필을 만든다 */
  const makeFamily = async () => {
    if (ownerId) return true;
    try {
      const res = await createFamily.mutateAsync({
        familyName: familyName.trim(),
        owner: { name: meName.trim(), birthDate: meBirth, sex: meSex ?? "F" },
      });
      const id = res.ownerProfile?.profileId ?? null;
      setOwnerId(id);
      setNewFamilyId(res.familyId ?? null);
      if (id && mePhoto) setPhoto(id, mePhoto);
      setMode("parent");
      return true;
    } catch (e) {
      setProblem(
        errorMessage(
          e,
          { ALREADY_IN_FAMILY: "이미 가족이 있는 계정이에요. 홈으로 가 주세요." },
          "가족을 만들지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
      return false;
    }
  };

  /** 아이 정보의 마지막 칸을 지날 때 — 아이 프로필을 만든다 */
  const makeChild = async () => {
    if (childId) return true;
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
      // 서버가 키 · 몸무게를 따로 받지 못한다 — 첫 측정 때 같이 보낸다(BACKEND_ASKS)
      setBody(id, {
        heightCm: bodyValue("heightCm", height) ?? 0,
        weightKg: bodyValue("weightKg", weight) ?? 0,
        measuredOn: today(),
      });
      if (kidPhoto) setPhoto(id, kidPhoto);
      setChild(id);
      setMode("parent");
      return true;
    } catch (e) {
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
    if (step === "schedule") {
      try {
        const order = DAYS.map((d) => d.code);
        await saveAvailability.mutateAsync(
          [...days]
            .sort((a, b) => order.indexOf(a) - order.indexOf(b))
            .map((day) => ({ day, start, minutes })),
        );
      } catch (e) {
        setProblem(errorMessage(e, "운동할 수 있는 시간을 저장하지 못했어요."));
        return;
      }
    }
    if (step === "measure" && later === false && childId) {
      router.replace(`/p/${childId}/measure`);
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
    "kid-birth": kidBirth !== "" && kidBirth <= today(),
    "kid-sex": kidSex != null,
    "kid-body": bodyValue("heightCm", height) != null && bodyValue("weightKg", weight) != null,
    "kid-photo": true,
    consent: consent.personalData && consent.healthData,
    support: support != null,
    schedule: days.length > 0,
    measure: later != null,
    done: true,
  };

  const action = (
    <Button size="block" disabled={!ok[step]} loading={busy} onClick={() => void next()}>
      {step === "hello" ? "좋아요" : step === "done" ? "시작하기" : "다음"}
    </Button>
  );

  const common = { step: at, total: steps.length, onBack: back, action };

  const body = (() => {
    switch (step) {
      case "hello":
        return (
          <WizardShell
            {...common}
            art={
              // 주문한 인사 그림이 오면 그것으로, 오기 전에는 레벨 캐릭터가 선다
              artFor("scene/kiumi-hello") ? (
                <Illustration name="scene/kiumi-hello" size={200} priority />
              ) : (
                <LevelBuddy stage={3} size={168} cheer />
              )
            }
            title="안녕하세요! 저는 키움이에요"
            reason="우리 가족 운동을 같이 챙길게요. 앱을 쓰는 데 꼭 필요한 것만 몇 가지 물어볼게요."
          />
        );
      case "family":
        return (
          <WizardShell
            {...common}
            title="가족 이름을 정해 주세요"
            reason="홈 맨 위와 가족 리그에 이 이름이 나와요"
          >
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
          <WizardShell
            {...common}
            title="보호자님의 성별을 알려 주세요"
            reason="국민체력100 기준이 성별로 나뉘어요"
          >
            <div className="space-y-3" role="radiogroup" aria-label="보호자 성별">
              <ChoiceButton
                selected={meSex === "F"}
                onClick={() => setMeSex("F")}
                title="여성"
                note="아이 화면에서 엄마로 불려요"
              />
              <ChoiceButton
                selected={meSex === "M"}
                onClick={() => setMeSex("M")}
                title="남성"
                note="아이 화면에서 아빠로 불려요"
              />
            </div>
          </WizardShell>
        );
      case "me-birth":
        return (
          <WizardShell
            {...common}
            title="생년월일을 알려 주세요"
            reason="같은 나이대 또래와 견주려면 나이가 필요해요"
          >
            <DateInput label="보호자 생년월일" value={meBirth} onChange={setMeBirth} />
          </WizardShell>
        );
      case "me-photo":
        return (
          <WizardShell
            {...common}
            title="프로필 사진을 올려 주세요"
            reason="가족에게 보여요 · 이 기기에만 저장돼요 · 건너뛰어도 돼요"
          >
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
          <WizardShell
            {...common}
            title={`${kid}의 생일은 언제예요?`}
            reason="나이에 맞는 측정 항목과 또래 기준을 골라요"
          >
            <DateInput label="아이 생일" value={kidBirth} onChange={setKidBirth} />
          </WizardShell>
        );
      case "kid-sex":
        return (
          <WizardShell
            {...common}
            title={`${withJosa(kid, "은는")} 여자아이인가요, 남자아이인가요?`}
            reason="국민체력100 기준이 성별로 나뉘어요"
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
          <WizardShell
            {...common}
            title={`${withJosa(kid, "은는")} 지금 얼마나 컸나요?`}
            reason="몸이 자라면 기준도 달라져요. 한 달에 한 번 다시 재자고 알려 드려요"
          >
            <div className="space-y-4">
              <UnitInput
                label="키"
                unit="cm"
                value={height}
                onChange={setHeight}
                placeholder="138"
                hint={rangeHint("heightCm")}
              />
              <UnitInput
                label="몸무게"
                unit="kg"
                value={weight}
                onChange={setWeight}
                placeholder="34"
                hint={rangeHint("weightKg")}
              />
            </div>
          </WizardShell>
        );
      case "kid-photo":
        return (
          <WizardShell
            {...common}
            title={`${kid} 사진도 올릴까요?`}
            reason="가족에게만 보여요 · 이 기기에만 저장돼요 · 건너뛰어도 돼요"
          >
            <PhotoPicker value={kidPhoto} name={kidName} onChange={setKidPhoto} />
          </WizardShell>
        );
      case "consent":
        return (
          <WizardShell
            {...common}
            title="보호자 동의가 필요해요"
            reason="만 14세 미만이라 두 가지 모두 필요해요. 설정에서 언제든 거둘 수 있어요"
          >
            <div className="space-y-3">
              <ChoiceButton
                multi
                selected={consent.personalData}
                onClick={() => setConsent((c) => ({ ...c, personalData: !c.personalData }))}
                title="개인정보 처리에 동의해요"
                note="이름과 생년월일을 또래 기준과 견주는 데만 써요"
              />
              <ChoiceButton
                multi
                selected={consent.healthData}
                onClick={() => setConsent((c) => ({ ...c, healthData: !c.healthData }))}
                title="건강정보 처리에 동의해요"
                note="측정값과 운동 기록이 여기에 들어가요"
              />
            </div>
          </WizardShell>
        );
      case "support":
        return (
          <WizardShell
            {...common}
            title="얼마나 같이 하실래요?"
            reason="AI 코치가 운동을 짤 때 보호자님을 넣을지 정해요. 설정에서 바꿀 수 있어요"
          >
            <div className="space-y-3" role="radiogroup" aria-label="참여 방식">
              {SUPPORT.map((s) => (
                <ChoiceButton
                  key={s.value}
                  selected={support === s.value}
                  onClick={() => setSupport(s.value)}
                  title={s.title}
                  note={s.note}
                  art={<ArtIcon name={s.art} className="size-10" />}
                />
              ))}
            </div>
          </WizardShell>
        );
      case "schedule":
        return (
          <WizardShell
            {...common}
            title={`${withJosa(kid, "은는")} 언제 운동할 수 있어요?`}
            reason="AI 코치가 이 시간에 맞춰 짜요. 나중에 바꿀 수 있어요"
          >
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
          <WizardShell
            {...common}
            title={`지금 ${kid} 체력을 재 볼까요?`}
            reason="집에서 잴 수 있는 것만 먼저 물어요. 체력 육각형과 AI 코치가 이 기록으로 움직여요"
          >
            <div className="space-y-3" role="radiogroup" aria-label="첫 측정">
              <ChoiceButton
                selected={later === false}
                onClick={() => setLater(false)}
                title="지금 잴래요"
                note="윗몸말아올리기처럼 집에서 되는 것 · 10분쯤"
                art={<ArtIcon name="icon/menu-measure" className="size-10" />}
              />
              <ChoiceButton
                selected={later === true}
                onClick={() => setLater(true)}
                title="나중에 할게요"
                note="홈의 「첫 측정 하기」 에서 언제든 잴 수 있어요"
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
            reason={
              mode === "family"
                ? `${familyName.trim() || "우리 가족"}의 첫 운동을 시작해요`
                : `${kid} 등록이 끝났어요`
            }
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
      className="field text-xl font-bold"
    />
  );
}

/** 날짜 한 칸 — 폰의 날짜 고르기가 열린다 */
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
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
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field pr-14 text-xl font-bold"
        />
        <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-base font-bold">
          {unit}
        </span>
      </span>
      <span className="text-faint text-caption mt-1 block">{hint}</span>
    </label>
  );
}
