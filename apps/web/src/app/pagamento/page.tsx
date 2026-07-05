import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PaymentClient } from "@/components/veridit/payment-client";
import { SectionHeader } from "@/components/veridit/section-header";
import { plans, type CreditPlan } from "@/lib/mock-data";

type PaymentPageProps = {
  searchParams: Promise<{ plan?: string | string[] }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const selectedPlan = resolveSelectedPlan(params.plan);

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
            title={`Finalize a compra do ${selectedPlan.name}.`}
            description="Conclua o pagamento com Mercado Pago em uma experiência protegida."
          />
        </div>
        <PaymentClient packageName={selectedPlan.gatewayPackageName} />
      </div>
    </AppShell>
  );
}

function resolveSelectedPlan(plan: string | string[] | undefined): CreditPlan {
  const packageName = Array.isArray(plan) ? plan[0] : plan;

  return (
    plans.find((item) => item.gatewayPackageName === packageName) ??
    plans.find((item) => item.gatewayPackageName === "medium") ??
    plans[1]
  );
}
