/** 데스크톱에서만 보이는 양옆 장식. */
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
              <span className="board-num text-signal-deep/20 text-lg">{lane}</span>
              <span className="bg-signal-deep/12 h-px flex-1" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
