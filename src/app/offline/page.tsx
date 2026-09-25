import { PlainScreen } from "@/components/app-shell/screen";

/** 끊겼을 때 그리는 그림 — 서비스워커가 미리 받아 둔다(`public/sw.js`) */
const ART = "/assets/scene/kiumi-rest.png";

/**
 * 인터넷이 끊겼을 때.
 *
 * 그림은 next/image 를 거치지 않고 파일을 그대로 부른다 — `/_next/image` 는 워커가 저장하지 않아
 * 끊긴 채로 열면 글자만 남았다.
 */
export default function OfflinePage() {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- 끊긴 채로도 떠야 한다. 워커가 받아 둔 파일 그대로 */}
      <img src={ART} alt="" width={150} height={150} className="object-contain" />
      <h1 className="page-title">인터넷이 끊겼어요</h1>
    </PlainScreen>
  );
}
