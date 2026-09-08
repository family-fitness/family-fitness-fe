import { redirect } from "next/navigation";

/**
 * 스플래시.
 * 인증이 붙으면 여기서 로그인 여부를 보고 /onboarding 과 /home 으로 가른다.
 * 백엔드 인증 방식이 정해지기 전까지는 홈으로 보낸다.
 */
export default function Page() {
  redirect("/home");
}
