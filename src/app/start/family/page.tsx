"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { errorMessage } from "@/lib/errors";
import { useCreateFamily } from "@/lib/api/queries";
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";

/** 가족 만들기 — 첫 화면. */
export default function CreateFamilyPage() {
  const router = useRouter();
  const create = useCreateFamily();

  const [familyName, setFamilyName] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  /* 미리 골라 두지 않는다. 규준이 성별로 나뉘어 있어 틀리면 표가 통째로 달라진다 */
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid =
    familyName.trim().length >= 1 &&
    familyName.trim().length <= 20 &&
    name.trim().length >= 1 &&
    name.trim().length <= 20 &&
    birthDate !== "" &&
    birthDate <= today() &&
    sex != null;

  return (
    <>
      <AppBar back title="가족 만들기" />
      <PlainScreen className="space-y-7 pt-2">
        <div className="flex flex-col items-center text-center">
          <LevelBuddy stage={1} size={112} />
          <h2 className="page-title mt-3">가족을 만들어요</h2>
        </div>

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await create.mutateAsync({
                familyName: familyName.trim(),
                owner: { name: name.trim(), birthDate, sex: sex ?? "F" },
              });
              router.replace("/start/child");
            } catch (err) {
              setError(
                errorMessage(
                  err,
                  { ALREADY_IN_FAMILY: "이미 가족에 속해 있어요. 홈으로 가 주세요." },
                  "만들지 못했어요. 잠시 후 다시 시도해 주세요.",
                ),
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
