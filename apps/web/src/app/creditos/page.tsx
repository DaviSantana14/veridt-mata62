import { CreditCard, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditBalanceText } from "@/components/veridit/credit-balance";
import { PlanCard } from "@/components/veridit/plan-card";
import {
  PurchaseStepper,
  purchaseSteps,
} from "@/components/veridit/purchase-stepper";
import { getGatewayPlans } from "@/lib/gateway";
import type { CreditPlan } from "@/lib/mock-data";
import type { CreditPackageResponse } from "@veridit/contracts";

const planPresentation: Record<
  CreditPackageResponse["name"],
  Pick<CreditPlan, "id" | "popular">
> = {
  basic: {
    id: "initial",
  },
  medium: {
    id: "professional",
    popular: true,
  },
  premium: {
    id: "enterprise",
  },
};

export default async function CreditsPage() {
  const gatewayPlans = await getGatewayPlans();
  const renderedPlans = gatewayPlans.ok
    ? gatewayPlans.data.map(toCreditPlan)
    : [];
  const gatewayStatus = gatewayPlans.ok

  return (
    <AppShell active="credits">
      <div className="grid gap-8">
        {/* Stepper */}
        <div className="reveal-up" style={{ animationDelay: "0ms" }}>
          <PurchaseStepper steps={purchaseSteps} activeStep={1} />
        </div>

        {/* Hero section */}
        <section
          className="relative rounded-[1.25rem] overflow-hidden bg-gradient-to-br from-[#0e4a8a] via-[#1f5fbf] to-[#0f766e] shadow-[0_2px_4px_rgb(15_23_42/0.08),0_16px_48px_rgb(31_95_191/0.16),inset_0_1px_0_rgb(255_255_255/0.08)] reveal-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_90%_30%,rgba(15,118,110,0.3),transparent),radial-gradient(circle_at_10%_90%,rgba(31,95,191,0.2),transparent_50%)] pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 80%)"
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 p-8 md:p-10">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#7dd3c0] mb-3">
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                Créditos
              </div>
              <h1 className="text-2xl sm:text-[1.875rem] font-bold text-[#f0f6ff] leading-tight tracking-[-0.02em] max-w-[28ch]">
                Escolha o pacote ideal para suas evidências
              </h1>
              <p className="mt-2 text-[0.9rem] text-[#dcebff]/65 leading-[1.6] max-w-[46ch]">
                Planos diretos para capturas avulsas, rotinas profissionais e
                operações com volume maior.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:px-6 min-w-[200px]">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.06em] text-[#dcebff]/60">
                  <Sparkles className="w-3.5 h-3.5 text-[#7dd3c0]" aria-hidden="true" />
                  <span>Saldo atual</span>
                </div>
                <div className="text-[2rem] font-extrabold text-white leading-[1.2] tracking-[-0.03em] mt-1">
                  <CreditBalanceText />
                </div>
                <p className="text-xs text-[#dcebff]/45 mt-1">
                  disponíveis para novas capturas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security badge */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-[0.875rem] border border-primary/10 bg-gradient-to-br from-primary/5 to-teal-700/5 reveal-up"
          style={{ animationDelay: "120ms" }}
        >
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Compra segura com Mercado Pago
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{gatewayStatus}</p>
          </div>
        </div>

        {/* Plan cards */}
        <section aria-label="Pacotes de créditos">
          <div className="grid gap-6 lg:grid-cols-3">
            {renderedPlans.map((plan, i) => (
              <div
                key={plan.id}
                className="reveal-up"
                style={{ animationDelay: `${180 + i * 80}ms` }}
              >
                <PlanCard plan={plan} />
              </div>
            ))}
          </div>
        </section>

        {!gatewayPlans.ok ? (
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Pacotes indisponíveis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Verifique se o API Gateway e o billing-service estão rodando.
            </CardContent>
          </Card>
        ) : null}

        {/* Governance section */}
        <div className="reveal-up" style={{ animationDelay: "420ms" }}>
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles
                  className="text-[color:var(--gold)]"
                  aria-hidden="true"
                />
                Governança de consumo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
              <p>1 crédito por captura concluída, seja vídeo ou screenshot.</p>
              <p>Pagamento por cartão ou Pix integrado ao Mercado Pago.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function toCreditPlan(creditPackage: CreditPackageResponse): CreditPlan {
  const presentation = getPlanPresentation(creditPackage.name);
  const amountInCents =
    creditPackage.credits * creditPackage.pricePerCreditInCents;

  return {
    ...presentation,
    gatewayPackageName: creditPackage.name,
    name: creditPackage.displayName,
    records: creditPackage.credits,
    price: formatCurrency(amountInCents),
    pricePerRecord: `${formatCurrency(creditPackage.pricePerCreditInCents)} por registro`,
    features: [
      `${creditPackage.credits} créditos`,
      "Vídeos e screenshots",
      "Relatórios com hash",
      "Download em ZIP",
      "Validade de 12 meses",
    ],
  };
}

function getPlanPresentation(
  packageName: CreditPackageResponse["name"],
): Pick<CreditPlan, "id" | "popular"> {
  return planPresentation[packageName];
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountInCents / 100);
}
