import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PaymentClient } from "@/components/veridit/payment-client";
import {
  PurchaseStepper,
  purchaseSteps,
} from "@/components/veridit/purchase-stepper";
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
        {/* Stepper */}
        <div className="reveal-up" style={{ animationDelay: "0ms" }}>
          <PurchaseStepper steps={purchaseSteps} activeStep={2} />
        </div>

        <div
          className="flex items-center gap-4 reveal-up"
          style={{ animationDelay: "60ms" }}
        >
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href="/creditos">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Finalize a compra do {selectedPlan.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conclua o pagamento com Mercado Pago em uma experiência protegida.
            </p>
          </div>
        </div>
        <div className="reveal-up" style={{ animationDelay: "120ms" }}>
          <PaymentClient packageName={selectedPlan.gatewayPackageName} />
        </div>
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
