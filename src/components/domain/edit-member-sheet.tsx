"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { radioKeys } from "@/components/ui/radio-keys";
import { Sheet } from "@/components/ui/sheet";
import { useEditProfile } from "@/lib/api/queries";
import type { ProfileSummary } from "@/lib/api/types";
import { childBirthRule, guardianBirthRule } from "@/lib/date-pick";
import { errorMessage } from "@/lib/errors";
import { memberEdit, memberNameProblem, needsConsentAfterEdit } from "@/lib/family";
import { cn } from "@/lib/utils";

/**
 * 구성원 정보 고치기 — 이름 · 생년월일 · 성별. 바꾼 칸만 보낸다.
 * 생년월일은 지금 값을 받지 못해 비워 두고, 고른 때만 보낸다. 아이 생일을 고쳐 보호자 동의가 새로 필요해지면
 * 닫지 않고 그 자리에서 동의 관리로 가는 길을 낸다 — 동의가 없으면 측정이 막힌다
 */
export function EditMemberSheet({
  open,
  onClose,
  member,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  member: ProfileSummary | null;
  familyId: string;
}) {
  const router = useRouter();
  const edit = useEditProfile(member?.profileId ?? "", familyId);
  const before = member as (ProfileSummary & { sex?: "M" | "F" | null }) | null;
  const [name, setName] = useState(member?.name ?? "");
  const [sex, setSex] = useState<"M" | "F" | null>(before?.sex ?? null);
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const nameProblem = memberNameProblem(name);
  const changes = memberEdit(
    { name: member?.name, sex: before?.sex ?? null },
    { name, sex, birthDate },
  );
  const nothing = Object.keys(changes).length === 0;

  const close = () => {
    setError(null);
    onClose();
  };

  const save = async () => {
    if (!member?.profileId || nameProblem || nothing) return;
    setError(null);
    try {
      const after = await edit.mutateAsync(changes);
      if (needsConsentAfterEdit(member, after)) {
        setNeedsConsent(true);
        return;
      }
      close();
    } catch (e) {
      setError(
        errorMessage(
          e,
          {
            UNDER_14_NOT_ALLOWED: "보호자는 만 14세 이상이어야 해요.",
            FORBIDDEN: "이 구성원 정보는 고칠 수 없어요.",
            NOT_A_PARENT: "보호자만 고칠 수 있어요.",
            NOT_SAME_FAMILY: "다른 가족의 사람은 고칠 수 없어요.",
            PROFILE_NOT_FOUND: "이미 우리 가족에 없는 사람이에요.",
            BAD_REQUEST: "이름과 생년월일을 다시 봐 주세요.",
          },
          "고치지 못했어요. 잠시 뒤에 다시 해 주세요.",
        ),
      );
    }
  };

  const isParent = member?.role === "PARENT";
  return (
    <Sheet open={open} onClose={close} title={`${member?.name ?? ""} 정보 고치기`}>
      {needsConsent ? (
        <div className="space-y-5">
          <p role="status" className="text-body font-bold">
            보호자 동의가 필요해요
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="md" className="flex-1" onClick={close}>
              닫기
            </Button>
            <Button size="md" className="flex-1" onClick={() => router.push("/settings/consent")}>
              동의 관리로 가기
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="edit-member-name" className="text-sm font-bold">
              이름
            </label>
            <input
              id="edit-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="off"
              aria-invalid={nameProblem ? true : undefined}
              aria-describedby={nameProblem ? "edit-member-name-problem" : undefined}
              className={cn("field", nameProblem && "border-signal-deep")}
            />
            {nameProblem && (
              <p id="edit-member-name-problem" className="text-signal-deep text-xs font-semibold">
                {nameProblem}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-bold">생년월일</p>
            <DateField
              label={`${member?.name ?? ""} 생년월일`}
              value={birthDate}
              onChange={setBirthDate}
              rule={isParent ? guardianBirthRule() : childBirthRule()}
              placeholder="그대로"
            />
          </div>

          <div className="space-y-1.5">
            <p id="edit-member-sex" className="text-sm font-bold">
              성별
            </p>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-labelledby="edit-member-sex"
              onKeyDown={radioKeys}
            >
              {(
                [
                  ["F", "여성"],
                  ["M", "남성"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={sex === value}
                  tabIndex={sex === value || (sex == null && value === "F") ? 0 : -1}
                  onClick={() => setSex(value)}
                  className={cn("chip min-h-12 justify-center", sex === value && "chip-on")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-signal-deep text-sm font-semibold">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="md" className="flex-1" onClick={close}>
              그대로 두기
            </Button>
            <Button
              size="md"
              className="flex-1"
              loading={edit.isPending}
              disabled={Boolean(nameProblem) || nothing}
              onClick={() => void save()}
            >
              고치기
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
