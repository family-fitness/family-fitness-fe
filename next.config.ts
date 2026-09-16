import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

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
   * 스크립트 출처를 제한하는 CSP 는 유튜브 API 와 Next 의 인라인 스크립트를
   * 같이 봐야 해서 배포 설정이 굳은 뒤에 따로 넣는다.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
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
