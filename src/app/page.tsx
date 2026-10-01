"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SessionError } from "@/components/app-shell/session-error";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { ApiError } from "@/lib/api/client";
import { useMe } from "@/lib/api/queries";
import { familySetupPath } from "@/lib/family";
import { homeOf, modeFor } from "@/lib/role-mode";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/** 스플래시 — 토큰과 `/me` 를 보고 갈 곳을 정한다. */
export default function SplashPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const { data, error, refetch, isRefetching } = useMe();
  // 로그인이 풀린 것만 로그인 화면으로. 망이 끊기거나 서버가 넘어졌을 때 보내면 다시 들어와도 같은 자리다
  const signedOut = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (token) return;
    // persist 가 되살아나기 전에는 토큰이 null 이다. 한 틱 기다린다
    const id = setTimeout(() => {
      if (useAuthStore.getState().accessToken) return;
      router.replace("/login");
    }, 600);
    return () => clearTimeout(id);
  }, [token, router]);

  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  useEffect(() => {
    if (!data) return;

    /*
      가족이 아직 없거나 초대를 받아야 하면 그쪽이 먼저다.

      전에는 `CREATE_FAMILY` 를 역할 고르기(`/start`)로 보냈다. 가족도 아이도 없는데
      「아이」 를 고를 수 있는 화면이 먼저 뜨는 건 말이 안 된다 — 고를 자리가 없다.
      가족 만들기로 곧장 보내자, 초대받은 사람이 앱부터 열면 자기 가족을 먼저 만들어 초대 코드가 막혔다.
      그래서 새 가족 만들기와 초대 코드로 참여하기를 고르는 화면(`/start/welcome`)으로 보낸다.
    */
    const setup = familySetupPath(data.nextStep);
    if (setup) {
      router.replace(setup);
      return;
    }
    // 초대를 받아 들어왔다가 참여 방식을 고르기 전에 닫았다 — 고르던 자리로
    if (data.nextStep === "SUPPORT_MODE") {
      router.replace("/settings/support-mode?from=claim");
      return;
    }

    /*
      누가 쓰는지는 계정의 역할로 정한다. 자녀 계정은 아이 홈, 보호자 계정은 부모 홈이다.
      보호자가 폰을 아이에게 빌려준 중(이 기기에 아이로 정해 둠)이면 그대로 아이 홈.
      전에는 이 기기에 정해 둔 것이 없으면 「누가 쓰고 있나요」 를 먼저 물었다.
    */
    // 이 기기에 둔 값은 store 에서 바로 읽는다. 첫 화면을 그리는 동안의 값은 아직 비어 있을 수 있다
    const me = data.profiles?.find((p) => p.role === "PARENT") ?? data.profiles?.[0];
    const role = useRoleStore.getState();
    const next = modeFor(me?.role, role.mode);
    if (next && next !== role.mode) role.setMode(next);
    // 자녀 계정은 자기 프로필로 고정된다. 아이 홈이 누구 것인지 알아야 한다
    if (me?.role === "CHILD" && me.profileId && role.childProfileId !== me.profileId) {
      role.setChild(me.profileId);
    }
    router.replace(homeOf(next));
  }, [data, router]);

  // 막혔거나 없는 계정(403 · 404)은 다시 불러도 같다 — 다시 불러오기도 없이 갇혔다. 로그아웃이 같이 선다
  if (error && !signedOut) {
    return <SessionError error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LevelBuddy stage={3} size={140} />
      <h1 className="page-title text-center">우리가족 체력키움</h1>
    </div>
  );
}
