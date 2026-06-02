"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createMockPurchase } from "@/lib/gateway";
import { currentUser, plans } from "@/lib/mock-data";

const pixCode =
  "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540649.905802BR5913RiSE Labs6009SAO PAULO62140510VERIDIT0016304A12B";

const selectedPlan = plans[1];

export function PaymentClient() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function confirmPayment() {
    setPending(true);
    const result = await createMockPurchase({
      userId: "user-demo-001",
      packageName: "medium",
      payerEmail: currentUser.email,
    });
    setPending(false);

    if (result.ok) {
      toast.success("Pagamento confirmado.");
    } else {
      toast.warning("Confirmação simulada. API Gateway indisponível.", {
        description: result.message,
      });
    }

    router.push("/dashboard");
  }

  async function copyPixCode() {
    await navigator.clipboard.writeText(pixCode);
    toast.success("Código Pix copiado.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="premium-card rounded-2xl">
        <CardHeader>
          <CardTitle>Forma de pagamento</CardTitle>
          <CardDescription>
            Selecione Pix ou Mercado Pago para simular a confirmação.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Alert className="border-primary/20 bg-primary/5">
            <LockKeyhole aria-hidden="true" />
            <AlertTitle>Checkout demonstrativo seguro</AlertTitle>
            <AlertDescription>
              A tela chama <span className="font-mono">/billing/purchases/mock</span> e usa confirmação simulada se o gateway estiver indisponível.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="pix" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix">
                <QrCode data-icon="inline-start" aria-hidden="true" />
                Pix
              </TabsTrigger>
              <TabsTrigger value="mercado-pago">
                <CreditCard data-icon="inline-start" aria-hidden="true" />
                Mercado Pago
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pix" className="pt-5">
              <div className="grid gap-5">
                <div className="mx-auto flex size-52 items-center justify-center rounded-2xl border bg-card p-3 shadow-sm">
                  <div className="surface-grid flex size-full items-center justify-center rounded-xl bg-muted text-primary">
                    <QrCode className="size-24" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie o código Pix abaixo.
                </p>
                <div>
                  <p className="mb-2 text-sm font-medium">Código Pix</p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_44px]">
                    <div className="min-h-14 overflow-hidden rounded-xl border bg-background p-3 font-mono text-xs leading-5 text-muted-foreground">
                      {pixCode}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copiar código Pix"
                      onClick={copyPixCode}
                    >
                      <Copy aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock3 aria-hidden="true" />
                  O QR Code expira em 30 minutos
                </p>
              </div>
            </TabsContent>
            <TabsContent value="mercado-pago" className="pt-5">
              <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed bg-muted/35 p-8 text-center">
                <div>
                  <CreditCard className="mx-auto size-12 text-primary" aria-hidden="true" />
                  <p className="mt-4 font-semibold">Mercado Pago</p>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                    Simule a criação de preferência e registre a compra no gateway mock.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="button" disabled={pending} onClick={confirmPayment} className="w-full">
            {pending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
            )}
            Confirmar pagamento simulado
          </Button>
        </CardContent>
      </Card>

      <Card className="premium-card h-fit rounded-2xl">
        <CardHeader>
          <CardTitle>Resumo da compra</CardTitle>
          <CardDescription>{selectedPlan.name}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-2xl border bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Pacote</p>
            <p className="mt-1 font-semibold">{selectedPlan.records} créditos</p>
            <p className="mt-4 text-3xl font-semibold">{selectedPlan.price}</p>
            <p className="text-sm text-muted-foreground">{selectedPlan.pricePerRecord}</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Segurança da compra</span>
              <span className="text-muted-foreground">100%</span>
            </div>
            <Progress value={100} className="mt-2 h-2" />
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <ShieldCheck className="text-[color:var(--success)]" aria-hidden="true" />
              Créditos adicionados após confirmação.
            </p>
            <p className="flex items-center gap-2">
              <LockKeyhole className="text-primary" aria-hidden="true" />
              Nenhum dado sensível real é processado nesta simulação.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
