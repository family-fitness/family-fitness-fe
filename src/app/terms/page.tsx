import type { Metadata } from "next";

import { LegalPage } from "@/components/domain/legal-page";
import { TERMS_OF_SERVICE } from "@/lib/legal";

/** 로그인하지 않아도 열린다 — 로그인 화면 아래 · 설정에서 온다(`TERMS_HREF`) */
export const metadata: Metadata = { title: `${TERMS_OF_SERVICE.title} | 우리가족 체력키움` };

export default function TermsPage() {
  return <LegalPage doc={TERMS_OF_SERVICE} />;
}
