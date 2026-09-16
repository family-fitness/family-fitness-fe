import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * 더 깊이 들어가는 링크.
 *
 * 화면이 오른쪽에서 들어오게 표시만 해 준다. 그냥 `Link` 를 쓰면 전환 종류가
 * 없어서 화면이 툭 바뀐다 — 방향이 없으면 웹페이지처럼 보인다.
 *
 * 돌아 나오는 링크는 `AppBar` 의 `backHref` 를 쓴다.
 */
export function NavLink(props: ComponentProps<typeof Link>) {
  return <Link transitionTypes={["nav-forward"]} {...props} />;
}
