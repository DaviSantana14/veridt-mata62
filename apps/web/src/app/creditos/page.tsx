import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "@/components/veridit/plan-card";
import { SectionHeader } from "@/components/veridit/section-header";
import { getGatewayPlans } from "@/lib/gateway";
import { currentUser, type CreditPlan } from "@/lib/mock-data";
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
        <SectionHeader
          eyebrow="Créditos"
          title="Escolha um pacote para manter o fluxo de evidências ativo."
          description="Planos diretos para capturas avulsas, rotinas profissionais e operações com volume maior."
          meta={
            <Badge className="rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
              <CreditCard aria-hidden="true" />
              Saldo atual: {currentUser.credits} créditos
            </Badge>
          }
        />

        <Alert className="border-primary/20 bg-primary/5">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Compra segura com Mercado Pago</AlertTitle>
          <AlertDescription>{gatewayStatus}</AlertDescription>
        </Alert>

        <section
          className="grid gap-6 lg:grid-cols-3"
          aria-label="Pacotes de créditos"
        >
          {renderedPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
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
