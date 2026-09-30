"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/** 여닫는 데 걸리는 시간(ms) — 아래 duration-300 과 같다 */
const DURATION = 300;

/** 열려 있는 시트들. Escape 는 맨 위 것만 닫고, 스크롤 잠금은 마지막 하나가 닫힐 때 푼다 */
const openSheets: string[] = [];
let savedOverflow = "";

function lockScroll(id: string) {
  // html 을 잠근다. html 에 overflow-x: hidden 이 있어 body 를 잠가도 뒤 화면이 굴러갔다
  if (openSheets.length === 0) {
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
  openSheets.push(id);
}

function unlockScroll(id: string) {
  const at = openSheets.lastIndexOf(id);
  if (at >= 0) openSheets.splice(at, 1);
  if (openSheets.length === 0) document.documentElement.style.overflow = savedOverflow;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 아래에서 올라오는 시트. 앱처럼 보이게 하는 핵심 요소다.
 * 모바일에서 모달을 화면 가운데 띄우면 웹처럼 보인다.
 *
 * 닫혀도 내려가는 동안은 그린다. 열리면 초점이 시트 안으로 들어가 시트 안에서만 돌고, 닫히면 연 자리로 돌아간다.
 * 폰 높이보다 길면 시트 안에서 굴러간다 — 키보드가 올라와도 제목과 닫기가 화면 밖으로 밀려나지 않게.
 * 움직임을 줄인 기기에서는 바로 뜨고 바로 닫힌다.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  // 그리는가(내려가는 동안에도) · 올라와 있는가
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  if (open && !mounted) setMounted(true);

  // 한 프레임 그린 뒤에 올리고 내린다 — 같은 프레임에 바꾸면 트랜지션 없이 튄다
  useEffect(() => {
    if (!mounted) return;
    let unmount: ReturnType<typeof setTimeout> | undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setShown(open);
        if (!open) {
          const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          unmount = setTimeout(() => setMounted(false), still ? 0 : DURATION);
        }
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      if (unmount) clearTimeout(unmount);
    };
  }, [open, mounted]);

  /*
    닫기는 늘 지금 것을 부른다 — effect 가 onClose 에 매이면, 부르는 쪽이 렌더마다 새 함수를 넘길 때
    글자 하나 칠 때마다 effect 가 다시 돌아 초점이 시트 밖(연 자리)으로 튀었다가 돌아왔다
  */
  const close = useEffectEvent(() => onClose());

  // 뒤 화면 잠금 · Escape · 초점
  useEffect(() => {
    if (!open) return;
    lockScroll(id);
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focus = requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    });
    const onKey = (e: globalThis.KeyboardEvent) => {
      // 한글 조합 중의 Escape 는 조합을 끝내는 것이다. 겹쳐 열렸으면 맨 위 시트만 닫는다
      if (e.key === "Escape" && !e.isComposing && openSheets.at(-1) === id) close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(focus);
      window.removeEventListener("keydown", onKey);
      unlockScroll(id);
      // 연 자리가 그사이 사라졌으면(고른 뒤 목록이 바뀜) 거기로 돌리지 않는다
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [open, id]);

  /** Tab 이 시트 밖으로 나가지 않게 — 뒤 화면을 더듬게 되면 열린 시트가 보이지 않는다 */
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const items = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === panel.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  // 내려가는 동안은 누르지 못한다 — 닫은 시트의 단추가 한 번 더 눌리지 않고, 뒤 화면을 바로 누를 수 있게
  return (
    <div
      inert={!open}
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center",
        !open && "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        className={cn(
          "bg-signal-deep/35 absolute inset-0 touch-none transition-opacity duration-300 motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={cn(
          "bg-paper relative w-full max-w-(--width-phone) rounded-t-[22px] p-5 outline-none",
          "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          "max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] overflow-y-auto overscroll-contain",
          "ease-sheet transition-transform duration-300 motion-reduce:transition-none",
          shown ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div className="bg-line mx-auto mb-4 h-1 w-10 rounded-full" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="press text-ink-soft -m-2 grid size-10 shrink-0 place-items-center rounded-full"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
