import { cn } from "@/lib/utils";

/** 로딩. 스피너 대신 실제 레이아웃 모양을 그린다 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
