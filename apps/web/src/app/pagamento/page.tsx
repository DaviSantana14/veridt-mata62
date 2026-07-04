import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PaymentClient } from "@/components/veridit/payment-client";
import { SectionHeader } from "@/components/veridit/section-header";

export default function PaymentPage() {
  return (
    <AppShell active="credits">
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href="/creditos">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <SectionHeader
            eyebrow="Checkout"
            title="Finalize a compra do pacote profissional."
            description="Escolha a forma de pagamento e confirme o crédito no ambiente demonstrativo."
          />
        </div>
        <PaymentClient />
      </div>
    </AppShell>
  );
}
