"use client";

import { ArrowUp, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Citations } from "@/components/domain/citations";
import { MissionSuggestionCard } from "@/components/domain/mission-suggestion-card";
import { Illustration } from "@/components/ui/illustration";
import type { ChatCitation, MissionSuggestion } from "@/lib/api/types";
import { useAskCoach } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { useIsKidView } from "@/lib/view-role";
import { cn } from "@/lib/utils";

/**
 * 어디서든 열리는 코치 창.
 *
 * 코치에게 묻기가 별도 화면이라, 무언가 보다가 궁금해지면 보던 것을 두고
 * 나가야 했다. 화면 오른쪽 아래에 늘 떠 있게 하고 그 자리에서 답을 받는다.
 *
 * 답에 미션 제안이 붙어 오면 카드로 띄우고, 부모는 버튼 하나로 미션을 만든다.
 */
interface Turn {
  role: "USER" | "ASSISTANT";
  text: string;
  citations?: ChatCitation[];
  suggestion?: MissionSuggestion | null;
  refused?: boolean;
}

const EXAMPLES = [
  "이번 주말에 같이 할 운동 하나만",
  "윗몸일으키기를 힘들어해요",
  "집에서 15분이면 뭘 할까요",
];

export function ChatDock() {
  const { profile, familyId, isChild } = useSession();
  const kidView = useIsKidView();
  const ask = useAskCoach(profile?.profileId ?? "");

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, ask.isPending, open]);

  // 열려 있는 동안 뒤 화면이 따라 스크롤되지 않게
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const send = async (question: string) => {
    const trimmed = question.trim().slice(0, 500);
    if (!trimmed || ask.isPending) return;

    setError(null);
    setDraft("");
    setTurns((t) => [...t, { role: "USER", text: trimmed }]);

    try {
      const res = await ask.mutateAsync({ question: trimmed, conversationId });
      setConversationId(res.conversationId);
      setTurns((t) => [
        ...t,
        {
          role: "ASSISTANT",
          text: res.refused
            ? "이건 제가 답하기 어려운 질문이에요. 건강에 관한 판단은 전문가와 상담해 주세요."
            : (res.answer ?? ""),
          citations: res.citations,
          suggestion: res.suggestion,
          refused: res.refused,
        },
      ]);
    } catch (e) {
      // 답 없는 물음만 남겨 두면 다시 물을 때 같은 말이 두 번 쌓인다
      setTurns((t) => t.slice(0, -1));
      setDraft(trimmed);
      setError(
        errorMessage(
          e,
          { TEMPORARILY_UNAVAILABLE: "코치가 잠시 쉬고 있어요. 조금 뒤에 다시 물어봐 주세요." },
          "답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
    }
  };

  /* 아이 화면에는 띄우지 않는다. 누를 것이 둘을 넘지 않아야 한다 */
  if (!profile || kidView) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="코치에게 묻기"
          className="press bg-signal fixed right-4 z-40 grid size-14 place-items-center rounded-full text-white shadow-lg"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <MessageCircle className="size-6" strokeWidth={2.2} aria-hidden />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/25"
          />

          <section
            role="dialog"
            aria-label="코치에게 묻기"
            className="bg-paper relative mx-auto flex max-h-[84dvh] w-full flex-col rounded-t-3xl"
            style={{ maxWidth: "var(--width-phone)" }}
          >
            <header className="border-line flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <Illustration name="item/item-whistle" size={26} className="shrink-0" />
              <h2 className="text-body min-w-0 flex-1 font-extrabold">코치</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="press text-ink-soft grid size-10 shrink-0 place-items-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {turns.length === 0 ? (
                <ul className="space-y-2">
                  {EXAMPLES.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => send(q)}
                        className="press border-line w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-4">
                  {turns.map((turn, i) => (
                    <li key={i} className={cn(turn.role === "USER" && "flex justify-end")}>
                      {turn.role === "USER" ? (
                        <p className="bg-signal text-body max-w-[82%] rounded-2xl rounded-br-md px-4 py-2.5 leading-relaxed text-white">
                          {turn.text}
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-body leading-relaxed whitespace-pre-wrap">
                            {turn.text}
                          </p>
                          {/* 거부한 답에는 인용이 없는 게 맞다 */}
                          {!turn.refused && <Citations items={turn.citations} />}
                          {turn.suggestion && !isChild && familyId && (
                            <MissionSuggestionCard
                              suggestion={turn.suggestion}
                              familyId={familyId}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  ))}

                  {ask.isPending && (
                    <li className="flex gap-1" aria-label="답을 쓰는 중">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="bg-faint size-1.5 animate-pulse rounded-full"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </li>
                  )}
                </ul>
              )}

              {error && (
                <p
                  role="alert"
                  className="bg-signal-soft text-signal-deep mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  {error}
                </p>
              )}
              <div ref={bottom} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="border-line flex shrink-0 items-end gap-2 border-t px-4 py-3"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                placeholder={isChild ? "뭐든 물어봐" : "무엇이든 물어보세요"}
                aria-label="질문"
                className="border-line focus:border-signal placeholder:text-faint text-body field-focus min-h-11 flex-1 rounded-xl border bg-transparent px-4"
              />
              <button
                type="submit"
                disabled={!draft.trim() || ask.isPending}
                aria-label="보내기"
                className="press bg-signal grid size-11 shrink-0 place-items-center rounded-xl text-white disabled:opacity-55"
              >
                <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
