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
          onChange={(dataUrl) => {
            if (!dataUrl) return remove(profileId);
            try {
              set(profileId, dataUrl);
            } catch (e) {
              // 저장소가 차서 못 남겼다 — 화면에만 남은 사진을 되돌린다(새로고침하면 사라져 거짓말이 된다)
              if (photo) set(profileId, photo);
              else remove(profileId);
              throw e;
            }
          }}
        />
      </div>
    </Sheet>
  );
}
