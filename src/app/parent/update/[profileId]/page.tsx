import { redirect } from "next/navigation";

/**
 * 신체정보 다시 재기.
 * ▲ 백엔드에 `PATCH /profiles/{profileId}/body` 를 요청해 뒀다.
 */
export default async function UpdateBodyPage({ params }: PageProps<"/parent/update/[profileId]">) {
  const { profileId } = await params;
  redirect(`/p/${profileId}/measure`);
}
