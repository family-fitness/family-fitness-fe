/**
 * 데스크톱에서만 보이는 양옆 장식.
 *
 * 폰 너비로 좁힌 화면 바깥이 그냥 빈 색으로 남으면 웹페이지처럼 보인다.
 * 트랙 레인과 거리 표시를 깔아서, 폰 화면이 운동장 위에 놓인 것처럼 보이게 한다.
 *
 * pointer-events 를 꺼야 한다. 안 그러면 이 위에서 휠 스크롤이 막힌다.
 */
export function TrackDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className="absolute inset-y-0 flex w-[calc((100vw-var(--width-phone))/2)] flex-col justify-center gap-6"
          style={{ [side]: 0 }}
        >
          {[100, 200, 300, 400].map((distance) => (
            <div key={distance} className="flex items-center gap-3 px-8">
              <span className="h-[3px] flex-1 bg-white/25" />
              <span className="board-num text-2xl text-white/30">{distance}m</span>
              <span className="h-[3px] flex-1 bg-white/25" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
