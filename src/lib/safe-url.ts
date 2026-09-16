/**
 * 밖으로 나가는 주소를 거른다.
 *
 * 영상 주소는 서버가 준다. 그런데 `javascript:` 로 시작하는 주소가 섞여 들어오면
 * 링크를 누르는 순간 그 코드가 우리 화면에서 돈다. 지금 백엔드가 그럴 리는 없지만,
 * 나중에 영상 목록에 외부에서 들어온 값이 섞이면 그때는 늦는다.
 */
const ALLOWED = new Set(["http:", "https:"]);

export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return ALLOWED.has(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
