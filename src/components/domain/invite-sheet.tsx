"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { NavLink } from "@/components/ui/nav-link";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileSummary } from "@/lib/api/types";
import { useOpenInvite } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { cn, formatDate } from "@/lib/utils";

/**
 * 부모가 초대코드를 만드는 곳(9/25 「부모가 초대코드 만드는 거」).
 *
 * 코드는 가족 전체가 아니라 **자리 하나**에 맞는다 — 받은 사람은 그 자리로만 들어오고 역할을
 * 고를 수 없다(부모 권한이 곧 코치 승인 권한이다). 그래서 먼저 누구를 부를지 고른다.
 * 만든 코드는 크게 보이고, 코드 · 링크를 복사하거나 폰의 공유(카카오톡 · 문자)로 보낸다.
 */
export function InviteSheet({
  open,
  onClose,
  familyName,
  members,
  loading = false,
  initialId,
}: {
  open: boolean;
  onClose: () => void;
  familyName: string;
  members: ProfileSummary[];
  /** 가족 목록을 받는 중 — 「모두 들어와 있어요」 로 그리지 않는다 */
  loading?: boolean;
  /** 이 사람 자리로 바로 — 구성원 줄의 「초대하기」 에서 열 때 */
  initialId?: string | null;
}) {
  // 아직 계정이 없는 자리만 부를 수 있다. 부모 자리가 먼저다
  const seats = members
    .filter((m) => !m.hasAccount)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "PARENT" ? -1 : 1));
  const [picked, setPicked] = useState<string | null>(initialId ?? null);
  const seat = seats.find((m) => m.profileId === picked) ?? seats[0];

  const invite = useOpenInvite();
  const [code, setCode] = useState<{
    code: string;
    link: string;
    for: string;
    until: string | null;
  } | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCode(null);
    setError(null);
    onClose();
  };

  const make = async () => {
    if (!seat?.profileId) return;
    setError(null);
    try {
      const res = await invite.mutateAsync(seat.profileId);
      const c = res.claimCode ?? "";
      setCode({
        code: c,
        // 서버가 준 주소가 먼저다. 없으면 이 앱의 초대코드 화면으로
        link: res.shareUrl ?? `${window.location.origin}/claim?code=${encodeURIComponent(c)}`,
        for: seat.name ?? "",
        // 언제까지 쓰는지는 서버가 정한다
        until: res.expiresAt ? formatDate(res.expiresAt) : null,
      });
    } catch (e) {
      setError(
        errorMessage(
          e,
          { ALREADY_CLAIMED: "이미 계정이 연결된 자리예요." },
          "초대코드를 만들지 못했어요.",
        ),
      );
    }
  };

  const copy = (what: "code" | "link", text: string) => {
    // 복사가 안 되는 브라우저(주소가 https 가 아닐 때 등) — 조용히 넘어가면 복사된 줄 안다
    if (!navigator.clipboard) {
      setError("복사하지 못했어요. 길게 눌러 직접 골라 주세요.");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(what);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => setError("복사하지 못했어요. 길게 눌러 직접 골라 주세요."));
  };

  // 폰의 공유 — 카카오톡 · 문자 · 메일. 안 되는 브라우저(데스크톱 일부)에서는 링크 복사로
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    if (!code) return;
    try {
      await navigator.share({
        title: "우리가족 체력키움 초대",
        text: `${familyName}에 ${code.for} 자리로 들어와요. 초대코드 ${code.code}`,
        url: code.link,
      });
    } catch (e) {
      // 사람이 공유 창을 닫았다 — 실패가 아니다. 그 밖에는 링크 복사로 돌린다
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("보내지 못했어요. 링크를 복사해 보내 주세요.");
    }
  };

  return (
    <Sheet open={open} onClose={close} title="초대하기">
      {loading ? (
        <div className="space-y-3 pb-2" aria-hidden>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : seats.length === 0 ? (
        <div className="pb-2 text-center">
          <p className="text-body font-bold">모두 들어와 있어요</p>
          <NavLink
            href="/parent/family"
            onClick={close}
            className="press bg-sub mt-3 flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
          >
            가족 더하기
          </NavLink>
        </div>
      ) : code ? (
        <div className="pb-2">
          <p className="text-caption text-ink-soft text-center font-bold">
            {code.for} 자리 초대코드
          </p>
          <p
            className="board-num mt-2 text-center text-4xl tracking-[0.25em]"
            aria-label={`초대코드 ${code.code.split("").join(" ")}`}
          >
            {code.code}
          </p>
          <p className="text-caption text-ink-soft mt-2 text-center">
            {code.until ? `${code.until}까지` : ""}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => copy("code", code.code)}
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
              onClick={() => copy("link", code.link)}
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
              카카오톡 · 문자로 보내기
            </Button>
          )}
        </div>
      ) : (
        <div className="pb-2">
          <p className="text-body font-bold">누구를 부를까요</p>
          <ul className="divide-rows mt-1" role="radiogroup" aria-label="부를 사람">
            {seats.map((m) => {
              const on = m.profileId === seat?.profileId;
              return (
                <li key={m.profileId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPicked(m.profileId ?? null)}
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
                        {m.role === "PARENT" ? "부모" : "자녀"} · {m.ageGroup}
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
                </li>
              );
            })}
          </ul>
          <Button
            size="block"
            className="mt-3"
            loading={invite.isPending}
            onClick={() => void make()}
          >
            초대코드 만들기
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-semibold">
          {error}
        </p>
      )}
    </Sheet>
  );
}
