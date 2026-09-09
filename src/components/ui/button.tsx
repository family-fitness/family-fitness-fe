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
  "press inline-flex items-center justify-center gap-2 font-bold disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-signal text-white",
        soft: "bg-signal-soft text-signal-deep",
        outline: "border-line text-ink border-1.5 border",
        ghost: "text-ink-soft",
        // 되돌리기 어려운 동작(거절, 동의 철회)에만
        danger: "border-line text-ink-soft border",
      },
      size: {
        sm: "h-9 rounded-lg px-3.5 text-sm",
        md: "h-11 rounded-xl px-5 text-[0.95rem]",
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

export function Button({ className, variant, size, loading, children, ...props }: Props) {
  return (
    <button
      className={cn(button({ variant, size }), className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
