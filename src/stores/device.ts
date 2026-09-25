import { useBodyStore } from "./body-store";
import { usePhotoStore } from "./photo-store";
import { useRoleStore } from "./role-store";
import { useRoutineStore } from "./routine-store";

/**
 * 이 기기에만 둔 것 — 누가 쓰는지(역할 · 고른 아이), 아이 사진, 키 · 몸무게, 짜던 운동.
 * 로그아웃하거나 다른 계정이 들어오면 비운다. 남기면 다음 사람이 앞 가족의 아이 사진을 보고
 * 남의 아이 기록을 부른다.
 */
export function resetDevice() {
  useRoleStore.getState().reset();
  usePhotoStore.getState().reset();
  useBodyStore.getState().reset();
  useRoutineStore.getState().clear();
}
