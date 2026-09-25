"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 아직 못 누를 때(data-off)만 흐려진다. 보내는 중(loading)은 누르지 못해도 흐리지 않는다 —
 * 누른 것이 흐려지면 안 눌린 것처럼 보인다.
 */
const button = cva(
  "press inline-flex items-center justify-center gap-2 font-bold disabled:pointer-events-none data-off:opacity-55",
  {
    variants: {
      variant: {
        // 아직 못 누를 때는 회색 면에 진한 글자 — 흐린 파랑 위 흰 글자는 읽히지 않았다
        primary:
          "bg-signal-strong text-white data-off:bg-line data-off:text-ink-soft data-off:opacity-100",
        soft: "bg-signal-soft text-signal-deep",
        // 바탕(#f4f5f7) 위에서 보이는 테 — 1px 옅은 선은 바탕에 묻혔다
        outline: "border-line text-ink border-[1.5px]",
        // 되돌리기 어려운 동작(거절, 동의 철회)에만
        danger: "border-line text-ink-soft border",
      },
      size: {
        md: "h-11 rounded-xl px-5 text-body",
        block: "h-13 w-full rounded-xl px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  type = "button",
  children,
  ...props
}: Props) {
  return (
    // disabled 를 props 에 남겨 두면 뒤의 펼침이 loading 을 덮어써 보내는 중에도 눌렸다.
    // 기본은 그냥 단추 — 폼 안에 두면 제출 단추가 돼서 엉뚱한 폼을 보냈다(제출은 type="submit" 으로 밝힌다)
    <button
      {...props}
      type={type}
      className={cn(button({ variant, size }), className)}
      data-off={disabled && !loading ? "" : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
