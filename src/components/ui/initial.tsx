import { cn } from "@/lib/utils";

/**
 * 이름 첫 글자 동그라미. 가족 구성원을 가리킬 때 쓴다.
 *
 * 사람 그림을 부품으로 조립하던 아바타를 걷어냈다 — 겹치는 자리가 장마다 어긋나
 * 모자만 떠 있거나 얼굴이 사라졌다(9/23 회의). 헬스 앱들이 프로필 사진이 없을 때
 * 쓰는 모양이다.
 */
export function Initial({
  name,
  tone = "signal",
  size = "md",
  className,
}: {
  name: string | null | undefined;
  tone?: "signal" | "mark" | "sub";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const letter = (name ?? "").trim().charAt(0) || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-extrabold",
        size === "sm" && "size-7 text-xs",
        size === "md" && "size-9 text-sm",
        size === "lg" && "size-12 text-lg",
        tone === "signal" && "bg-signal-soft text-signal-deep",
        tone === "mark" && "bg-mark-soft text-ink",
        tone === "sub" && "bg-sub text-ink-soft",
        className,
      )}
    >
      {letter}
    </span>
  );
}
