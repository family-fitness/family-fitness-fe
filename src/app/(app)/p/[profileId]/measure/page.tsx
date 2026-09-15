"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { MeasureField } from "@/components/domain/measure-field";
import { ApiError } from "@/lib/api/client";
import type { FitnessItem, FitnessTestSource } from "@/lib/api/types";
import { useCreateFitnessTest, useFamilyProfiles, useFitnessItems } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn, withJosa } from "@/lib/utils";

/**
 * 체력 측정 입력.
 *
 * **항목은 서버가 준다.** 연령대마다 항목이 달라서 프론트가 목록을 갖고 있으면
 * 유아기 화면에 성인 항목이 뜬다 (GET /fitness/items?ageGroup=).
 *
 * 폼을 두 구역으로 나눈다 — `inputGroup` 이 기준이다.
 *   EASY       집에서 잴 수 있는 항목
 *   EQUIPMENT  악력계 · 넓은 공간이 필요한 항목. 접은 채로 시작한다
 *
 * 악력계가 있는 집이 거의 없어서, 첫 화면에서 장비를 요구하면 거기서 이탈한다.
 */

/** RHF 필드 이름. 항목 코드가 "012" 라 그대로 쓰면 경로 파서가 숫자로 본다 */
const field = (itemCode: string) => `item_${itemCode}`;

