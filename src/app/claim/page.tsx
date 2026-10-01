"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { NavLink } from "@/components/ui/nav-link";
import type { InvitePeek, Role } from "@/lib/api/types";
import { useClaimProfile, useInvitePeek } from "@/lib/api/queries";
import { rangeHint } from "@/lib/body";
import {
  type JoinForm,
  blocksClaim,
  claimBody,
  claimErrorMessage,
  inviteBirthRule,
  invitePeekLine,
  isFamilyInvite,
  joinButtonLabel,
  joinProblem,
  joinReady,
  normalizeCode,
} from "@/lib/invite";
import { NEW_ACCOUNT_PATH } from "@/lib/family";
import { useSession, useSignOut } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Initial } from "@/components/ui/initial";
import { ArtIcon } from "@/components/ui/art-icon";

const EMPTY_FORM: JoinForm = { name: "", birthDate: "", sex: null, height: "", weight: "" };

/** 초대 수락. */
export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimContent />
    </Suspense>
  );
}

function ClaimContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);
  const claim = useClaimProfile();
  const signOut = useSignOut();
  // 가족이 없는 계정은 새 가족 만들기와 초대 코드로 참여하기를 고르는 화면에서 왔다. 거기로 돌아갈 수 있다
  const { nextStep } = useSession();
  const noFamily = nextStep === "CREATE_FAMILY" || nextStep === "CLAIM";
  /*
    이미 가족이 있는 계정(초대한 보호자가 제 폰에서 링크를 열었거나, 다른 가족에 있는 계정)은 이 코드로 들어갈 수 없다.
    정보를 다 적은 뒤에야 알면 안 되니 폼을 띄우지 않는다. 서버는 정보가 빠졌는지 보기 전에 409 ALREADY_MEMBER 나
    409 ALREADY_IN_FAMILY 를 주므로, 「가족 참여하기」 는 코드만 보내 까닭을 바로 받는다
  */
  const hasFamily = nextStep === "HOME" || nextStep === "SUPPORT_MODE";

  const [code, setCode] = useState(() => normalizeCode(params.get("code") ?? ""));
  const [form, setForm] = useState<JoinForm>(EMPTY_FORM);
  /** 마지막으로 누른 참여가 실패한 까닭. 문구는 lib/invite 의 표 하나로 정한다 */
  const [failure, setFailure] = useState<unknown>(null);
  /*
    코드가 어디로 들어가는 초대인지 넣기 전에 본다.

    가족 초대(FAMILY)면 가족 이름과 역할(보호자, 아이)이 오고, 들어오는 사람이 자기 이름, 생년월일, 성별을 넣는다.
    자리 초대(PROFILE)면 보호자가 먼저 등록해 둔 자리 이름이 온다 — 그 자리로만 들어가고 역할을 고를 수 없다.
  */
  // 로그인 전에는 묻지 않는다 — 이 화면은 곧 로그인으로 넘어간다
  const peek = useInvitePeek(token ? code : "");
  const seat = peek.data;
  // 들어오는 사람이 자기 정보를 넣는 가족 초대인가. 이미 가족이 있는 계정이면 폼을 띄우지 않는다
  const family = isFamilyInvite(seat) && !hasFamily;
  /*
    미리 보기가 「이 코드로는 못 들어간다」 고 할 때만 막는다(없음, 기한, 이미 씀, 너무 많이 틀림). 미리 보기가 없는 서버이거나 망이 흔들렸으면 넣어 보게 둔다 — 진짜 답은 `/profiles/claim` 이 준다.
    전에는 미리 보기가 안 되면 단추가 영영 잠겼다
  */
  const badCode = blocksClaim(peek.error) ? peek.error : null;
  const shownError = failure ?? badCode;
  // 다른 가족에 이미 있는 계정 — 탈퇴는 설정에 있다
  const inOtherFamily = shownError instanceof ApiError && shownError.code === "ALREADY_IN_FAMILY";
  const role: Role = seat?.role ?? "PARENT";
  const problem = family ? joinProblem(role, form) : null;
  const canSubmit =
    code.length === 6 &&
    !badCode &&
    !peek.isFetching &&
    !claim.isPending &&
    (!family || joinReady(role, form));

  // 로그인부터 해야 프로필을 붙일 수 있다. 코드는 들고 간다
  useEffect(() => {
    if (token) return;
    const id = setTimeout(() => {
      if (useAuthStore.getState().accessToken) return;
      const query = code ? `?claimCode=${encodeURIComponent(code)}` : "";
      router.replace(`/login${query}`);
    }, 350);
    return () => clearTimeout(id);
  }, [token, code, router]);

  const submit = async () => {
    if (!canSubmit) return;
    setFailure(null);
    try {
      const res = await claim.mutateAsync(claimBody(code, family ? seat : null, form));
      // 가입 도중이라는 걸 다음 화면이 알아야 한다. 고르고 나서 멈추면 안 된다
      router.replace(
        res.nextStep === "SUPPORT_MODE" ? "/settings/support-mode?from=claim" : "/start",
      );
    } catch (e) {
      setFailure(e);
    }
  };

  const edit = (patch: Partial<JoinForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setFailure(null);
  };

  return (
    <PlainScreen className="flex min-h-dvh flex-col justify-center gap-7 py-8">
      {noFamily && (
        <button
          type="button"
          onClick={() => router.replace(NEW_ACCOUNT_PATH)}
          aria-label="뒤로"
          className="press text-ink-soft fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-2 grid size-11 place-items-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
      )}
      <div className="flex flex-col items-center text-center">
        <ArtIcon name="icon/menu-invite" className="size-16" />
        <h1 className="page-title mt-3">초대 코드를 입력해 주세요</h1>
      </div>

      <div className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            setCode(normalizeCode(e.target.value));
            setFailure(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !family && void submit()}
          placeholder="ABC123"
          inputMode="text"
          autoCapitalize="characters"
          aria-label="초대 코드 여섯 자리"
          className="border-line focus:border-signal placeholder:text-faint board-num field-focus h-16 w-full rounded-xl border bg-transparent text-center text-2xl tracking-[0.35em]"
        />

        {/* 어디로 들어가는 초대인지. 코드가 맞아야 뜬다 — 둥근 면에 담지 않고 한 줄로 */}
        {seat && <SeatLine seat={seat} />}

        {seat && hasFamily && shownError == null && (
          <p role="status" className="text-ink-soft text-center text-sm font-semibold">
            이미 가족이 있는 계정으로 로그인했어요
          </p>
        )}

        {/* 가족 초대 — 들어오는 사람이 자기 정보를 넣는다 */}
        {seat && family && <JoinFields role={role} form={form} onChange={edit} problem={problem} />}

        {shownError != null && (
          <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
            {claimErrorMessage(shownError)}
          </p>
        )}
        {inOtherFamily && (
          <NavLink
            href="/settings"
            className="press text-signal-strong mx-auto flex min-h-11 w-fit items-center px-4 text-sm font-bold"
          >
            설정으로 가기
          </NavLink>
        )}

        <Button size="block" disabled={!canSubmit} loading={claim.isPending} onClick={submit}>
          {joinButtonLabel(seat)}
        </Button>

        {/* 다른 계정으로 들어왔거나 코드가 없으면 — 이 화면에서 나갈 길 */}
        <button
          type="button"
          onClick={() => {
            router.replace("/login");
            signOut();
          }}
          className="press text-ink-soft mx-auto flex min-h-11 items-center px-4 text-sm font-bold"
        >
          다른 계정으로 들어가기
        </button>
      </div>
    </PlainScreen>
  );
}

