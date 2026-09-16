"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Illustration } from "@/components/ui/illustration";
import { Citations } from "@/components/domain/citations";
import { errorMessage } from "@/lib/errors";
import type { ChatCitation } from "@/lib/api/types";
import { useAskCoach } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** 코치에게 묻기. */
interface Turn {
  role: "USER" | "ASSISTANT";
  text: string;
  citations?: ChatCitation[];
  refused?: boolean;
}

const EXAMPLES = [
  "집에서 할 수 있는 유연성 운동 알려줘",
  "아이가 윗몸일으키기를 힘들어해요",
  "주말에 30분으로 뭘 하면 좋을까요",
];

export default function CoachChatPage() {
  const { profile, isChild } = useSession();
  const ask = useAskCoach(profile?.profileId ?? "");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, ask.isPending]);

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
          refused: res.refused,
        },
      ]);
    } catch (e) {
      setError(
        errorMessage(
          e,
          { TEMPORARILY_UNAVAILABLE: "코치가 잠시 쉬고 있어요. 조금 뒤에 다시 물어봐 주세요." },
          "답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
    }
  };

  return (
    <>
      <PageHeader title="코치에게 묻기" back />

      <Screen className="pb-20">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Illustration name="char/face-cheer" size={96} />
            <p className="text-body mt-3 font-bold">
              {isChild ? "운동에 대해 물어봐" : "운동에 대해 물어보세요"}
            </p>
            <p className="text-ink-soft mt-1 text-sm leading-relaxed">
              국민체력100 운동처방과 영상에서 찾아 답해요. 답에는 어디서 찾았는지가 같이 붙어요.
            </p>

            <ul className="mt-5 w-full space-y-2">
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
          </div>
        ) : (
          <ul className="space-y-5">
            {turns.map((turn, i) => (
              <li key={i} className={cn(turn.role === "USER" && "flex justify-end")}>
                {turn.role === "USER" ? (
                  <p className="bg-signal text-body max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 leading-relaxed text-white">
                    {turn.text}
                  </p>
                ) : (
                  <div>
                    <p className="text-body leading-relaxed whitespace-pre-wrap">{turn.text}</p>
                    {/* 거부한 답에는 인용이 없는 게 맞다. 그 외에는 항상 붙는다 */}
                    {!turn.refused && <Citations items={turn.citations} className="mt-2.5" />}
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
      </Screen>

      {/* 입력은 화면 바닥에 고정한다. 앱에서 대화는 늘 아래에서 올라온다 */}
      <div className="composer">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2 px-5 py-3"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder="무엇이든 물어보세요"
            aria-label="질문"
            className="border-line focus:border-signal placeholder:text-faint text-body max-h-28 min-h-11 flex-1 resize-none rounded-xl border bg-transparent px-4 py-2.5 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || ask.isPending}
            aria-label="보내기"
            className="press bg-signal grid size-11 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
