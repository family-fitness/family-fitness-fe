import type { Metadata } from "next";

import { LegalPage } from "@/components/domain/legal-page";
import { PRIVACY_POLICY } from "@/lib/legal";

/** 로그인하지 않아도 열린다 — 로그인 화면 아래 · 설정에서 온다(`PRIVACY_HREF`) */
export const metadata: Metadata = { title: `${PRIVACY_POLICY.title} · 우리가족 체력키움` };

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} />;
}
