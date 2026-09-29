import { LegalPage } from "@/components/domain/legal-page";
import { PRIVACY_POLICY } from "@/lib/legal";

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} />;
}
