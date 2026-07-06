"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUserCreditBalance } from "@/components/veridit/credit-balance";
import { getAuthSession } from "@/lib/auth-session";
import { getCaptureResumeHref } from "@/lib/capture-record-formatters";
import { startCapture } from "@/lib/gateway";

export function CaptureClient() {
  const router = useRouter();
  const { credits, loading: creditsLoading } = useUserCreditBalance();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      toast.error("Informe o link que deve ser registrado.");
      return;
    }

    const session = getAuthSession();

    if (!session) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setPending(true);

    const result = await startCapture({
      userId: session.user.id,
      siteUrl: normalizedUrl,
    });

    setPending(false);

    if (!result.ok) {
      toast.error("Não foi possível iniciar o registro.", {
        description: result.message,
      });
      return;
    }

    toast.success("Sessão de captura iniciada.");
    router.push(getCaptureResumeHref(result.data.id));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,680px)_1fr]">
      <Card className="premium-card rounded-2xl">
        <CardHeader>
          <CardTitle>Link do conteúdo</CardTitle>
          <CardDescription>
            Informe a página que será aberta em um navegador controlado para o
            registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} id="capture-form">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="siteUrl">URL do site</FieldLabel>
                <Input
                  id="siteUrl"
                  name="siteUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://exemplo.com/pagina"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  autoComplete="url"
                  required
                />
                <FieldDescription>
                  A navegação, os prints e o vídeo serão vinculados a esse
                  registro.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            form="capture-form"
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight data-icon="inline-start" aria-hidden="true" />
            )}
            Abrir navegador de captura
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6">
        <Alert className="border-[color:var(--evidence)]/20 bg-teal-50">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Registro navegável</AlertTitle>
          <AlertDescription>
            Saldo atual:{" "}
            {creditsLoading && credits === null ? "..." : (credits ?? 0)}{" "}
            créditos. A próxima tela abre o conteúdo em um navegador isolado com
            ações de print e vídeo.
          </AlertDescription>
        </Alert>

        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="text-[color:var(--evidence)]" />
              Como a sessão abre
            </CardTitle>
            <CardDescription>
              O conteúdo aparece dentro do Veridit, mas a navegação acontece no
              browser controlado pelo serviço de captura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="font-medium">Interação</dt>
                <dd className="mt-1 text-muted-foreground">
                  Cliques, teclado e rolagem são enviados para o navegador da
                  sessão.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Evidências</dt>
                <dd className="mt-1 text-muted-foreground">
                  Os botões laterais permitem gravar vídeo, tirar print do
                  conteúdo e finalizar o registro.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
