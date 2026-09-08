"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-grow text-white hover:bg-grow-700",
        soft: "bg-grow-50 text-grow hover:bg-grow-100",
        outline: "border border-line text-ink hover:bg-line/40",
        ghost: "text-mute hover:bg-line/40",
        // 되돌리기 어려운 동작(거절, 동의 철회)에만 쓴다
        danger: "border border-mark/40 text-mark hover:bg-mark-soft",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[0.95rem]",
        lg: "h-13 px-6 text-base",
        // 화면 아래에 붙는 주 동작 버튼
        block: "h-13 w-full px-6 text-base",
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
