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
  const unauthorized = error instanceof ApiError && error.status === 401;

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Illustration name="scene/kiumi-rest" size={140} />
      <p className="mt-4 text-lg font-extrabold">
        {unauthorized ? "다시 로그인해 주세요" : "불러오지 못했어요"}
      </p>
      <p className="text-ink-soft mt-2 text-sm leading-relaxed">
        {unauthorized
          ? "로그인이 풀렸어요. 다시 들어오면 기록은 그대로 있어요."
          : "인터넷 연결을 확인하고 다시 눌러 주세요. 기록은 지워지지 않았어요."}
      </p>

      {onRetry && !unauthorized && (
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
