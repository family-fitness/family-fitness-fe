"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Illustration } from "@/components/ui/illustration";
import { ApiError } from "@/lib/api/client";
import { useCreateFamily } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

/**
 * 가족 만들기 — 첫 화면.
 *
 * 만드는 사람은 **항상 PARENT 이자 owner** 다. 역할을 고르게 하지 않는다.
 * 생년월일로 서버가 연령대와 측정 가능 여부를 정한다.
 *
 * 한 번에 다 묻지 않는다. 나머지 가족은 다음 화면에서 더한다 —
 * 첫 화면에서 네 명의 생년월일을 묻는 앱은 거기서 닫힌다.
 */
export default function CreateFamilyPage() {
  const router = useRouter();
  const create = useCreateFamily();

  const [familyName, setFamilyName] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"M" | "F">("F");
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const valid =
    familyName.trim().length >= 1 &&
    familyName.trim().length <= 20 &&
    name.trim().length >= 1 &&
    name.trim().length <= 20 &&
    birthDate !== "" &&
    birthDate <= today;

  return (
    <>
      <AppBar back title="가족 만들기" />
      <PlainScreen className="space-y-7 pt-2">
        <div className="flex flex-col items-center text-center">
          <Illustration name="scene/scene-invite" size={130} />
          <h1 className="page-title mt-3">가족을 만들어요</h1>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            먼저 본인 프로필만 만들어요. 나머지 가족은 다음에 더할 수 있어요.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await create.mutateAsync({
                familyName: familyName.trim(),
                owner: { name: name.trim(), birthDate, sex },
              });
              router.replace("/start/child");
            } catch (err) {
              setError(
                err instanceof ApiError && err.code === "ALREADY_IN_FAMILY"
                  ? "이미 가족에 속해 있어요. 홈으로 가 주세요."
                  : err instanceof ApiError
                    ? err.userMessage
                    : "만들지 못했어요. 잠시 후 다시 시도해 주세요.",
              );
            }
          }}
        >
          <Field label="가족 이름" hint="예) 김씨네, 우리집">
            <input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value.slice(0, 20))}
              placeholder="우리집"
              className="field"
            />
          </Field>

          <Field label="내 이름">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="엄마"
              className="field"
            />
          </Field>

          <Field label="생년월일" hint="또래와 견주려면 나이가 필요해요">
            <input
              type="date"
              value={birthDate}
              max={today}
              onChange={(e) => setBirthDate(e.target.value)}
              className="field"
            />
          </Field>

          <Field label="성별" hint="국민체력100 규준이 성별로 나뉘어 있어요">
            <div className="flex gap-2">
              {(
                [
                  ["F", "여성"],
                  ["M", "남성"],
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

          {error && (
            <p
              role="alert"
              className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {error}
            </p>
          )}

          <Button type="submit" size="block" disabled={!valid} loading={create.isPending}>
            가족 만들기
          </Button>
        </form>
      </PlainScreen>
    </>
  );
}
