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
   * MSW 를 켠 상태(NEXT_PUBLIC_API_MOCKING=enabled)에서는 요청이 브라우저 안에서
   * 가로채지므로 여기까지 오지 않는다.
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
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