/** 미리 보기 한 줄 — 가족 초대면 가족과 역할, 자리 초대면 그 자리. 누가 보냈는지 */
function SeatLine({ seat }: { seat: InvitePeek }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Initial
        name={isFamilyInvite(seat) ? seat.familyName : seat.profileName}
        tone={seat.role === "CHILD" ? "signal" : "mark"}
        size="lg"
      />
      <span className="min-w-0 flex-1">
        <span className="text-body block font-extrabold">{invitePeekLine(seat)}</span>
        <span className="text-ink-soft text-caption mt-0.5 block">
          {seat.invitedByName ? `${seat.invitedByName}님이 보냈어요` : "초대를 받았어요"}
        </span>
      </span>
    </div>
  );
}

/**
 * 가족 초대로 들어오는 사람의 정보 — 이름, 생년월일, 성별. 키와 몸무게는 골라서.
 * 생년월일은 첫 시작과 같은 달력 부품과 같은 고르기 범위다(보호자, 아이)
 */
function JoinFields({
  role,
  form,
  onChange,
  problem,
}: {
  role: Role;
  form: JoinForm;
  onChange: (patch: Partial<JoinForm>) => void;
  problem: string | null;
}) {
  const kid = role === "CHILD";
  const sexes = kid
    ? ([
        ["F", "여자아이"],
        ["M", "남자아이"],
      ] as const)
    : ([
        ["F", "여성"],
        ["M", "남성"],
      ] as const);
  return (
    <div className="space-y-4 pt-1">
      <Field label="이름">
        <input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
          autoComplete="given-name"
          enterKeyHint="next"
          className="field"
        />
      </Field>

      <Field label="생년월일">
        <DateField
          label="생년월일"
          value={form.birthDate}
          onChange={(birthDate) => onChange({ birthDate })}
          rule={inviteBirthRule(role)}
        />
      </Field>

      <Field label="성별" group>
        <div className="flex gap-2">
          {sexes.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ sex: value })}
              aria-pressed={form.sex === value}
              className={cn("chip press", form.sex === value && "chip-on")}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <BodyInput
          label="키(선택)"
          unit="cm"
          value={form.height}
          onChange={(height) => onChange({ height })}
          hint={rangeHint("heightCm")}
        />
        <BodyInput
          label="몸무게(선택)"
          unit="kg"
          value={form.weight}
          onChange={(weight) => onChange({ weight })}
          hint={rangeHint("weightKg")}
        />
      </div>

      {problem && (
        <p role="status" className="text-signal-deep text-sm font-semibold">
          {problem}
        </p>
      )}
    </div>
  );
}

/** 단위가 붙은 숫자 칸 — 키, 몸무게 */
function BodyInput({
  label,
  unit,
  value,
  onChange,
  hint,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="text-ink-soft block text-xs font-bold">{label}</span>
      <span className="relative mt-1.5 flex items-center">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field pr-11"
        />
        <span className="text-ink-soft absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold">
          {unit}
        </span>
      </span>
      <span className="text-faint text-caption mt-1 block">{hint}</span>
    </label>
  );
}
