import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Illustration } from "./illustration";
import { NavLink } from "./nav-link";

/**
 * 빈 화면에 서는 키움이 장면. 그림은 `public/assets/scene/kiumi-이름.png` 다.
 *
 * 아래 셋은 주문만 하고 그림이 아직 없다. 그림이 오기 전에는 부르지 않는다(check:assets 가 막는다).
 * 지금은 화면마다 있는 그림으로 대신 그리고, 그 자리에 어떤 그림이 오면 바꾸는지 주석을 달아 두었다.
 * 그림이 오면 그 줄의 장면 이름만 바꾸면 된다.
 */
type Scene =
  | "no-record"
  | "no-mission"
  | "waiting"
  | "rest"
  | "no-alarm"
  | "hello"
  // 아직 그림이 없는 장면
  | "no-league"
  | "no-growth"
  | "invite";

/**
 * 빈 화면. 그림, 지금 상태 한마디, 풀이 한 줄(있으면), 할 일(있으면).
 *
 * 크기는 둘이다.
 *   page  화면 하나를 채운다. 그림 140
 *   card  카드 안의 한 자리를 채운다. 그림 88, 여백을 줄인다
 *
 * 빈 차트(0분 링, 바닥에 붙은 막대, 꼭지점이 빈 육각형)를 세우지 않고 이걸 세운다.
 * 그림은 주문한 키움이 장면만 쓴다. 오기 전에는 그림 자리가 비고 글만 선다.
 * 사람이 그려진 옛 장면으로 대신 세우지 않는다(사람 대신 그리는 건 키움이 하나다).
 */
export function EmptyState({
  scene,
  title,
  description,
  action,
  size = "page",
  className,
}: {
  scene: Scene;
  title: string;
  /** 무엇을 하면 여기가 채워지는지 한 줄 */
  description?: ReactNode;
  action?: ReactNode;
  size?: "page" | "card";
  className?: string;
}) {
  const card = size === "card";
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        card ? "gap-2 px-2 py-4" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <Illustration name={`scene/kiumi-${scene}`} size={card ? 88 : 140} />
      <div>
        <p className={card ? "text-body font-extrabold" : "text-lg font-extrabold"}>{title}</p>
        {description && (
          // 두 줄이 되면 줄 길이를 고르게 맞춘다. 끝말 「있어요」 만 아랫줄에 홀로 떨어지지 않게
          <p
            className={cn(
              "text-ink-soft mx-auto max-w-72 font-semibold text-balance",
              card ? "text-caption mt-1" : "mt-1.5 text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * 빈 화면의 할 일 단추 하나. 이 자리를 채우는 길이라 파랑으로 크게 둔다.
 * 주소가 있으면 링크, 없으면 누르는 단추.
 */
export function EmptyStateAction({
  href,
  onClick,
  children,
}: { children: ReactNode } & (
  { href: string; onClick?: () => void } | { href?: undefined; onClick: () => void }
)) {
  const shape =
    "press bg-signal-strong mt-1 inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-sm font-extrabold text-white";
  if (href) {
    return (
      <NavLink href={href} onClick={onClick} className={shape}>
        {children}
      </NavLink>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shape}>
      {children}
    </button>
  );
}
