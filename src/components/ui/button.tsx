"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 크기가 넷인 이유는 화면마다 손이 다르기 때문이다.
 * kid 는 아이가 직접 누르는 버튼이다. 조사한 권장치(6~8세 50~60pt)에 맞춰 64px 로 뒀다.
 */
const button = cva(
  "press inline-flex items-center justify-center gap-2 font-bold disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        // 아직 못 누를 때(data-off)는 회색 면에 진한 글자 — 흐린 파랑 위 흰 글자는 읽히지 않았다.
        // 보내는 중(loading)은 파랑 그대로 둔다. 누른 것이 회색으로 바뀌면 안 눌린 것처럼 보인다
        primary:
          "bg-signal-strong text-white disabled:opacity-100 data-off:bg-line data-off:text-ink-soft",
        soft: "bg-signal-soft text-signal-deep",
        outline: "border-line text-ink border-1.5 border",
        ghost: "text-ink-soft",
        // 되돌리기 어려운 동작(거절, 동의 철회)에만
        danger: "border-line text-ink-soft border",
      },
      size: {
        sm: "h-9 rounded-lg px-3.5 text-sm",
        md: "h-11 rounded-xl px-5 text-body",
        block: "h-13 w-full rounded-xl px-6 text-base",
        kid: "h-16 w-full rounded-2xl px-6 text-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  loading?: boolean;
  children: ReactNode;
}

export function Button({ className, variant, size, loading, disabled, children, ...props }: Props) {
  return (
    // disabled 를 props 에 남겨 두면 뒤의 펼침이 loading 을 덮어써 보내는 중에도 눌렸다
    <button
      {...props}
      className={cn(button({ variant, size }), className)}
      data-off={disabled && !loading ? "" : undefined}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
