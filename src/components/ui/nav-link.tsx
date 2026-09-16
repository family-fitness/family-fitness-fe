import Link from "next/link";
import type { ComponentProps } from "react";

/** 더 깊이 들어가는 링크. */
export function NavLink(props: ComponentProps<typeof Link>) {
  return <Link transitionTypes={["nav-forward"]} {...props} />;
}
