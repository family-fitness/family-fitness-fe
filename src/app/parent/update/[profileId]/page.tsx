import { redirect } from "next/navigation";

/**
 * 신체정보 다시 재기.
 *
 * 따로 화면을 만들지 않고 측정 화면으로 보낸다. 서버가 키·몸무게를 **측정 회차에
 * 얹어서만** 받기 때문에, 둘을 나눠 두면 "키만 고쳤는데 저장이 안 돼요" 가 된다.
 *
 * ▲ 백엔드에 `PATCH /profiles/{profileId}/body` 를 요청해 뒀다.
 *   생기면 여기에 키·몸무게만 받는 화면을 만든다.
 */
export default async function UpdateBodyPage({ params }: PageProps<"/parent/update/[profileId]">) {
  const { profileId } = await params;
  redirect(`/p/${profileId}/measure`);
}
