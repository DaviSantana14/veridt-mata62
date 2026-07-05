"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  LockKeyhole,
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
import {
  createCardPayment,
  createEmbeddedCreditPurchase,
  simulatePayment,
} from "@/lib/gateway";
import { currentUser } from "@/lib/mock-data";
import type { CreateCardPaymentResponse } from "@veridit/contracts";

type BrickStatus = "preparing" | "ready" | "submitting" | "error";

type PaymentBrickFormData = {
  token?: string;
  installments?: number | string;
  payment_method_id?: string;
  paymentMethodId?: string;
  issuer_id?: string;
  issuerId?: string;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
};

type PaymentBrickSubmitPayload =
  | PaymentBrickFormData
  | {
      selectedPaymentMethod?: string;
      formData?: PaymentBrickFormData;
    };

type BrickController = {
  unmount?: () => void;
};

type MercadoPagoInstance = {
  bricks: () => {
    create: (
      type: "payment",
      containerId: string,
      settings: unknown,
    ) => Promise<BrickController>;
  };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => MercadoPagoInstance;
  }
}

const brickContainerId = "mercado-pago-payment";

export function PaymentClient({
  packageName,
}: {
  packageName: "basic" | "medium" | "premium";
}) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<BrickStatus>("preparing");
  const [simulationPending, setSimulationPending] = useState(false);
  const [purchase, setPurchase] = useState<{
    purchaseId: string;
    amountInCents: number;
    credits: number;
    packageDisplayName: string;
    pricePerCreditInCents: number;
  } | null>(null);
  const [pix, setPix] = useState<CreateCardPaymentResponse["pix"] | null>(null);
  const controllerRef = useRef<BrickController | null>(null);
  const initializedRef = useRef(false);
  const paymentIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (window.MercadoPago) {
      setSdkReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sdkReady || initializedRef.current) {
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

    if (!publicKey) {
      setStatus("error");
      toast.error("Chave pública do Mercado Pago não configurada.");
      return;
    }

    const mercadoPagoPublicKey = publicKey;

    if (!window.MercadoPago) {
      setStatus("error");
      toast.error("SDK do Mercado Pago indisponível.");
      return;
    }

    const MercadoPago = window.MercadoPago;
    initializedRef.current = true;
    let cancelled = false;

    async function renderBrick() {
      setStatus("preparing");

      const purchaseResult = await createEmbeddedCreditPurchase(
        {
          userId: "user-demo-001",
          packageName,
          payerEmail: currentUser.email,
        },
        crypto.randomUUID(),
      );

      if (cancelled) {
        return;
      }

      if (!purchaseResult.ok) {
        setStatus("error");
        toast.error("Não foi possível iniciar a compra.", {
          description: purchaseResult.message,
        });
        return;
      }

      const pendingPurchase = {
        purchaseId: purchaseResult.data.purchaseId,
        amountInCents: purchaseResult.data.amountInCents,
        credits: purchaseResult.data.credits,
        packageDisplayName: purchaseResult.data.packageDisplayName,
        pricePerCreditInCents: purchaseResult.data.pricePerCreditInCents,
      };

      setPurchase(pendingPurchase);

      const mercadoPago = new MercadoPago(mercadoPagoPublicKey);
      const bricksBuilder = mercadoPago.bricks();

      setStatus("ready");
      controllerRef.current = await bricksBuilder.create(
        "payment",
        brickContainerId,
        {
          initialization: {
            amount: pendingPurchase.amountInCents / 100,
            payer: {
              email: currentUser.email,
            },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all",
            },
          },
          callbacks: {
            onReady: () => {
              setStatus("ready");
            },
            onSubmit: async (payload: PaymentBrickSubmitPayload) => {
              setStatus("submitting");

              const formData = extractPaymentBrickFormData(payload);

              const paymentResult = await createCardPayment(
                pendingPurchase.purchaseId,
                normalizePaymentBrickFormData(formData, payload),
                getStablePaymentIdempotencyKey(paymentIdempotencyKeyRef),
              );

              if (!paymentResult.ok) {
                setStatus("ready");
                toast.error("Pagamento não autorizado.", {
                  description: paymentResult.message,
                });
                throw new Error(paymentResult.message);
              }

              if (paymentResult.data.status === "PAID") {
                toast.success("Pagamento aprovado. Créditos em atualização.");
                router.push("/dashboard");
                return;
              }

              if (paymentResult.data.status === "PENDING") {
                if (
                  paymentResult.data.pix?.qrCode ||
                  paymentResult.data.pix?.qrCodeBase64
                ) {
                  setPix(paymentResult.data.pix);
                  setStatus("ready");
                  toast.info(
                    "Pix gerado. Conclua o pagamento para liberar os créditos.",
                  );
                  return;
                }

                toast.info("Pagamento em análise.", {
                  description:
                    "Você pode acompanhar a atualização pelo painel.",
                });
                router.push("/dashboard");
                return;
              }

              toast.warning("Pagamento não concluído.");
              router.push("/creditos");
            },
            onError: () => {
              setStatus("error");
              toast.error("O formulário de cartão encontrou um erro.");
            },
          },
        },
      );
    }

    renderBrick().catch((error) => {
      setStatus("error");
      toast.error("Não foi possível carregar o pagamento.", {
        description: error instanceof Error ? error.message : undefined,
      });
    });

    return () => {
      cancelled = true;
      controllerRef.current?.unmount?.();
      controllerRef.current = null;
    };
  }, [router, sdkReady]);

  const loading = status === "preparing" || status === "submitting";

  async function handleSimulatePayment() {
    if (!purchase || simulationPending) {
      return;
    }

    setSimulationPending(true);
    const result = await simulatePayment(purchase.purchaseId);

    if (!result.ok) {
      setSimulationPending(false);
      toast.error("Não foi possível simular o pagamento.", {
        description: result.message,
      });
      return;
    }

    const params = new URLSearchParams({
      purchaseId: result.data.purchaseId,
      credits: String(result.data.credits),
      package: result.data.packageDisplayName,
    });

    router.push(`/pagamento/confirmacao?${params.toString()}`);
  }

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => {
          setStatus("error");
          toast.error("Não foi possível carregar o Mercado Pago.");
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <CardTitle>Pagamento com Mercado Pago</CardTitle>
            <CardDescription>
              Escolha cartão ou Pix para concluir a compra com Mercado Pago.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Alert className="border-primary/20 bg-primary/5">
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>Pagamento protegido</AlertTitle>
              <AlertDescription>
                Os dados sensíveis são processados pelo Mercado Pago antes do
                envio.
              </AlertDescription>
            </Alert>

            <div className="relative min-h-[520px] rounded-xl border bg-background p-4">
              {loading ? (
                <div className="absolute inset-4 z-10 grid place-items-center rounded-lg bg-background/95 text-center text-sm text-muted-foreground">
                  <div>
                    <Loader2
                      className="mx-auto mb-3 size-6 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    Preparando pagamento...
                  </div>
                </div>
              ) : null}
              <div
                id={brickContainerId}
                className={loading ? "pointer-events-none opacity-0" : ""}
              />
            </div>

            {pix ? <PixPaymentDetails pix={pix} /> : null}
          </CardContent>
        </Card>

        <Card className="premium-card h-fit rounded-2xl">
          <CardHeader>
            <CardTitle>Resumo da compra</CardTitle>
            <CardDescription>
              {purchase?.packageDisplayName ?? "Carregando pacote"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-2xl border bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Pacote</p>
              <p className="mt-1 font-semibold">
                {purchase
                  ? `${purchase.credits} créditos`
                  : "Carregando créditos"}
              </p>
              <p className="mt-4 text-3xl font-semibold">
                {purchase
                  ? formatCurrency(purchase.amountInCents)
                  : "Carregando"}
              </p>
              <p className="text-sm text-muted-foreground">
                {purchase
                  ? `${formatCurrency(purchase.pricePerCreditInCents)} por registro`
                  : "Valor definido pelo billing"}
              </p>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <ShieldCheck
                  className="text-[color:var(--success)]"
                  aria-hidden="true"
                />
                Créditos adicionados após confirmação.
              </p>
              <p className="flex items-center gap-2">
                {status === "submitting" ? (
                  <Loader2
                    className="animate-spin text-primary"
                    aria-hidden="true"
                  />
                ) : status === "ready" ? (
                  <CheckCircle2 className="text-primary" aria-hidden="true" />
                ) : (
                  <CreditCard className="text-primary" aria-hidden="true" />
                )}
                {getStatusCopy(status)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!purchase || simulationPending}
              onClick={handleSimulatePayment}
            >
              {simulationPending ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
              )}
              Simular pagamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function normalizePaymentBrickFormData(
  formData: PaymentBrickFormData,
  payload: PaymentBrickSubmitPayload,
) {
  const selectedPaymentMethod =
    "selectedPaymentMethod" in payload
      ? payload.selectedPaymentMethod
      : undefined;
  const paymentMethodId =
    formData.paymentMethodId ??
    formData.payment_method_id ??
    selectedPaymentMethod;
  const issuerId = formData.issuerId ?? formData.issuer_id;
  const installments = Number(formData.installments);

  if (!paymentMethodId) {
    throw new Error("Dados do pagamento incompletos.");
  }

  if (
    paymentMethodId !== "pix" &&
    (!formData.token || !Number.isFinite(installments))
  ) {
    throw new Error("Dados do cartão incompletos.");
  }

  return {
    token: formData.token,
    installments: Number.isFinite(installments) ? installments : undefined,
    paymentMethodId,
    selectedPaymentMethod,
    issuerId,
    payer: {
      email: formData.payer?.email ?? currentUser.email,
      identification: formData.payer?.identification,
    },
  };
}

function PixPaymentDetails({
  pix,
}: {
  pix: NonNullable<CreateCardPaymentResponse["pix"]>;
}) {
  async function copyPixCode() {
    if (!pix.qrCode) {
      return;
    }

    await navigator.clipboard.writeText(pix.qrCode);
    toast.success("Código Pix copiado.");
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-background p-4">
      <div>
        <p className="font-semibold">Pix gerado pelo Mercado Pago</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código para concluir o pagamento.
        </p>
      </div>

      {pix.qrCodeBase64 ? (
        <div className="flex justify-center">
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            className="size-52 rounded-lg border bg-white p-2"
          />
        </div>
      ) : null}

      {pix.qrCode ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="min-h-12 overflow-hidden rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-5 text-muted-foreground">
            {pix.qrCode}
          </div>
          <Button type="button" variant="outline" onClick={copyPixCode}>
            <Copy data-icon="inline-start" aria-hidden="true" />
            Copiar
          </Button>
        </div>
      ) : null}

      {pix.ticketUrl ? (
        <Button asChild variant="outline" className="w-fit">
          <a href={pix.ticketUrl} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            Abrir no Mercado Pago
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function extractPaymentBrickFormData(
  payload: PaymentBrickSubmitPayload,
): PaymentBrickFormData {
  if ("formData" in payload && payload.formData) {
    return payload.formData;
  }

  return payload as PaymentBrickFormData;
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountInCents / 100);
}

function getStatusCopy(status: BrickStatus) {
  if (status === "ready") {
    return "Formulário pronto para preenchimento.";
  }

  if (status === "submitting") {
    return "Processando autorização.";
  }

  if (status === "error") {
    return "Revise a configuração e tente novamente.";
  }

  return "Conectando ao provedor de pagamento.";
}

function getStablePaymentIdempotencyKey(ref: MutableRefObject<string | null>) {
  if (!ref.current) {
    ref.current = crypto.randomUUID();
  }

  return ref.current;
}
