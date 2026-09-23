import { ASSETS } from "./asset-list";

/**
 * 그림 이름을 실제로 있는 파일로. 없으면 null.
 *
 * **대신 세우는 그림이 없다.** 예전에는 주문한 그림이 오기 전까지 뜻이 비슷한 옛 그림을
 * 끼워 두었는데(깃발 스티커에 결승선 장면, 배지에 아무 물건 그림), 한 화면에 결이 다른
 * 그림이 뒤섞여 "무분별하다" 는 말을 들었다(9/23). 이제 주문한 이름만 부르고,
 * 오기 전에는 그 자리를 비워 둔다. 들어오면 `npm run assets` 가 목록을 고쳐 바로 채워진다.
 *
 * 목록에 없는 그림은 부르지 않는다. 없는 파일을 불렀다 숨기면 빈 상자가 한 번 번쩍인다.
 */
export function artFor(name: string): string | null {
  return ASSETS.has(name) ? name : null;
}
