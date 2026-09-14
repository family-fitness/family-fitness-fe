"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { MeasureField } from "@/components/domain/measure-field";
import { ApiError } from "@/lib/api/client";
import type { CreateFitnessTestRequest, FitnessItemCode, MeasurementSource } from "@/lib/api/types";
import { useCreateFitnessTest, useFitnessItems, useMyProfiles } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

/**
 * 체력 측정 입력.
 *
 * 폼을 두 구역으로 나눈다 — `optionalInput` 이 기준이다.
 * 악력계가 있는 집이 거의 없어서, 첫 화면에서 장비를 요구하면 거기서 이탈한다.
 * 선택 구역은 접힌 상태로 시작한다.
 *
 * 서버 검증이 세 갈래로 갈린다. 코드마다 다른 문구를 보여준다.
 *   NO_MEASURED_ITEM · NOT_MEASURABLE_AGE · GUARDIAN_CONSENT_REQUIRED
 */
export default function MeasurePage() {
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();

  const { data: profiles, isPending: profilesPending } = useMyProfiles();
  const profile = profiles?.find((p) => p.id === profileId);
  const { data: items, isPending: itemsPending } = useFitnessItems(profile?.ageGroup ?? undefined);

  const [showOptional, setShowOptional] = useState(false);
  const [source, setSource] = useState<MeasurementSource>("HOME");
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<Record<string, string>>();
  const values = watch();

  const create = useCreateFitnessTest(profileId);

  const { required, optional } = useMemo(() => {
    const list = items ?? [];
    return {
      required: list.filter((i) => !i.optionalInput),
      optional: list.filter((i) => i.optionalInput),
    };
  }, [items]);

  const filledCount = Object.values(values).filter((v) => v !== "" && v !== undefined).length;

  if (profilesPending || itemsPending) return <MeasureSkeleton />;

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 폼을 띄우지 않는다
  if (profile && !profile.measurable) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="too-young"
            title="만 4세부터 측정할 수 있어요"
            description={`${profile.displayName}는 아직 국민체력100 기준이 없어요. 지금은 가족 미션에 함께 참여할 수 있어요.`}
          />
        </Screen>
      </>
    );
  }

  // 동의가 철회되면 저장이 403 이다. 폼을 채우게 두고 나중에 막으면 헛수고가 된다
  if (profile && !profile.consentHealthAt) {
    return (
      <>
        <PageHeader eyebrow="MEASURE" title="체력 측정" back />
        <Screen>
          <EmptyState
            scene="waiting-approval"
            title="보호자 동의가 필요해요"
            description="건강 정보를 저장하려면 보호자 동의가 있어야 해요. 설정에서 동의를 다시 켜면 측정을 입력할 수 있어요."
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

  const onSubmit = handleSubmit(async (form) => {
    setServerError(null);

    const measured = Object.entries(form)
      .filter(([, value]) => value !== "" && value !== undefined)
      .map(([code, value]) => ({ item: code as FitnessItemCode, value: Number(value) }))
      .filter((entry) => Number.isFinite(entry.value));

    const body: CreateFitnessTestRequest = {
      measuredOn: new Date().toISOString().slice(0, 10),
      source,
      items: measured,
    };

    try {
      await create.mutateAsync(body);
      router.replace(`/p/${profileId}/result`);
    } catch (error) {
      // 서버가 보낸 코드마다 다른 말을 한다. 같은 문구로 뭉뚱그리면 뭘 고쳐야 할지 모른다
      if (error instanceof ApiError) {
        setServerError(
          error.code === "NO_MEASURED_ITEM"
            ? "한 항목이라도 입력해 주세요."
            : error.code === "NOT_MEASURABLE_AGE"
              ? "만 4세부터 측정할 수 있어요."
              : error.code === "GUARDIAN_CONSENT_REQUIRED"
                ? "보호자 동의가 필요해요. 설정에서 확인해 주세요."
                : error.message,
        );
      } else {
        setServerError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }
  });

  return (
    <>
      <PageHeader
        eyebrow="MEASURE"
        title={profile ? `${profile.displayName} 측정` : "체력 측정"}
        back
        meta={
          <>
            <span>{filledCount}개 입력함</span>
            <span className="text-faint">한 항목만 넣어도 결과가 나와요</span>
          </>
        }
      />

      <Screen>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* 어디서 쟀는지 — 센터 결과지를 보고 옮겨 적는 경우가 많다 */}
          <fieldset>
            <legend className="text-ink-soft mb-2 text-xs font-bold">어디서 쟀나요</legend>
            <div className="flex gap-2">
              {(
                [
                  ["HOME", "집에서 직접"],
                  ["CENTER", "센터 결과지 보고"],
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

          <section>
            <div className="section-head">
              <h2>집에서 잴 수 있어요</h2>
            </div>
            <div className="divide-rows">
              {required.map((item) => (
                <MeasureField key={item.code} item={item} register={register(item.code)} />
              ))}
            </div>
          </section>

          {/* 장비가 필요한 항목은 접어 둔다. 첫 화면에서 장비를 요구하면 거기서 이탈한다 */}
          {optional.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                aria-expanded={showOptional}
                className="press border-line flex w-full items-center gap-2 rounded-xl border px-4 py-3.5 text-left"
              >
                <Illustration name="item/item-tape" size={28} />
                <span className="flex-1">
                  <span className="block text-sm font-bold">장비가 있으면 더 정확해요</span>
                  <span className="text-faint text-xs">
                    악력계 · 넓은 공간이 필요한 {optional.length}개 항목
                  </span>
                </span>
                {showOptional ? (
                  <ChevronUp className="text-faint size-4" aria-hidden />
                ) : (
                  <ChevronDown className="text-faint size-4" aria-hidden />
                )}
              </button>

              {showOptional && (
                <div className="divide-rows mt-1">
                  {optional.map((item) => (
                    <MeasureField key={item.code} item={item} register={register(item.code)} />
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

function MeasureSkeleton() {
  return (
    <>
      <PageHeader eyebrow="MEASURE" title="체력 측정" back />
      <Screen className="space-y-6">
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
