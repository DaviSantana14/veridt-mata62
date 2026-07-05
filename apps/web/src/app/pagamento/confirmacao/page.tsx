import { CheckCircle2, CreditCard } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentConfirmationClient } from "@/components/veridit/payment-confirmation-client";

type PaymentConfirmationPageProps = {
  searchParams: Promise<{
    purchaseId?: string | string[];
    credits?: string | string[];
    package?: string | string[];
  }>;
};

export default async function PaymentConfirmationPage({
  searchParams,
}: PaymentConfirmationPageProps) {
  const params = await searchParams;
  const purchaseId = getSearchParam(params.purchaseId);
  const credits = getSearchParam(params.credits);
  const packageName = getSearchParam(params.package);

  return (
    <AppShell active="credits">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--success-soft)] text-[color:var(--success)]">
              <CheckCircle2 aria-hidden="true" />
            </div>
            <CardTitle>Compra confirmada</CardTitle>
            <CardDescription>
              A confirmação foi registrada e os créditos foram adicionados.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Alert className="border-[color:var(--success)]/30 bg-[color:var(--success-soft)]">
              <CreditCard aria-hidden="true" />
              <AlertTitle>Pagamento confirmado</AlertTitle>
              <AlertDescription>
                {formatConfirmationText(packageName, credits)}
              </AlertDescription>
            </Alert>

            {purchaseId ? (
              <div className="rounded-xl border bg-background/80 p-4 text-sm text-muted-foreground">
                Compra: <span className="font-mono">{purchaseId}</span>
              </div>
            ) : null}

            <PaymentConfirmationClient />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatConfirmationText(
  packageName: string | undefined,
  credits: string | undefined,
) {
  if (packageName && credits) {
    return `${packageName}: ${credits} créditos liberados para sua conta.`;
  }

  if (credits) {
    return `${credits} créditos foram liberados para sua conta.`;
  }

  return "Os créditos da compra foram liberados para sua conta.";
}
