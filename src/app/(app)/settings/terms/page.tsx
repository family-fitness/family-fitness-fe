import { LegalPage } from "@/components/domain/legal-page";
import { TERMS_OF_SERVICE } from "@/lib/legal";

export default function TermsPage() {
  return <LegalPage doc={TERMS_OF_SERVICE} />;
}
