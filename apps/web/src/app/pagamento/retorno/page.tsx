import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, CreditCard, LayoutDashboard } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CheckoutStatus = "success" | "pending" | "failure";

const statusCopy: Record<
  CheckoutStatus,
  {
    title: string;
    description: string;
    alertTitle: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  success: {
    title: "Pagamento recebido",
    description:
      "O Mercado Pago recebeu a confirmação. O saldo será atualizado assim que o webhook concluir o processamento.",
    alertTitle: "Confirmação em processamento",
    icon: CheckCircle2,
    className: "border-[color:var(--success)]/30 bg-[color:var(--success-soft)]",
  },
  pending: {
    title: "Pagamento pendente",
    description:
      "O pagamento está em análise ou aguardando confirmação no ambiente sandbox.",
    alertTitle: "Aguardando confirmação",
    icon: Clock3,
    className: "border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)]",
  },
  failure: {
    title: "Pagamento não concluído",
    description:
      "A compra não foi finalizada no Mercado Pago. Você pode tentar novamente com outro meio de pagamento sandbox.",
    alertTitle: "Compra interrompida",
    icon: AlertCircle,
    className: "border-destructive/30 bg-destructive/5",
  },
};

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  const copy = statusCopy[status];
  const Icon = copy.icon;

  return (
    <AppShell active="credits">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden="true" />
            </div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Alert className={copy.className}>
              <Icon aria-hidden="true" />
              <AlertTitle>{copy.alertTitle}</AlertTitle>
              <AlertDescription>
                O crédito é liberado somente depois que o billing-service recebe e valida o webhook aprovado.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
                  Voltar para dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/creditos">
                  <CreditCard data-icon="inline-start" aria-hidden="true" />
                  Comprar créditos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function normalizeStatus(status: string | string[] | undefined): CheckoutStatus {
  const value = Array.isArray(status) ? status[0] : status;

  if (value === "success" || value === "pending" || value === "failure") {
    return value;
  }

  return "pending";
}
