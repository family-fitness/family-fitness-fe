import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";
/** 목 서버를 켠 빌드 — /api 는 브라우저 안에서 가로채인다 */
const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
/** `next build` 로 만든 것. 개발 서버는 HMR · eval 을 써서 CSP 를 걸지 않는다 */
const PRODUCTION = process.env.NODE_ENV === "production";

/**
 * 스크립트 · 연결 · 그림의 출처를 좁힌다(9/30 보안 점검). 토큰과 아이 사진이 이 기기 저장소에 있어서,
 * 끼어든 스크립트가 있어도 밖으로 보내지 못하게 `connect-src 'self'` 가 먼저다.
 * Next 의 인라인 스크립트 때문에 'unsafe-inline' 은 둔다(nonce 없는 정적 화면들이다).
 * 유튜브 — IFrame API 스크립트 · 쿠키 없는 임베드 · 썸네일만 연다.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
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
