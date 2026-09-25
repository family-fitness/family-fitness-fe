"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";

import { Initial } from "@/components/ui/initial";

/**
 * 사진 한 장 고르기 — 동그란 자리를 누르면 폰의 사진첩 · 카메라가 열린다.
 * 고른 사진은 가운데를 정사각으로 잘라 320px JPEG 로 줄인다(이 기기에 두기 알맞은 크기).
 */
export function PhotoPicker({
  value,
  name,
  onChange,
}: {
  value: string | null;
  name: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    try {
      onChange(await squareJpeg(file));
    } catch {
      setProblem("이 사진은 열 수 없어요. 다른 사진을 골라 주세요.");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={value ? "사진 바꾸기" : "사진 고르기"}
        className="press relative"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- 방금 고른 data URL
          <img src={value} alt="" className="size-36 rounded-full object-cover" />
        ) : (
          <Initial name={name || "?"} size="lg" tone="sub" className="size-36 text-5xl" />
        )}
        <span className="bg-signal-strong absolute right-1 bottom-1 grid size-11 place-items-center rounded-full text-white">
          <Camera aria-hidden className="size-5" />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="press text-ink-soft mt-3 min-h-10 text-sm font-bold"
        >
          사진 빼기
        </button>
      )}
      {problem && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-semibold">
          {problem}
        </p>
      )}
    </div>
  );
}

/** 가운데를 정사각으로 잘라 한 변 `size` 의 JPEG data URL 로 */
async function squareJpeg(file: File, size = 320): Promise<string> {
  // 폰 사진의 돌림 정보대로 세운다 — 옆으로 누운 얼굴이 되지 않게
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // 투명한 PNG 는 JPEG 로 바꾸면 바탕이 검게 된다 — 흰 바탕을 먼저 깐다
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
