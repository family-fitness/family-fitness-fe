"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { ChoiceButton } from "@/components/app-shell/wizard";
import { ConsentTermsSheet, TermsLink } from "@/components/domain/consent-terms-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackSheet } from "@/components/ui/use-back-sheet";
import type { GuardianConsent, PendingInvite, ProfileSummary, Role } from "@/lib/api/types";
import { useCreateFamilyInvite, useOpenInvite } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { familyInviteBody, inviteCodeTitle, inviteLink, inviteShareText } from "@/lib/invite";
import type { ConsentKind } from "@/lib/legal";
import { useSession } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { radioKeys } from "@/components/ui/radio-keys";

/** 고른 것 — 새로 부를 보호자나 아이, 아니면 이미 등록한 구성원의 자리 */
type Choice = { kind: "role"; role: Role } | { kind: "seat"; profileId: string };

/** 만든 코드와 보낼 것 */
type Made = { code: string; link: string; title: string; share: string; until: string | null };

const NO_CONSENT: GuardianConsent = { personalData: false, healthData: false };

/** 이미 만든 가족 초대를 다시 보여 줄 때 — 가족 관리의 「보낸 초대」 줄 */
function madeFrom(invite: Pick<PendingInvite, "code" | "role" | "expiresAt">, familyName: string) {
  const code = invite.code ?? "";
  const role = invite.role ?? "PARENT";
  return {
    code,
    link: inviteLink(window.location.origin, code),
    title: inviteCodeTitle({ role }),
    share: inviteShareText({ familyName, code, role }),
    until: invite.expiresAt ? formatDate(invite.expiresAt) : null,
  };
}

/**
 * 보호자가 초대 코드를 만드는 곳.
 *
 * 보호자와 아이 모두 초대를 먼저 한다(10번). 누구를 부를지(보호자, 아이)만 고르면 가족 초대 코드가 생기고,
 * 받은 사람이 자기 이름, 생년월일, 성별을 넣고 들어온다. 아이로 부르면 아이 등록과 같은 보호자 동의를 먼저 받는다.
 *
 * 폰 없이 등록해 둔 구성원(보호자가 정보를 넣은 아이)에게 폰이 생기면 그 자리 초대를 쓴다. 등록한 구성원이
 * 아래에 따로 서고, 구성원 줄의 「초대하기」 로 열면 그 자리를 골라 둔 채 열린다.
 * 만든 코드는 크게 보이고, 코드나 링크를 복사하거나 폰의 공유(카카오톡, 문자)로 보낸다.
 */
