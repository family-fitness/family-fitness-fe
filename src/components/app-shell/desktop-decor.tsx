/**
 * 데스크톱에서만 보이는 양옆 장식.
 *
 * 폰 너비로 좁힌 화면 바깥이 빈 색으로 남으면 웹페이지처럼 보인다.
 * 트랙 레인처럼 가로선을 깔아 폰 화면이 그 위에 놓인 것처럼 만든다.
 *
 * pointer-events 를 꺼야 한다. 안 그러면 이 위에서 휠 스크롤이 막힌다.
 */
export function DesktopDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className="absolute inset-y-0 flex w-[calc((100vw-var(--width-phone))/2)] flex-col justify-center gap-7"
          style={{ [side]: 0 }}
        >
          {[1, 2, 3, 4, 5, 6].map((lane) => (
            <div key={lane} className="flex items-center gap-3 px-10">
              <span className="board-num text-lg text-white/25">{lane}</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
