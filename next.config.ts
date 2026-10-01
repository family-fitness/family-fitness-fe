import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/**
 * 설정 화면에 보이는 버전. 화면에서 package.json 을 import 하면 devDependencies 목록까지
 * 통째로 브라우저 번들에 들어가서, 빌드할 때 버전 글자 하나만 읽어 박는다.
 */
const APP_VERSION = (
  JSON.parse(readFileSync(`${process.cwd()}/package.json`, "utf8")) as {
    version: string;
  }
).version;

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";
/** 목 서버를 켠 빌드 — /api 는 브라우저 안에서 가로채인다 */
const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
/** `next build` 로 만든 것. 개발 서버는 HMR · eval 을 써서 CSP 를 걸지 않는다 */
const PRODUCTION = process.env.NODE_ENV === "production";

/**
 * 스크립트 · 연결 · 그림의 출처를 좁힌다(9/30 보안 점검). 토큰과 아이 사진이 이 기기 저장소에 있어서,
 * 끼어든 스크립트가 있어도 밖으로 보내지 못하게 `connect-src 'self'` 가 먼저다.
 * Next 의 인라인 스크립트 때문에 'unsafe-inline' 은 둔다(nonce 없는 정적 화면들이다).
 * 유튜브 — 쿠키 없는 임베드 · 썸네일만 연다. 유튜브 스크립트는 들이지 않는다 — 플레이어는 말(postMessage)로 부린다.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /** 응답마다 「X-Powered-By: Next.js」 를 붙이지 않는다 — 무엇으로 만들었는지 밖에 알릴 까닭이 없다 */
  poweredByHeader: false,

  /**
   * 개발 서버가 AGENTS.md · CLAUDE.md 를 만들지 않게 한다. develop 에는 웹 프론트를 돌리는 파일만 둔다 —
   * 두 파일이 없으면 `next dev` 가 새로 만들어, 모르고 커밋하면 문서가 다시 올라간다.
   */
  agentRules: false,

  /**
   * 목 서버 스위치, 구글 키, 개발 로그인 스위치를 빌드할 때 값으로 못 박는다.
   *
   * `NEXT_PUBLIC_*` 은 빌드할 때 값이 있어야 번들에 박힌다. 값이 없으면 서버 쪽 코드는 `next start`
   * 를 띄울 때 환경에서 다시 읽고, 브라우저 쪽 번들은 undefined 로 본다. 그래서 운영 서버를
   * NEXT_PUBLIC_API_MOCKING=enabled 로 띄우면 서버만 목이 켜진 줄 알고 body 를 비운 채 렌더링했고,
   * 브라우저에서 hydration 오류(#418)가 났다. 없으면 빈 문자열로 박아 두 쪽이 늘 같은 값을 보게 한다.
   *
   * 값이 박혀야 MswProvider 의 `import("@/mocks/browser")` 와 로그인 화면의 개발용 계정 목록이 죽은
   * 코드가 되어 운영 번들에서 빠진다. 확인은 운영 빌드 뒤 `npm run check:bundle`.
   */
  env: {
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? "",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    NEXT_PUBLIC_DEV_LOGIN: process.env.NEXT_PUBLIC_DEV_LOGIN ?? "",
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },

  /**
   * 브라우저에게는 /api/v1/... 이 프론트와 같은 출처로 보이고,
   * Next 서버가 뒤에서 백엔드로 넘긴다.
   *
   * 이렇게 하면
   *   - 세션 쿠키가 그냥 실려 간다 (SameSite=None 이나 사파리 ITP 문제가 없다)
   *   - 백엔드에 CORS 설정을 부탁할 필요가 없다
   *   - 배포 도메인이 달라져도 환경변수 하나만 바꾸면 된다
   *
   * MSW 를 켠 상태에서는 요청이 브라우저 안에서 가로채여 여기까지 오지 않는다.
   */
  async rewrites() {
    // 목 빌드는 /api 를 넘길 곳이 없다. 넘기면 모르는 포트로 가거나 자기 자신에게 돌아와 멈췄다(9/30 보안 점검)
    if (MOCKING) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },

  /**
   * 개인정보처리방침 · 이용약관은 로그인하지 않아도 열리게 앱 맨 위(/privacy · /terms)로 옮겼다.
   * 예전 설정 안 주소로 들어와도 같은 글이 열리게 보낸다
   */
  async redirects() {
    return [
      { source: "/settings/privacy", destination: "/privacy", permanent: false },
      { source: "/settings/terms", destination: "/terms", permanent: false },
    ];
  },

  /**
   * 보안 머리말.
   *
   * 아이 건강 정보를 다루는 화면이라 기본값에 기대지 않는다.
   * 내용 유형을 멋대로 추측하지 못하게 하고, 다른 사이트가 이 화면을 액자에
   * 넣어 그 위에 가짜 버튼을 얹지 못하게 막는다. 카메라·마이크·위치는 쓰지 않는다.
   *
   * 빌드한 것에는 출처를 좁히는 CSP 와 HTTPS 고정(HSTS)까지 건다. 개발 서버는 HMR 때문에 액자 막기만.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: PRODUCTION ? CSP : "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // 다른 창이 이 창을 붙잡지 못하게. 구글 로그인은 창을 통째로 옮겨 가서 막히지 않는다
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(PRODUCTION ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
          {
            key: "Permissions-Policy",
            /*
              카메라·마이크·위치는 쓰지 않는다.

              compute-pressure 는 유튜브 플레이어가 기기 부하를 보고 화질을
              낮추는 데 쓴다. 막아 두면 영상 화면마다 위반 경고가 뜨고
              저사양 기기에서 화질이 안 내려간다. 유튜브에만 열어 준다.
            */
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), compute-pressure=(self "https://www.youtube.com" "https://www.youtube-nocookie.com")',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      // 유튜브 썸네일
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
