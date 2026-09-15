"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { KidCharacter } from "@/components/domain/kid-character";
import { ApiError } from "@/lib/api/client";
import { useCreateProfile } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useBodyStore } from "@/stores/body-store";
import { useRoleStore } from "@/stores/role-store";
import { cn, withJosa } from "@/lib/utils";

/**
 * 아이 등록.
 *
 * 한 화면에 다 묻지 않고 세 걸음으로 나눈다. 첫 화면에 빈칸 다섯 개가 뜨면
 * 거기서 닫는다 — 특히 아이가 옆에서 기다리는 상황이면 더 그렇다.
 *
 *   1. 이름 · 생일 · 성별      → 또래를 정하려면 나이와 성별이 필요하다
 *   2. 키 · 몸무게             → 몸이 자라는 걸 보려면 시작점이 있어야 한다
 *   3. 다 됐어요               → 바로 아이 화면으로 보낸다
 *
 * 키·몸무게는 서버가 측정 회차에 얹어서만 받는다. 아직 측정 전이라
 * 저장소에 담아 뒀다가 첫 측정 때 같이 보낸다(`body-store`).
 */
const STEPS = ["이름과 생일", "키와 몸무게", "다 됐어요"] as const;

export default function AddChildPage() {
  const router = useRouter();
  const { familyId } = useSession();
  const create = useCreateProfile(familyId ?? "");
  const setPendingBody = useBodyStore((s) => s.set);
  const setChild = useRoleStore((s) => s.setChild);
  const setMode = useRoleStore((s) => s.setMode);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"M" | "F">("F");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const age = birthDate ? new Date().getFullYear() - new Date(birthDate).getFullYear() : null;
  const needsConsent = age != null && age < 14;

  const step1Ok = name.trim() !== "" && birthDate !== "" && birthDate <= today;
  const height = Number(heightCm);
  const weight = Number(weightKg);
  const step2Ok =
    Number.isFinite(height) &&
    height >= 30 &&
    height <= 230 &&
    Number.isFinite(weight) &&
    weight >= 5 &&
    weight <= 250;

  const submit = async () => {
    setError(null);
    try {
      const profile = await create.mutateAsync({
        name: name.trim(),
        birthDate,
        sex,
        role: "CHILD",
        // 만 14세 미만은 보호자 동의가 있어야 저장된다. 서버가 자동으로 찍지 않는다
        ...(needsConsent ? { guardianConsent: { personalData: true, healthData: true } } : {}),
      });
      const profileId = profile.profileId ?? "";
      // 서버가 키·몸무게만 따로 받지 못한다. 첫 측정 때 같이 보낸다
      setPendingBody(profileId, { heightCm: height, weightKg: weight, measuredOn: today });
      setChild(profileId);
      setStep(2);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "CONSENT_REQUIRED"
          ? "만 14세 미만은 보호자 동의가 있어야 해요."
          : e instanceof ApiError && e.code === "NOT_A_PARENT"
            ? "아이 등록은 보호자 계정에서 할 수 있어요."
            : e instanceof ApiError
              ? e.userMessage
              : "등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
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
              <h1 className="text-xl leading-snug font-extrabold">
                아이 이름과 생일을 알려 주세요
              </h1>
              <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">
                또래 중 어디쯤인지 보려면 나이와 성별이 필요해요.
              </p>
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
                max={today}
                onChange={(e) => setBirthDate(e.target.value)}
                className="field"
              />
            </Field>

            <Field label="성별" hint="국민체력100 기준이 성별로 나뉘어 있어요">
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
                    className={cn("chip press", sex === value && "chip-on")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Button size="block" disabled={!step1Ok} onClick={() => setStep(1)}>
              다음
            </Button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <div>
              <h1 className="text-xl leading-snug font-extrabold">
                {withJosa(name || "아이", "은는")} 지금 얼마나 컸나요?
              </h1>
              <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">
                지금을 적어 두면 나중에 얼마나 자랐는지 보여 드려요.
              </p>
            </div>

            <Field label="키" hint="30 ~ 230 cm">
              <div className="relative">
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

            <Field label="몸무게" hint="5 ~ 250 kg">
              <div className="relative">
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

            {needsConsent && (
              <p className="border-line text-ink-soft rounded-xl border p-3.5 text-xs leading-relaxed">
                만 14세 미만이라 건강 정보를 저장하려면 보호자 동의가 필요해요. 등록하면 동의한
                것으로 봅니다. 설정에서 언제든 철회할 수 있어요.
              </p>
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
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col items-center py-6 text-center">
            <KidCharacter motion="cheer" size={170} />
            <h1 className="mt-3 text-2xl font-extrabold">{name} 등록 완료!</h1>
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">
              이제 오늘 할 운동을 골라 볼까요. 한 가지만 재면 또래 중 어디쯤인지도 보여요.
            </p>

            <Button
              size="kid"
              className="mt-6"
              onClick={() => {
                setMode("kid");
                router.replace("/kid");
              }}
            >
              {withJosa(name || "아이", "이가")} 시작하기
            </Button>
            <Button
              size="md"
              variant="ghost"
              className="mt-3"
              onClick={() => router.replace("/parent")}
            >
              부모 화면으로
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
