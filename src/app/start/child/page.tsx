"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { errorMessage } from "@/lib/errors";
import { useCreateProfile } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { bodyValue, rangeHint } from "@/lib/body";
import { ageOf, today } from "@/lib/today";
import { useBodyStore } from "@/stores/body-store";
import { useRoleStore } from "@/stores/role-store";
import { cn, withJosa } from "@/lib/utils";

/** 아이 등록. */
const STEPS = ["이름과 생일", "키와 몸무게", "다 됐어요"] as const;

/** 서버가 따로 받는 두 칸. 둘 다 true 여야 저장된다 */
const CONSENTS = [
  {
    key: "personalData",
    label: "개인정보 처리에 동의해요",
    note: "이름과 생년월일을 또래 기준과 견주는 데만 써요.",
  },
  {
    key: "healthData",
    label: "건강정보 처리에 동의해요",
    note: "측정값과 운동 기록이 여기에 들어가요.",
  },
] as const;

export default function AddChildPage() {
  const router = useRouter();
  const { familyId } = useSession();
  const create = useCreateProfile(familyId ?? "");
  const setPendingBody = useBodyStore((s) => s.set);
  const setChild = useRoleStore((s) => s.setChild);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  /*
    성별을 미리 골라 두지 않는다.

    국민체력100 규준이 성별로 나뉘어 있어서 틀리면 백분위가 통째로 다른 표에서
    나온다. "여자" 가 파랗게 켜진 채로 시작하면 많은 사람이 그냥 넘긴다.
  */
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  /** 만 14세 미만 보호자 동의. 서버가 두 칸을 따로 받는다 */
  const [consent, setConsent] = useState({ personalData: false, healthData: false });
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const age = ageOf(birthDate);
  const needsConsent = age != null && age < 14;

  const step1Ok = name.trim() !== "" && birthDate !== "" && birthDate <= today() && sex != null;
  const height = bodyValue("heightCm", heightCm);
  const weight = bodyValue("weightKg", weightKg);
  // 여기서는 둘 다 있어야 다음으로 간다 — 첫 등록에 기준이 없으면 점수가 안 나온다
  const bodyOk =
    height != null && weight != null && heightCm.trim() !== "" && weightKg.trim() !== "";
  /* 동의는 받은 것만 보낸다. 안 누른 채로 등록하면 서버가 422 로 막는다 */
  const consentOk = !needsConsent || (consent.personalData && consent.healthData);
  const step2Ok = bodyOk && consentOk;

  const submit = async () => {
    setError(null);
    try {
      const profile = await create.mutateAsync({
        name: name.trim(),
        birthDate,
        // step1Ok 이 이미 막고 있다. 타입을 좁히려고 한 번 더 본다
        sex: sex ?? "F",
        role: "CHILD",
        // 만 14세 미만은 보호자 동의가 있어야 저장된다. 서버가 자동으로 찍지 않는다
        ...(needsConsent ? { guardianConsent: consent } : {}),
      });
      const profileId = profile.profileId ?? "";
      // 서버가 키·몸무게만 따로 받지 못한다. 첫 측정 때 같이 보낸다
      setPendingBody(profileId, {
        heightCm: height ?? 0,
        weightKg: weight ?? 0,
        measuredOn: today(),
      });
      setChild(profileId);
      setStep(2);
    } catch (e) {
      setError(
        errorMessage(
          e,
          {
            CONSENT_REQUIRED: "만 14세 미만은 보호자 동의가 있어야 해요.",
            NOT_A_PARENT: "아이 등록은 보호자 계정에서 할 수 있어요.",
          },
          "등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
    }
  };

  return (
    <>
      <AppBar back={step === 0} title="아이 등록" />
      <Stage className="space-y-6">
        <Progress step={step} />

        {step === 0 && (
          <section className="space-y-5">
            <div>
              <h2 className="text-xl leading-snug font-extrabold">
                아이 이름과 생일을 알려 주세요
              </h2>
            </div>

            <Field label="이름">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="서준"
                className="field"
              />
            </Field>

            <Field label="생년월일">
              <input
                type="date"
                value={birthDate}
                max={today()}
                onChange={(e) => setBirthDate(e.target.value)}
                className="field"
              />
            </Field>

            <Field label="성별" group>
              <div className="flex gap-2">
                {(
                  [
                    ["F", "여자"],
                    ["M", "남자"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSex(value)}
                    aria-pressed={sex === value}
                    className={cn("chip press", sex === value ? "chip-on" : "bg-paper shadow-card")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Button size="block" disabled={!step1Ok} onClick={() => setStep(1)}>
              다음
            </Button>
            {!step1Ok && (
              <p className="text-faint text-caption text-center">
                이름 · 생일 · 성별을 넣어 주세요
              </p>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <div>
              <h2 className="text-xl leading-snug font-extrabold">
                {withJosa(name || "아이", "은는")} 지금 얼마나 컸나요?
              </h2>
            </div>

            <Field label="키" hint={rangeHint("heightCm")}>
              <div className="relative flex items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="138"
                  className="field pr-12"
                />
                <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold">
                  cm
                </span>
              </div>
            </Field>

            <Field label="몸무게" hint={rangeHint("weightKg")}>
              <div className="relative flex items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="34"
                  className="field pr-12"
                />
                <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold">
                  kg
                </span>
              </div>
            </Field>

            {/*
              만 14세 미만은 **동의를 눌러서 받는다.**

              전에는 「등록하면 동의한 것으로 봅니다」 한 줄이었다. 건강 정보를
              그렇게 받으면 안 된다 — 서버도 personalData · healthData 두 칸을
              따로 받고(`guardianConsent`), 둘 다 true 여야 저장한다.
              화면이 그 둘을 물어보지 않으면 계약과 화면이 어긋난다.
            */}
            {needsConsent && (
              <fieldset className="border-line space-y-2 rounded-2xl border p-3.5">
                <legend className="text-ink-soft px-1 text-xs font-bold">
                  보호자 동의 · 둘 다 필요해요
                </legend>
                {CONSENTS.map(({ key, label, note }) => {
                  const on = consent[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setConsent((c) => ({ ...c, [key]: !c[key] }))}
                      className={cn(
                        "press flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-left",
                        on ? "border-signal bg-signal-soft" : "border-line",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2",
                          on ? "bg-signal-strong border-signal-strong text-white" : "border-line",
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3.5} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{label}</span>
                        <span className="text-ink-soft mt-0.5 block text-xs leading-relaxed">
                          {note}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <p className="text-faint text-caption pt-0.5">설정에서 언제든 철회할 수 있어요.</p>
              </fieldset>
            )}

            {error && (
              <p
                role="alert"
                className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="md" className="flex-1" onClick={() => setStep(0)}>
                뒤로
              </Button>
              <Button
                size="md"
                className="flex-[2]"
                disabled={!step2Ok}
                loading={create.isPending}
                onClick={submit}
              >
                등록하기
              </Button>
            </div>
            {!step2Ok && (
              <p className="text-faint text-caption text-center">
                {bodyOk ? "동의 두 가지를 눌러 주세요" : "키와 몸무게를 넣어 주세요"}
              </p>
            )}
          </section>
        )}

        {/*
          등록이 끝나면 **참여 방식을 고르러 간다.**

          전에는 여기서 곧장 아이 홈이나 부모 홈으로 보냈다. 그래서 처음 쓰는
          부모는 자기가 무엇을 고른 건지 모른 채 시작했고, 코치가 자기를 미션에
          넣을지 말지도 모르는 채로 첫 제안을 받았다. 고르는 자리를 온보딩 안으로
          올린다 — 고른 것이 아이 화면까지 바꾼다.
        */}
        {step === 2 && (
          <section className="relative flex flex-col items-center py-6 text-center">
            {/* 새로 온 아이는 씨앗부터. 운동을 하면서 자란다 */}
            <LevelBuddy stage={1} size={150} cheer />
            <h2 className="mt-3 text-2xl font-extrabold">{name} 등록 완료!</h2>
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">
              이제 {withJosa(name || "아이", "와과")} 얼마나 같이 할지 정해요
            </p>

            <Button
              size="kid"
              className="mt-6"
              onClick={() => router.replace("/settings/support-mode?from=onboarding")}
            >
              다음
            </Button>
          </section>
        )}
      </Stage>
    </>
  );
}

/** 몇 걸음 남았는지. 끝이 안 보이는 폼은 중간에 닫힌다 */
function Progress({ step }: { step: number }) {
  return (
    <ol className="flex gap-1.5" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-signal" : "bg-line")}
        />
      ))}
    </ol>
  );
}
