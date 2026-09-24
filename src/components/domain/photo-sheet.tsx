"use client";

import { PhotoPicker } from "@/components/domain/photo-picker";
import { Sheet } from "@/components/ui/sheet";
import { usePhoto, usePhotoStore } from "@/stores/photo-store";

/**
 * 가입 뒤에 사진 바꾸기 · 빼기 — 설정의 내 프로필, 가족 관리의 구성원 줄에서 연다.
 * 고르면 바로 이 기기에 남는다. 따로 저장 단추가 없다.
 */
export function PhotoSheet({
  open,
  onClose,
  profileId,
  name,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  name: string;
}) {
  const photo = usePhoto(profileId);
  const set = usePhotoStore((s) => s.set);
  const remove = usePhotoStore((s) => s.remove);

  return (
    <Sheet open={open} onClose={onClose} title={`${name} 사진`}>
      <div className="pt-2 pb-4">
        <PhotoPicker
          value={photo ?? null}
          name={name}
          onChange={(dataUrl) => (dataUrl ? set(profileId, dataUrl) : remove(profileId))}
        />
        <p className="text-caption text-ink-soft mt-4 text-center">
          가족에게 보여요 · 이 기기에만 저장돼요
        </p>
      </div>
    </Sheet>
  );
}
