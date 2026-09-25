"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { ApiError } from "@/lib/api/client";

/** 불러오지 못했을 때. */
export function ErrorState({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const router = useRouter();
  const status = error instanceof ApiError ? error.status : 0;
  const unauthorized = status === 401;
  // 막혔거나(403 — 동의 · 권한) 없는(404) 것은 다시 불러도 같다 — 다시 불러오기를 주지 않고 까닭을 코드로 말한다
  const settled = status === 403 || status === 404;
  const title = unauthorized
    ? "다시 로그인해 주세요"
    : status === 403
      ? ((error as ApiError).commonMessage ?? "볼 수 없어요")
      : status === 404
        ? "찾을 수 없어요"
        : "불러오지 못했어요";

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Illustration name="scene/kiumi-rest" size={140} />
      <p className="mt-4 text-lg font-extrabold">{title}</p>

      {onRetry && !unauthorized && !settled && (
        <Button size="md" variant="outline" className="mt-5" loading={retrying} onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden />
          다시 불러오기
        </Button>
      )}
      {unauthorized && (
        <Button size="md" className="mt-5" onClick={() => router.replace("/login")}>
          로그인하러 가기
        </Button>
      )}
    </div>
  );
}
