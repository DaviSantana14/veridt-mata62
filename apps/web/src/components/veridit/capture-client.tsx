"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  ShieldCheck,
  Video,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { EvidencePreview } from "@/components/veridit/evidence-preview";
import { Timeline } from "@/components/veridit/timeline";
import { startMockCapture } from "@/lib/gateway";
import { captureChecklist, captureTypes, chainOfCustody, currentUser } from "@/lib/mock-data";

export function CaptureClient() {
  const router = useRouter();
  const [captureType, setCaptureType] = useState<"video" | "screenshot">("video");
  const [url, setUrl] = useState("https://exemplo-processo.jus.br/detalhes");
  const [includeScroll, setIncludeScroll] = useState(true);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const result = await startMockCapture({
      userId: "user-demo-001",
      title:
        captureType === "video"
          ? "Gravação de Navegação"
          : "Captura de Tela",
      siteUrl: url,
    });

    setPending(false);

    if (result.ok) {
      toast.success("Captura registrada no serviço.");
    } else {
      toast.warning("Captura registrada localmente. API Gateway indisponível.", {
        description: result.message,
      });
    }

    router.push("/captura/concluida");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,640px)_1fr]">
      <Card className="premium-card rounded-2xl">
        <CardHeader>
          <CardTitle>Configuração da evidência</CardTitle>
          <CardDescription>
            Defina fonte, modalidade e parâmetros técnicos antes do registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} id="capture-form">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="siteUrl">URL do Site</FieldLabel>
                <Input
                  id="siteUrl"
                  name="siteUrl"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />
                <FieldDescription>
                  A URL será gravada no relatório e na trilha de custódia.
                </FieldDescription>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Tipo de Captura</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={captureType}
                    onValueChange={(value) => {
                      if (value === "video" || value === "screenshot") {
                        setCaptureType(value);
                      }
                    }}
                    className="grid grid-cols-2"
                  >
                    {captureTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <ToggleGroupItem
                          key={type.value}
                          value={type.value}
                          className="h-11 gap-2"
                          aria-label={type.label}
                        >
                          <Icon aria-hidden="true" />
                          {type.label}
                        </ToggleGroupItem>
                      );
                    })}
                  </ToggleGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="capture-profile">Perfil técnico</FieldLabel>
                  <Select defaultValue="legal">
                    <SelectTrigger id="capture-profile" className="w-full">
                      <SelectValue placeholder="Perfil técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal">Jurídico completo</SelectItem>
                      <SelectItem value="fast">Registro rápido</SelectItem>
                      <SelectItem value="audit">Auditoria detalhada</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border bg-background/80 p-4">
                <div>
                  <FieldLabel htmlFor="include-scroll">Capturar rolagem e metadados</FieldLabel>
                  <FieldDescription>
                    Mantém contexto de navegação para relatório mais completo.
                  </FieldDescription>
                </div>
                <Switch
                  id="include-scroll"
                  checked={includeScroll}
                  onCheckedChange={setIncludeScroll}
                  aria-label="Capturar rolagem e metadados"
                />
              </div>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Preparação técnica</span>
              <span className="text-muted-foreground">{pending ? "78%" : "Pronto"}</span>
            </div>
            <Progress value={pending ? 78 : 100} className="h-2" />
          </div>
          <Button type="submit" form="capture-form" disabled={pending} className="w-full">
            {pending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : captureType === "video" ? (
              <Video data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Camera data-icon="inline-start" aria-hidden="true" />
            )}
            Iniciar registro verificável
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6">
        <Alert className="border-[color:var(--evidence)]/20 bg-teal-50">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Saldo e cadeia de custódia prontos</AlertTitle>
          <AlertDescription>
            Saldo atual: {currentUser.credits} créditos. Cada captura consome 1 crédito e gera relatório com hash.
          </AlertDescription>
        </Alert>

        <Card className="premium-card rounded-2xl">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>Composição aproximada do registro antes da captura.</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  Abrir preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Preview da evidência</DialogTitle>
                  <DialogDescription>
                    Visual prévio do conteúdo que será registrado.
                  </DialogDescription>
                </DialogHeader>
                <EvidencePreview title="Prévia da captura" url={url} kind={captureType} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <EvidencePreview title="Prévia da captura" url={url} kind={captureType} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Checklist técnico</CardTitle>
              <CardDescription>Critérios aplicados no fluxo de registro.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {captureChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 text-[color:var(--success)]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Etapas do registro</CardTitle>
              <CardDescription>Fluxo documental esperado ao concluir.</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline
                compact
                items={[
                  {
                    title: "URL confirmada",
                    description: "Fonte e perfil técnico ficam registrados.",
                    time: "1",
                    icon: Globe2,
                  },
                  ...chainOfCustody,
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
