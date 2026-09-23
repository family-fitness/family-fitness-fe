import type { MetadataRoute } from "next";

/**
 * 홈 화면에 설치됐을 때의 모습.
 *
 * 앱스토어에 올리지 않는 서비스라 이 파일이 곧 "앱 등록"이다.
 * 링크로 들어온 사람이 홈 화면에 얹으면 주소창 없이 열린다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리가족 체력키움",
    // 홈 화면 아이콘 아래에 들어가는 이름. 길면 잘린다
    short_name: "체력키움",
    description: "국민체력100 데이터로 그리는 우리 가족 체력 지도",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // 앱 바탕(연회색)과 같게. 흰색이면 여는 순간 한 번 번쩍인다
    background_color: "#f4f5f7",
    theme_color: "#f4f5f7",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 기기가 제 모양대로 잘라 쓰는 아이콘. 가장자리를 비워 둔 판이다
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "오늘 할 운동", short_name: "운동", url: "/kid" },
      { name: "아이 체력 보기", short_name: "체력", url: "/parent" },
    ],
  };
}
