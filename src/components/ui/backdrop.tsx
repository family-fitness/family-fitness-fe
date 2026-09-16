"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** 화면 뒤에 까는 장면. */
export function Backdrop({
  name,
  className,
  height = 200,
  align = "top",
}: {
  /** "bg/bg-sky" 처럼 분류/이름 */
  name: string;
  className?: string;
  /** 띠 높이(px) */
  height?: number;
  align?: "top" | "bottom";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 -z-10 block overflow-hidden select-none",
        align === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ height }}
    >
      <Image
        src={`/assets/${name}.png`}
        alt=""
        fill
        sizes="100vw"
        onError={() => setFailed(true)}
        className={cn("object-cover", align === "top" ? "object-top" : "object-bottom")}
      />
    </span>
  );
}
