import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanCard } from "@/components/veridit/plan-card";
import { SectionHeader } from "@/components/veridit/section-header";
import { getGatewayPlans } from "@/lib/gateway";
import { currentUser, plans } from "@/lib/mock-data";

export default async function CreditsPage() {
  const gatewayPlans = await getGatewayPlans();
  const gatewayStatus = gatewayPlans.ok
    ? "Planos sincronizados com o gateway."
    : "Planos exibidos a partir da referência visual enquanto o gateway não responde.";

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
          <AlertTitle>Compra segura com simulação de confirmação</AlertTitle>
          <AlertDescription>{gatewayStatus}</AlertDescription>
        </Alert>

        <section className="grid gap-6 lg:grid-cols-3" aria-label="Pacotes de créditos">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>

        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-[color:var(--gold)]" aria-hidden="true" />
              Governança de consumo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
            <p>1 crédito por captura concluída, seja vídeo ou screenshot.</p>
            <p>Relatório, hash e pacote ZIP permanecem vinculados ao registro.</p>
            <p>Pagamento via Pix ou Mercado Pago no fluxo demonstrativo atual.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
