"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MeasureField } from "@/components/domain/measure-field";
import { errorMessage } from "@/lib/errors";
import type { FitnessItem, FitnessTestSource } from "@/lib/api/types";
import { useCreateFitnessTest, useFamilyProfiles, useFitnessItems } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { REMEASURE_DAYS } from "@/lib/remeasure";
import { daysSince, today } from "@/lib/today";
import { bodyError, bodyValue, rangeHint } from "@/lib/body";
import { useBodyStore } from "@/stores/body-store";
import { cn } from "@/lib/utils";
import { ArtIcon } from "@/components/ui/art-icon";

/** RHF 필드 이름. 항목 코드가 "012" 라 그대로 쓰면 경로 파서가 숫자로 본다 */
const field = (itemCode: string) => `item_${itemCode}`;

export default function MeasurePage() {
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();
  // 첫 시작에서 왔다 — 여기까지 전부 바꿔치기라 뒤로 갈 곳이 없다(홈 화면 앱이면 앱을 나간다). 뒤로는 홈으로
  const fromStart = useSearchParams().get("from") === "start";
  const nav = fromStart ? { backHref: "/parent" } : { back: true };
  const { familyId, isPending: sessionPending, error: sessionError } = useSession();

  /** 측정은 **주소의 프로필**에 저장한다. 로그인한 사람이 아니다. */
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const {
    data: family,
    isLoading: familyLoading,
    error: familyError,
    refetch: refetchFamily,
  } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  // 항목은 연령대마다 다르다. 재는 사람의 연령대로 받는다
  // isLoading 이지 isPending 이 아니다. 연령대를 모르면 이 요청은 꺼져 있고,
  // 꺼진 요청의 isPending 은 영영 true 라 화면이 뼈대인 채로 멈춘다
  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useFitnessItems(profile?.ageGroup);

  const [showEquipment, setShowEquipment] = useState(false);
  const [source, setSource] = useState<FitnessTestSource>("SELF_INPUT");
  const [serverError, setServerError] = useState<string | null>(null);
  const [testedOn, setTestedOn] = useState(today());

  /**
   * 키와 몸무게. 한 달 안에 적은 값만 미리 채운다 — 그보다 오래된 값을 채워 두면 항목만 적고 저장한 순간
   * 몇 달 전 키가 오늘 잰 키로 올라간다(규칙 11). 오래된 값은 흐린 자리 글자로만 보인다
   */
  const pendingBody = useBodyStore((st) => (profileId ? st.byProfile[profileId] : undefined));
  const recentBody =
    pendingBody && (daysSince(pendingBody.measuredOn) ?? Infinity) <= REMEASURE_DAYS
      ? pendingBody
      : undefined;
  const rememberBody = useBodyStore((st) => st.set);
  const forgetBody = useBodyStore((st) => st.clear);
  const [heightCm, setHeightCm] = useState(() => String(recentBody?.heightCm ?? ""));
  const [weightKg, setWeightKg] = useState(() => String(recentBody?.weightKg ?? ""));
  // 범위를 벗어난 값은 서버가 422 로 돌려보낸다. 다 적고 나서 알면 늦다
  const heightProblem = bodyError("heightCm", heightCm);
  const weightProblem = bodyError("weightKg", weightKg);

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

  if (sessionPending || familyLoading || itemsLoading) return <MeasureSkeleton />;

  // 못 불러온 것을 "그런 프로필 없음" 으로 그리지 않는다. 다시 부를 때는 못 받은 것을 다시 부른다
  const failure = sessionError ?? familyError ?? itemsError;
  if (failure) {
    return (
      <>
        <PageHeader title="체력 측정" {...nav} />
        <Screen>
          <ErrorState
            error={failure}
            onRetry={() => void (familyError ? refetchFamily() : refetchItems())}
          />
        </Screen>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="체력 측정" {...nav} />
        <Screen>
          <EmptyState scene="waiting" title="찾을 수 없는 프로필이에요" />
        </Screen>
      </>
    );
  }

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 비활성화가 아니라 폼을 띄우지 않는다
  if (!profile.measurable) {
    return (
      <>
        <PageHeader title="체력 측정" {...nav} />
        <Screen>
          <EmptyState
            scene="rest"
            title="만 4세부터 측정할 수 있어요"
            action={
              <Button size="md" variant="soft" onClick={() => router.push("/parent")}>
                홈으로
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
        <PageHeader title="체력 측정" {...nav} />
        <Screen>
          <EmptyState
            scene="waiting"
            title="보호자 동의가 필요해요"
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
        <PageHeader title="체력 측정" {...nav} />
        <Screen>
          <EmptyState scene="no-record" title="측정할 수 있는 항목이 아직 없어요" />
        </Screen>
      </>
    );
  }

  const onSubmit = handleSubmit(async (form) => {
    setServerError(null);

    // 키 · 몸무게가 범위를 벗어났으면 보내지 않는다 — 빼고 보내면 적은 줄 알았던 키가 사라진다
    if (heightProblem || weightProblem) {
      setServerError("키 · 몸무게를 다시 봐 주세요.");
      return;
    }
    // 접어 둔 장비 항목은 화면에서 빠져 검사를 건너뛴다. 접기 전에 적은 값도 여기서 다시 본다
    const hidden = equipment.find((item) => {
      const raw = form[field(item.itemCode ?? "")];
      return raw !== undefined && raw !== "" && rules(item).validate(raw) !== true;
    });
    if (hidden && !showEquipment) {
      setShowEquipment(true);
      setServerError(`${hidden.itemLabel ?? hidden.itemName}을 다시 봐 주세요.`);
      return;
    }

    const items = Object.entries(form)
      .filter(([key, value]) => key.startsWith("item_") && value !== "" && value !== undefined)
      .map(([key, value]) => ({ itemCode: key.slice("item_".length), value: Number(value) }))
      .filter((entry) => Number.isFinite(entry.value));

    if (items.length === 0) {
      setServerError("한 항목이라도 입력해 주세요.");
      return;
    }

    try {
      const height = bodyValue("heightCm", heightCm);
      const weight = bodyValue("weightKg", weightKg);
      await create.mutateAsync({
        testedOn,
        source,
        items,
        ...(height != null ? { heightCm: height } : {}),
        ...(weight != null ? { weightKg: weight } : {}),
      });
      // 서버는 받아 두고도 돌려주지 않는다. 방금 적은 값이 사라지지 않게 남긴다
      if (height != null && weight != null) {
        rememberBody(profileId, { heightCm: height, weightKg: weight, measuredOn: testedOn });
      } else {
        forgetBody(profileId);
      }
      router.replace(`/p/${profileId}/result${fromStart ? "?from=start" : ""}`);
    } catch (error) {
      // 코드마다 고쳐야 할 게 다르다. 한 문구로 뭉뚱그리면 뭘 바꿔야 할지 알 수 없다
      setServerError(messageFor(error));
    }
  });

  return (
    <>
      <PageHeader
        title={`${profile.name} 측정`}
        {...nav}
        meta={
          <span>
            국민체력100 {profile.ageGroup ?? ""} 항목 · {filledCount}개 입력함
          </span>
        }
      />

      <Stage wide>
        <form onSubmit={onSubmit} className="space-y-3">
          {/* 언제 · 어디서 쟀는지. 센터 결과지를 며칠 뒤에 옮겨 적는 경우가 많다 */}
          <fieldset className="card space-y-3">
            <legend className="sr-only">언제 쟀나요</legend>
            <p aria-hidden className="card-head">
              언제 쟀나요
            </p>
            <input
              type="date"
              value={testedOn}
              max={today()}
              onChange={(e) => setTestedOn(e.target.value)}
              aria-label="측정한 날짜"
              className="field"
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

          {/* 몸이 자란 만큼 기준도 달라진다. 잴 때마다 다시 묻는다 */}
          <section className="card">
            <CardHead title="지금 키와 몸무게" />
            <div className="flex gap-3 pt-2">
              <BodyInput
                label="키"
                unit="cm"
                placeholder={String(pendingBody?.heightCm ?? 138)}
                value={heightCm}
                onChange={setHeightCm}
                hint={rangeHint("heightCm")}
                problem={heightProblem}
              />
              <BodyInput
                label="몸무게"
                unit="kg"
                placeholder={String(pendingBody?.weightKg ?? 34)}
                value={weightKg}
                onChange={setWeightKg}
                hint={rangeHint("weightKg")}
                problem={weightProblem}
              />
            </div>
          </section>

          {easy.length > 0 && (
            <section className="card">
              <CardHead title="집에서 잴 수 있어요" meta={`${easy.length}개`} />
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
            <section className="card">
              <button
                type="button"
                onClick={() => setShowEquipment((v) => !v)}
                aria-expanded={showEquipment}
                className="press flex min-h-12 w-full items-center gap-3 text-left"
              >
                <ArtIcon name="icon/menu-equipment" className="size-9 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-bold">장비가 있으면 더 정확해요</span>
                  <span className="text-ink-soft text-xs">{equipment.length}개 항목</span>
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
            <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            size="block"
            loading={create.isPending}
            disabled={filledCount === 0}
          >
            결과 보기
          </Button>
        </form>
      </Stage>
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

/** 키 · 몸무게 한 칸. */
function BodyInput({
  label,
  unit,
  placeholder,
  value,
  onChange,
  hint,
  problem,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  hint: string;
  problem: string | null;
}) {
  return (
    <label className="flex-1">
      <span className="text-ink-soft block text-xs font-bold">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={problem != null}
          className="field pr-11"
        />
        <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold">
          {unit}
        </span>
      </span>
      <span
        className={cn("mt-1 block text-xs", problem ? "text-signal-deep font-bold" : "text-faint")}
      >
        {problem ?? hint}
      </span>
    </label>
  );
}

/** 서버 오류 코드 → 사람 말. 계약서 §2 의 목록이 그대로 들어온다 */
const messageFor = (error: unknown) =>
  errorMessage(
    error,
    {
      NO_ITEMS: "한 항목이라도 입력해 주세요.",
      NOT_MEASURABLE: "만 4세부터 측정할 수 있어요.",
      CONSENT_REQUIRED: "보호자 동의가 필요해요.",
      DUPLICATE_DATE: "그 날짜의 측정이 이미 있어요.",
      ITEM_NOT_ALLOWED: "지금 저장할 수 없는 항목이 섞여 있어요.",
      UNKNOWN_ITEM: "지금 저장할 수 없는 항목이 섞여 있어요.",
      ITEM_NOT_FOR_AGE_GROUP: "이 연령대에서 잴 수 없는 항목이 있어요.",
    },
    "저장하지 못했어요.",
  );

function MeasureSkeleton() {
  return (
    <>
      <PageHeader title="체력 측정" back />
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
