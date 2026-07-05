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
    ? "Planos sincronizados com o gateway."
    : "Não foi possível carregar os pacotes de crédito agora.";

  return (
    <AppShell active="credits">
      <div className="grid gap-8">
        {/* Stepper */}
        <div className="reveal-up" style={{ animationDelay: "0ms" }}>
          <PurchaseStepper steps={purchaseSteps} activeStep={1} />
        </div>

        {/* Hero section */}
        <section
          className="credits-hero reveal-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="credits-hero-content">
            <div className="credits-hero-left">
              <div className="credits-hero-eyebrow">
                <Zap aria-hidden="true" />
                Créditos
              </div>
              <h1 className="credits-hero-title">
                Escolha o pacote ideal para suas evidências
              </h1>
              <p className="credits-hero-subtitle">
                Planos diretos para capturas avulsas, rotinas profissionais e
                operações com volume maior.
              </p>
            </div>
            <div className="credits-hero-right">
              <div className="credits-hero-balance-card">
                <div className="credits-hero-balance-header">
                  <Sparkles aria-hidden="true" />
                  <span>Saldo atual</span>
                </div>
                <div className="credits-hero-balance-amount">
                  <CreditBalanceText />
                </div>
                <p className="credits-hero-balance-note">
                  disponíveis para novas capturas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security badge */}
        <div
          className="credits-security-bar reveal-up"
          style={{ animationDelay: "120ms" }}
        >
          <ShieldCheck aria-hidden="true" />
          <div>
            <p className="credits-security-title">
              Compra segura com Mercado Pago
            </p>
            <p className="credits-security-desc">{gatewayStatus}</p>
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
              <p>
                Relatório, hash e pacote ZIP permanecem vinculados ao registro.
              </p>
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
