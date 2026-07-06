import Link from "next/link";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LinkIcon,
  ShieldCheck,
  Video,
} from "lucide-react";
import type { CaptureRecordDetailsResponse } from "@veridit/contracts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Timeline, type TimelineItem } from "@/components/veridit/timeline";
import { getCaptureRecord } from "@/lib/gateway";

type CaptureCompletedPageProps = {
  searchParams: Promise<{
    recordId?: string | string[];
  }>;
};

export default async function CaptureCompletedPage({
  searchParams,
}: CaptureCompletedPageProps) {
  const params = await searchParams;
  const recordId = getSingleParam(params.recordId);

  if (!recordId) {
    return (
      <CompletionShell>
        <CompletionError
          title="Registro não informado"
          description="A tela de conclusão precisa receber o identificador do registro finalizado."
        />
      </CompletionShell>
    );
  }

  const result = await getCaptureRecord(recordId);

  if (!result.ok) {
    return (
      <CompletionShell>
        <CompletionError
          title="Não foi possível carregar o registro"
          description={result.message}
        />
      </CompletionShell>
    );
  }

  return (
    <CompletionShell>
      <CompletionContent record={result.data} />
    </CompletionShell>
  );
}

function CompletionShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10">
      <section className="grid min-h-[calc(100dvh-80px)] place-items-center">
        <div className="w-full max-w-5xl">{children}</div>
      </section>
    </main>
  );
}

function CompletionContent({
  record,
}: {
  record: CaptureRecordDetailsResponse;
}) {
  const completed = record.status === "COMPLETED";
  const timelineItems = getTimelineItems(record);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="premium-card rounded-2xl">
        <CardHeader className="items-center gap-4 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
            {completed ? (
              <CheckCircle2 className="size-10" aria-hidden="true" />
            ) : (
              <Clock3 className="size-10" aria-hidden="true" />
            )}
          </span>
          <Badge className="rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
            <ShieldCheck aria-hidden="true" />
            {completed ? "Registro concluído" : "Registro em andamento"}
          </Badge>
          <div>
            <CardTitle className="text-3xl">
              {completed ? "Captura concluída" : "Captura ainda em andamento"}
            </CardTitle>
            <CardDescription className="mt-2">
              {completed
                ? "O registro foi processado e já está pronto para acompanhamento no dashboard."
                : "Este registro ainda não foi finalizado no serviço de captura."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <dl className="grid gap-3 rounded-2xl border bg-background/80 p-4 text-sm">
            <Detail label="Título" value={record.title} />
            <Detail label="Tipo" value={getCaptureType(record)} />
            <Detail label="Status" value={getStatusLabel(record.status)} />
            <Detail label="Site inicial" value={record.siteUrl} />
            <Detail label="Início" value={formatDateTime(record.startedAt)} />
            <Detail
              label="Conclusão"
              value={
                record.finishedAt ? formatDateTime(record.finishedAt) : "-"
              }
            />
            <Detail label="Prints" value={String(record.imageCount)} />
            <Detail label="Vídeos" value={String(record.videoCount)} />
          </dl>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/dashboard">
                <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/captura">
                <Video data-icon="inline-start" aria-hidden="true" />
                Nova Captura
              </Link>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            ID do registro: {record.id}
          </p>
        </CardContent>
      </Card>

      <Card className="premium-card rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-primary" aria-hidden="true" />
            Cadeia registrada
          </CardTitle>
          <CardDescription>Resumo documental desta captura.</CardDescription>
        </CardHeader>
        <CardContent>
          <Timeline items={timelineItems} compact />
        </CardContent>
      </Card>
    </div>
  );
}

function CompletionError({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="premium-card mx-auto max-w-2xl rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Não foram usados dados fictícios para montar esta tela.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Alert variant="destructive">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild>
            <Link href="/dashboard">
              <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/captura">
              <Video data-icon="inline-start" aria-hidden="true" />
              Nova Captura
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[68%] truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function getTimelineItems(
  record: CaptureRecordDetailsResponse,
): TimelineItem[] {
  return [
    {
      title: "Captura iniciada",
      description: `Sessão aberta para ${getHostname(record.siteUrl)}.`,
      time: formatTime(record.startedAt),
      icon: LinkIcon,
    },
    {
      title: "Mídias registradas",
      description: `${record.imageCount} print(s) e ${record.videoCount} vídeo(s) vinculados ao registro.`,
      time: record.finishedAt ? formatTime(record.finishedAt) : undefined,
      icon: record.videoCount > 0 ? Video : ImageIcon,
    },
    {
      title:
        record.status === "COMPLETED"
          ? "Registro concluído"
          : "Registro pendente",
      description:
        record.status === "COMPLETED"
          ? "Data de conclusão persistida pelo serviço de captura."
          : "A conclusão ainda não foi persistida pelo serviço de captura.",
      time: record.finishedAt ? formatTime(record.finishedAt) : undefined,
      icon: record.status === "COMPLETED" ? CheckCircle2 : Clock3,
    },
  ];
}

function getCaptureType(record: CaptureRecordDetailsResponse): string {
  if (record.imageCount > 0 && record.videoCount > 0) {
    return "Print + Vídeo";
  }

  if (record.videoCount > 0) {
    return "Vídeo de Navegação";
  }

  if (record.imageCount > 0) {
    return "Captura de Tela";
  }

  return "Registro sem mídia";
}

function getStatusLabel(
  status: CaptureRecordDetailsResponse["status"],
): string {
  const labels: Record<CaptureRecordDetailsResponse["status"], string> = {
    COMPLETED: "Concluído",
    FAILED: "Falhou",
    STARTED: "Em andamento",
  };

  return labels[status];
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getHostname(siteUrl: string): string {
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return siteUrl;
  }
}
