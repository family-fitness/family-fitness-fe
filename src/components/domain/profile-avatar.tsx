"use client";

import { Initial } from "@/components/ui/initial";
import { usePhoto } from "@/stores/photo-store";
import { cn } from "@/lib/utils";

const SIZE = { sm: "size-7", md: "size-9", lg: "size-12" } as const;

/**
 * 가족 한 사람 — 사진이 있으면 사진, 없으면 이름 첫 글자 동그라미.
 * 사진은 이 기기에 둔 것(`photo-store`)이다. 사람 모습을 그림으로 조립하지 않는다(AGENTS 「그림」).
 */
export function ProfileAvatar({
  profileId,
  name,
  tone = "signal",
  size = "md",
  className,
}: {
  profileId: string | null | undefined;
  name: string | null | undefined;
  tone?: "signal" | "mark" | "sub";
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const photo = usePhoto(profileId);
  if (!photo) {
    return <Initial name={name} tone={tone} size={size} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 이 기기에 둔 작은 data URL 이라 최적화할 것이 없다
    <img
      src={photo}
      alt=""
      aria-hidden
      className={cn("shrink-0 rounded-full object-cover", SIZE[size], className)}
    />
  );
}