export function InviteSheet({
  open,
  onClose,
  familyName,
  members,
  loading = false,
  initialId,
  shown,
}: {
  open: boolean;
  onClose: () => void;
  familyName: string;
  members: ProfileSummary[];
  /** 가족 목록을 받는 중 — 등록한 구성원이 없는 것처럼 그리지 않는다 */
  loading?: boolean;
  /** 이 사람 자리로 바로 — 구성원 줄의 「초대하기」 에서 열 때 */
  initialId?: string | null;
  /** 이미 만든 가족 초대를 다시 보여 준다 — 가족 관리의 「보낸 초대」 줄에서 열 때 */
  shown?: Pick<PendingInvite, "code" | "role" | "expiresAt"> | null;
}) {
  const { familyId } = useSession();
  // 아직 계정이 없는 자리만 부를 수 있다. 부모 자리가 먼저다
  const seats = members
    .filter((m) => !m.hasAccount)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "PARENT" ? -1 : 1));
  const choiceOf = (id: string | null | undefined): Choice | null =>
    id && seats.some((s) => s.profileId === id) ? { kind: "seat", profileId: id } : null;

  const [choice, setChoice] = useState<Choice | null>(() => choiceOf(initialId));
  const [consent, setConsent] = useState<GuardianConsent>(NO_CONSENT);
  const [made, setMade] = useState<Made | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 동의 상세내용 — 뒤로 가기를 누르면 이 시트에 남는다
  const terms = useBackSheet<ConsentKind>();

  const seatInvite = useOpenInvite();
  const familyInvite = useCreateFamilyInvite(familyId);

  // 열릴 때마다 처음부터 — 부를 자리는 연 줄의 사람으로. 닫을 때 비우면 내려가는 동안 내용이 바뀌고,
  // 부르는 쪽이 key 로 새로 그리면 내려가지도 못하고 사라졌다
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChoice(choiceOf(initialId));
      setConsent(NO_CONSENT);
      setMade(shown?.code ? madeFrom(shown, familyName) : null);
      setError(null);
      setCopied(null);
    }
  }

  const seat =
    choice?.kind === "seat" ? seats.find((s) => s.profileId === choice.profileId) : undefined;
  const body = choice?.kind === "role" ? familyInviteBody(choice.role, consent) : null;
  const ready = Boolean(seat?.profileId) || (body != null && Boolean(familyId));
  const pending = seatInvite.isPending || familyInvite.isPending;

  const make = async () => {
    setError(null);
    if (seat?.profileId) {
      try {
        const res = await seatInvite.mutateAsync(seat.profileId);
        const code = res.claimCode ?? "";
        const name = seat.name ?? "";
        setMade({
          code,
          // 서버가 준 주소가 먼저다. 없으면 이 앱의 합류 화면으로
          link: res.shareUrl ?? inviteLink(window.location.origin, code),
          title: inviteCodeTitle({ role: seat.role ?? "PARENT", seatName: name }),
          share: inviteShareText({ familyName, code, role: seat.role ?? "PARENT", seatName: name }),
          // 언제까지 쓰는지는 서버가 정한다
          until: res.expiresAt ? formatDate(res.expiresAt) : null,
        });
      } catch (e) {
        setError(
          errorMessage(
            e,
            { ALREADY_CLAIMED: "이미 계정이 연결된 자리예요." },
            "초대 코드를 만들지 못했어요.",
          ),
        );
      }
      return;
    }
    if (!body) return;
    try {
      const res = await familyInvite.mutateAsync(body);
      setMade(
        madeFrom(
          { code: res.code, role: res.role ?? body.role, expiresAt: res.expiresAt },
          familyName,
        ),
      );
    } catch (e) {
      setError(
        errorMessage(
          e,
          { CONSENT_REQUIRED: "아이로 초대하려면 보호자 동의가 필요해요." },
          "초대 코드를 만들지 못했어요.",
        ),
      );
    }
  };

  const copy = (what: "code" | "link", text: string) => {
    // 복사가 안 되는 브라우저(주소가 https 가 아닐 때 등) — 조용히 넘어가면 복사된 줄 안다
    if (!navigator.clipboard) {
      setError("복사하지 못했어요.");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(what);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => setError("복사하지 못했어요."));
  };

  // 폰의 공유 — 카카오톡, 문자, 메일. 안 되는 브라우저(데스크톱 일부)에서는 링크 복사로
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    if (!made) return;
    try {
      await navigator.share({ title: "우리가족 체력키움 초대", text: made.share, url: made.link });
    } catch (e) {
      // 사람이 공유 창을 닫았다 — 실패가 아니다
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("보내지 못했어요.");
    }
  };

  const pickRole = (role: Role) => {
    setChoice({ kind: "role", role });
    setError(null);
  };

  return (
    <Sheet open={open} onClose={onClose} title="초대하기">
      {made ? (
        <div className="pb-2">
          <p className="text-caption text-ink-soft text-center font-bold">{made.title}</p>
          <p
            className="board-num mt-2 text-center text-4xl tracking-[0.25em]"
            aria-label={`초대 코드 ${made.code.split("").join(" ")}`}
          >
            {made.code}
          </p>
          <p className="text-caption text-ink-soft mt-2 text-center">
            {made.until ? `${made.until}까지` : ""}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => copy("code", made.code)}
              className="press bg-sub flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
            >
              {copied === "code" ? (
                <Check aria-hidden className="text-done size-4" strokeWidth={3} />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied === "code" ? "복사했어요" : "코드 복사"}
            </button>
            <button
              type="button"
              onClick={() => copy("link", made.link)}
              className="press bg-sub flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
            >
              {copied === "link" ? (
                <Check aria-hidden className="text-done size-4" strokeWidth={3} />
              ) : (
                <Link2 aria-hidden className="size-4" />
              )}
              {copied === "link" ? "복사했어요" : "링크 복사"}
            </button>
          </div>
          {canShare && (
            <Button size="block" className="mt-2 gap-2" onClick={() => void share()}>
              <Share2 aria-hidden className="size-4" />
              카카오톡이나 문자로 보내기
            </Button>
          )}
        </div>
      ) : (
        <div className="pb-2">
          <p className="text-body font-bold">누구를 초대할까요</p>
          <p className="text-caption text-ink-soft mt-0.5">
            이름과 생년월일은 초대받은 분이 직접 입력해요
          </p>
          <div
            className="mt-3 space-y-2"
            role="radiogroup"
            aria-label="초대할 사람"
            onKeyDown={radioKeys}
          >
            <ChoiceButton
              selected={choice?.kind === "role" && choice.role === "PARENT"}
              onClick={() => pickRole("PARENT")}
              title="보호자"
            />
            <ChoiceButton
              selected={choice?.kind === "role" && choice.role === "CHILD"}
              onClick={() => pickRole("CHILD")}
              title="아이"
            />
          </div>

          {/* 아이로 부르면 아이 등록과 같은 보호자 동의를 먼저 받는다 */}
          {choice?.kind === "role" && choice.role === "CHILD" && (
            <fieldset className="mt-5">
              <legend className="text-ink-soft text-sm font-bold">보호자 동의가 필요해요</legend>
              <div className="mt-2 space-y-2">
                <div>
                  <ChoiceButton
                    multi
                    selected={consent.personalData}
                    onClick={() => setConsent((c) => ({ ...c, personalData: !c.personalData }))}
                    title="개인정보 수집 및 이용에 동의해요(필수)"
                  />
                  <div className="flex">
                    <TermsLink
                      label="개인정보 수집 및 이용"
                      onClick={() => terms.show("personal")}
                    />
                  </div>
                </div>
                <div>
                  <ChoiceButton
                    multi
                    selected={consent.healthData}
                    onClick={() => setConsent((c) => ({ ...c, healthData: !c.healthData }))}
                    title="민감정보(건강정보) 처리에 동의해요(필수)"
                  />
                  <div className="flex">
                    <TermsLink label="건강정보 처리" onClick={() => terms.show("health")} />
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          {/* 폰 없이 등록해 둔 구성원 — 폰이 생기면 그 자리에 계정을 붙인다 */}
          {loading ? (
            <div className="mt-5 space-y-3" aria-hidden>
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            seats.length > 0 && (
              <div className="mt-5">
                <p className="text-ink-soft text-sm font-bold">등록한 구성원</p>
                <div
                  className="divide-rows mt-1"
                  role="radiogroup"
                  aria-label="등록한 구성원"
                  onKeyDown={radioKeys}
                >
                  {seats.map((m) => {
                    const on = choice?.kind === "seat" && choice.profileId === m.profileId;
                    return (
                      <button
                        key={m.profileId}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          if (m.profileId) setChoice({ kind: "seat", profileId: m.profileId });
                          setError(null);
                        }}
                        className="press flex min-h-14 w-full items-center gap-3 text-left"
                      >
                        <ProfileAvatar
                          profileId={m.profileId}
                          name={m.name}
                          tone={m.role === "CHILD" ? "signal" : "mark"}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-extrabold">{m.name}</span>
                          <span className="text-caption text-ink-soft block">
                            {m.role === "PARENT" ? "부모" : "자녀"}
                            {m.ageGroup && <span className="ml-2">{m.ageGroup}</span>}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-6 place-items-center rounded-full border-2",
                            on ? "border-signal bg-signal text-white" : "border-line",
                          )}
                        >
                          {on && <Check className="size-3.5" strokeWidth={3.5} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          <Button
            size="block"
            className="mt-4"
            disabled={!ready}
            loading={pending}
            onClick={() => void make()}
          >
            초대 코드 만들기
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-semibold">
          {error}
        </p>
      )}
      {/* 이 시트의 transform 안에 갇히지 않게 body 에 붙인다. 처음 연 뒤에만 그린다(서버에는 document 가 없다) */}
      {terms.value != null &&
        createPortal(
          <ConsentTermsSheet kind={terms.value} open={terms.open} onClose={terms.hide} />,
          document.body,
        )}
    </Sheet>
  );
}
