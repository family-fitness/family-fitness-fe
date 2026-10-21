"use client";

import { useEffect } from "react";
import { rememberUtm } from "@/lib/signup-source";

/**
 * 처음 들어온 주소의 유입 경로(utm)를 기기에 둔다 — 구글 로그인 요청에 실어 보낸다.
 *
 * 스플래시가 곧바로 다른 주소로 보내도 처음 연 주소의 검색 부분은 이 effect 가 먼저 읽는다.
 */
export function UtmCatcher() {
  useEffect(() => {
    rememberUtm(window.location.search);
  }, []);
  return null;
}
