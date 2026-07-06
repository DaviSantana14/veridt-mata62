import { Archive, BadgeCheck, Camera, FileText, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VeriditLogo } from "@/components/layout/veridit-logo";
import type {
  RecordReportAssetView,
  RecordReportView,
} from "@/lib/record-report-view";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border bg-background/70 p-3 sm:grid-cols-[180px_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function AssetList({
  assets,
  emptyLabel,
}: {
  assets: RecordReportAssetView[];
  emptyLabel: string;
}) {
  if (assets.length === 0) {
    return (
      <p className="rounded-xl border bg-background/70 p-4 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {assets.map((asset) => (
        <div key={asset.id} className="rounded-xl border bg-background/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="break-all text-sm font-semibold">{asset.fileName}</p>
            <Badge variant="outline">{asset.fileSizeLabel}</Badge>
          </div>

          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">URL capturada</dt>
              <dd className="break-words font-medium">{asset.sourceUrlLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gerado em</dt>
              <dd className="font-medium">{asset.createdAtLabel}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

export function ReportDocument({ report }: { report: RecordReportView }) {
  return (
    <Card className="document-paper overflow-hidden rounded-2xl border bg-card shadow-[0_24px_80px_rgb(15_23_42/0.10)]">
      <CardHeader className="border-b bg-card/95 p-6 text-center sm:p-8">
        <div className="mx-auto">
          <VeriditLogo className="pointer-events-none justify-center" />
        </div>

        <Badge className="mx-auto mt-4 rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
          <BadgeCheck aria-hidden="true" />
          Dados reais do registro
        </Badge>

        <CardTitle className="mt-4 text-2xl">
          Relatório de Registro Digital
        </CardTitle>

        <CardDescription>
          Veridit - captura, metadados e arquivos gerados
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-8 p-5 sm:p-8">
        <section>
          <h2 className="text-lg font-semibold">Informações do registro</h2>

          <dl className="mt-4 grid gap-3">
            <Detail label="ID do Registro" value={report.id} />
            <Detail label="Título" value={report.title} />
            <Detail label="URL" value={report.siteUrl} />
            <Detail label="Status" value={report.statusLabel} />
            <Detail label="Data de Criação" value={report.startedAtLabel} />
            <Detail label="Data de Conclusão" value={report.finishedAtLabel} />
            <Detail label="Duração" value={report.durationLabel} />
          </dl>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold">Responsável</h2>

          <dl className="mt-4 grid gap-3">
            <Detail label="Nome" value={report.responsibleName} />
            <Detail label="E-mail" value={report.responsibleEmail} />
            <Detail label="CPF" value={report.responsibleCpf} />
            <Detail label="ID do usuário" value={report.responsibleUserId} />
          </dl>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Camera className="text-primary" aria-hidden="true" />
            Imagens capturadas
          </h2>

          <AssetList
            assets={report.imageAssets}
            emptyLabel="Nenhuma imagem capturada para este registro."
          />
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Video className="text-primary" aria-hidden="true" />
            Vídeos capturados
          </h2>

          <AssetList
            assets={report.videoAssets}
            emptyLabel="Nenhum vídeo capturado para este registro."
          />
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Archive className="text-primary" aria-hidden="true" />
            Arquivos gerados pelo sistema
          </h2>

          <div className="grid gap-3">
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="text-primary" aria-hidden="true" />
                metadata.json
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Metadados do registro, responsável e arquivos capturados.
              </p>
            </div>

            {report.allAssets.map((asset) => (
              <div key={asset.id} className="rounded-xl border bg-background/70 p-4">
                <p className="break-all text-sm font-semibold">
                  assets/{asset.fileName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arquivo original capturado pelo serviço de registro.
                </p>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
