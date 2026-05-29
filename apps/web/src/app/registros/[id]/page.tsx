import Link from "next/link";
import {
  Archive,
  Camera,
  Download,
  FileText,
  Printer,
  Video,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EvidencePreview } from "@/components/veridit/evidence-preview";
import { SectionHeader } from "@/components/veridit/section-header";
import { StatusPill } from "@/components/veridit/status-pill";
import { Timeline } from "@/components/veridit/timeline";
import { chainOfCustody, getRecordById } from "@/lib/mock-data";

export default async function RecordDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getRecordById(id);
  const MediaIcon = record.kind === "video" ? Video : Camera;

  return (
    <AppShell active="dashboard">
      <div className="grid gap-6">
        <SectionHeader
          eyebrow="Registro digital"
          title={record.title}
          description={record.description}
          meta={
            <div className="flex flex-wrap gap-2">
              <StatusPill status={record.status} />
              <Badge variant="secondary" className="rounded-full">
                <MediaIcon aria-hidden="true" />
                {record.kind === "video" ? "Vídeo" : "Screenshot"}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <FileText aria-hidden="true" />
                Relatório disponível
              </Badge>
            </div>
          }
          action={
            <>
              <Button asChild variant="outline">
                <Link href={`/registros/${record.id}/relatorio`}>
                  <Printer data-icon="inline-start" aria-hidden="true" />
                  Ver relatório
                </Link>
              </Button>
              <Button type="button">
                <Download data-icon="inline-start" aria-hidden="true" />
                Baixar ZIP
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Pré-visualização da evidência</CardTitle>
              <CardDescription>Conteúdo capturado durante o registro.</CardDescription>
            </CardHeader>
            <CardContent>
              <EvidencePreview
                title={record.title}
                url={record.url}
                kind={record.kind}
                status={record.status}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle>Detalhes do registro</CardTitle>
                <CardDescription>Metadados essenciais para conferência.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">URL</dt>
                    <dd className="mt-1 break-all font-medium">{record.url}</dd>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-muted-foreground">ID</dt>
                      <dd className="mt-1 font-medium">{record.id}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tipo</dt>
                      <dd className="mt-1 font-medium">
                        {record.kind === "video" ? "Vídeo" : "Screenshot"}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Criação</dt>
                    <dd className="mt-1 font-medium">{record.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Conclusão</dt>
                    <dd className="mt-1 font-medium">{record.completedAt ?? "Em processamento"}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-muted-foreground">Duração</dt>
                      <dd className="mt-1 font-medium">{record.duration ?? "Instantânea"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tamanho</dt>
                      <dd className="mt-1 font-medium">{record.size ?? "Calculando"}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hash de Integridade</dt>
                    <dd className="mt-2 flex items-start gap-2 break-all rounded-xl border bg-background/80 p-3 font-mono text-xs leading-6">
                      <Archive className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      {record.hash}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle>Cadeia de custódia</CardTitle>
                <CardDescription>Eventos documentados desta evidência.</CardDescription>
              </CardHeader>
              <CardContent>
                <Timeline items={chainOfCustody} compact />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