export default function MeasurePage() {
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId, isPending: sessionPending } = useSession();

  /*
    측정은 **주소의 프로필**에 저장한다. 로그인한 사람이 아니다.
    부모 계정 하나로 온 가족을 관리하는 게 기본 모양이라, 로그인한 프로필을 쓰면
    아이 측정을 넣었는데 부모 기록으로 들어간다.
  */
  const { data: family, isPending: familyPending } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  // 항목은 연령대마다 다르다. 재는 사람의 연령대로 받는다
  const { data: itemsData, isPending: itemsPending } = useFitnessItems(profile?.ageGroup);

  const [showEquipment, setShowEquipment] = useState(false);
  const [source, setSource] = useState<FitnessTestSource>("SELF_INPUT");
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [testedOn, setTestedOn] = useState(today);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Record<string, string>>();
  // watch() 대신 useWatch 를 쓴다. watch 는 함수를 돌려줘서 React Compiler 가
  // 이 화면 전체의 메모이제이션을 포기한다
  const values = useWatch({ control });

  const create = useCreateFitnessTest(profileId, familyId ?? "");

  const { easy, equipment } = useMemo(() => {
    const list: FitnessItem[] = itemsData?.items ?? [];
    return {
      easy: list.filter((i) => i.inputGroup !== "EQUIPMENT"),
      equipment: list.filter((i) => i.inputGroup === "EQUIPMENT"),
    };
  }, [itemsData]);

  const filledCount = Object.entries(values).filter(
    ([key, v]) => key.startsWith("item_") && v !== "" && v !== undefined,
  ).length;

  if (sessionPending || familyPending || itemsPending) return <MeasureSkeleton />;

  if (!profile) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="invite"
            title="찾을 수 없는 프로필이에요"
            description="다른 가족의 프로필이거나 지워진 프로필일 수 있어요. 측정 기록은 계정이 아니라 프로필에 쌓여요."
          />
        </Screen>
      </>
    );
  }

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 비활성화가 아니라 폼을 띄우지 않는다
  if (!profile.measurable) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="too-young"
            title="만 4세부터 측정할 수 있어요"
            description={`${withJosa(profile.name ?? "", "은는")} 아직 국민체력100 기준이 없어요. 지금은 가족 미션에 함께 참여할 수 있어요.`}
            action={
              <Button size="md" variant="soft" onClick={() => router.push("/missions")}>
                가족 미션 보기
              </Button>
            }
          />
        </Screen>
      </>
    );
  }

  // 동의가 없으면 저장이 422 다. 다 채우고 나서 막으면 그동안 적은 게 전부 헛수고가 된다
  if (profile.consentRequired && !profile.consentGiven) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="waiting-approval"
            title="보호자 동의가 필요해요"
            description="건강 정보를 저장하려면 보호자 동의가 있어야 해요. 동의를 켜면 바로 측정을 입력할 수 있어요."
            action={
              <Button size="md" onClick={() => router.push("/settings/consent")}>
                동의 관리로 가기
              </Button>
            }
          />
        </Screen>
      </>
    );
  }

  // 연령대에 맞는 항목이 하나도 없는 경우. 서버가 빈 배열을 줄 수 있다
  if (easy.length === 0 && equipment.length === 0) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="측정할 수 있는 항목이 아직 없어요"
            description={`${profile.ageGroup} 연령대의 항목을 불러오지 못했어요. 잠시 후 다시 들어와 주세요.`}
          />
        </Screen>
      </>
    );
  }

  const onSubmit = handleSubmit(async (form) => {
    setServerError(null);

    const items = Object.entries(form)
      .filter(([key, value]) => key.startsWith("item_") && value !== "" && value !== undefined)
      .map(([key, value]) => ({ itemCode: key.slice("item_".length), value: Number(value) }))
      .filter((entry) => Number.isFinite(entry.value));

    if (items.length === 0) {
      setServerError("한 항목이라도 입력해 주세요.");
      return;
    }

    try {
      await create.mutateAsync({ testedOn, source, items });
      router.replace(`/p/${profileId}/result`);
    } catch (error) {
      // 코드마다 고쳐야 할 게 다르다. 한 문구로 뭉뚱그리면 뭘 바꿔야 할지 알 수 없다
      setServerError(messageFor(error));
    }
  });

  return (
    <>
      <PageHeader
        eyebrow="MEASURE"
        title={`${profile.name} 측정`}
        back
        meta={
          <>
            <span>{filledCount}개 입력함</span>
            <span className="text-faint">한 항목만 넣어도 결과가 나와요</span>
          </>
        }
      />

      <Screen>
        <form onSubmit={onSubmit} className="space-y-7">
          {/* 언제 · 어디서 쟀는지. 센터 결과지를 며칠 뒤에 옮겨 적는 경우가 많다 */}
          <fieldset className="space-y-3">
            <legend className="text-ink-soft mb-2 text-xs font-bold">언제 쟀나요</legend>
            <input
              type="date"
              value={testedOn}
              max={today}
              onChange={(e) => setTestedOn(e.target.value)}
              aria-label="측정한 날짜"
              className="border-line focus:border-signal h-12 w-full rounded-xl border bg-transparent px-4 text-base focus:outline-none"
            />

            <div className="flex gap-2">
              {(
                [
                  ["SELF_INPUT", "집에서 직접"],
                  ["CENTER_SHEET", "센터 결과지 보고"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSource(value)}
                  aria-pressed={source === value}
                  className={cn("chip press", source === value && "chip-on")}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {easy.length > 0 && (
            <section>
              <div className="section-head">
                <h2>집에서 잴 수 있어요</h2>
              </div>
              <div className="divide-rows">
                {easy.map((item) => (
                  <MeasureField
                    key={item.itemCode}
                    item={item}
                    register={register(field(item.itemCode ?? ""), rules(item))}
                    error={errors[field(item.itemCode ?? "")]?.message}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 장비가 필요한 항목은 접어 둔다. 첫 화면에서 악력계를 요구하면 거기서 나간다 */}
          {equipment.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowEquipment((v) => !v)}
                aria-expanded={showEquipment}
                className="press border-line flex w-full items-center gap-2 rounded-xl border px-4 py-3.5 text-left"
              >
                <Illustration name="item/item-grip" size={28} />
                <span className="flex-1">
                  <span className="block text-sm font-bold">장비가 있으면 더 정확해요</span>
                  <span className="text-faint text-xs">
                    악력계 · 넓은 공간이 필요한 {equipment.length}개 항목
                  </span>
                </span>
                {showEquipment ? (
                  <ChevronUp className="text-faint size-4" aria-hidden />
                ) : (
                  <ChevronDown className="text-faint size-4" aria-hidden />
                )}
              </button>

              {showEquipment && (
                <div className="divide-rows mt-1">
                  {equipment.map((item) => (
                    <MeasureField
                      key={item.itemCode}
                      item={item}
                      register={register(field(item.itemCode ?? ""), rules(item))}
                      error={errors[field(item.itemCode ?? "")]?.message}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {serverError && (
            <p
              role="alert"
              className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            size="block"
            loading={create.isPending}
            disabled={filledCount === 0}
          >
            {filledCount === 0 ? "한 항목 이상 입력해 주세요" : "결과 보기"}
          </Button>
        </form>
      </Screen>
    </>
  );
}

/**
 * 값 범위는 서버가 항목마다 준다.
 * 보내고 나서 400 을 받는 것보다 적는 자리에서 알려주는 편이 낫다.
 */
function rules(item: FitnessItem) {
  const range = item.range;
  return {
    validate: (raw: string) => {
      if (raw === "" || raw === undefined) return true;
      const value = Number(raw);
      if (!Number.isFinite(value)) return "숫자로 적어 주세요.";
      if (range?.min != null && value < range.min)
        return `${range.min}${item.unit ?? ""}보다 커야 해요.`;
      if (range?.max != null && value > range.max)
        return `${range.max}${item.unit ?? ""}보다 작아야 해요.`;
      return true;
    },
  };
}

/** 서버 오류 코드 → 사람 말. 계약서 §2 의 목록이 그대로 들어온다 */
function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  switch (error.code) {
    case "NO_ITEMS":
      return "한 항목이라도 입력해 주세요.";
    case "NOT_MEASURABLE":
      return "만 4세부터 측정할 수 있어요.";
    case "CONSENT_REQUIRED":
      return "보호자 동의가 필요해요. 설정에서 동의를 켜 주세요.";
    case "DUPLICATE_DATE":
      return "그 날짜의 측정이 이미 있어요. 날짜를 바꾸거나 기존 기록을 확인해 주세요.";
    case "ITEM_NOT_ALLOWED":
    case "UNKNOWN_ITEM":
      return "지금 저장할 수 없는 항목이 섞여 있어요. 새로고침 후 다시 시도해 주세요.";
    case "ITEM_NOT_FOR_AGE_GROUP":
      return "이 연령대에서 잴 수 없는 항목이 있어요. 새로고침 후 다시 시도해 주세요.";
    default:
      return error.userMessage;
  }
}

function MeasureSkeleton() {
  return (
    <>
      <PageHeader eyebrow="MEASURE" title="체력 측정" back />
      <Screen className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-9 w-48 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="mb-3 h-6 w-40" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 py-4">
              <Skeleton className="size-18 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </Screen>
    </>
  );
}
