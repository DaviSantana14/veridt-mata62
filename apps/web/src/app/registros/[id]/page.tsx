import Link from "next/link";
import {
  Camera,
  FileVideo,
  LayoutDashboard,
  Play,
  UserRound,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/veridit/section-header";
import { StatusPill } from "@/components/veridit/status-pill";
import { toCaptureRecordDetailView } from "@/lib/capture-record-detail-view";
import { getCaptureRecord, getUserProfile } from "@/lib/gateway";

export default async function RecordDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordResult = await getCaptureRecord(id);

  if (!recordResult.ok) {
    return (
      <AppShell active="dashboard">
        <Card className="premium-card mx-auto max-w-2xl rounded-2xl">
          <CardHeader>
            <CardTitle>Registro não encontrado</CardTitle>
            <CardDescription>
              Não foram usados dados fictícios para montar esta tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Alert variant="destructive">
              <AlertTitle>Registro não encontrado</AlertTitle>
              <AlertDescription>{recordResult.message}</AlertDescription>
            </Alert>
            <div>
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const profileResult = await getUserProfile(recordResult.data.userId);
  const record = toCaptureRecordDetailView(
    recordResult.data,
    profileResult.ok ? profileResult.data : undefined,
  );
  const profileErrorMessage = profileResult.ok ? null : profileResult.message;

  return (
    <AppShell active="dashboard">
      <div className="grid gap-6">
        <SectionHeader
          eyebrow="Registro digital"
          title={record.title}
          description={record.siteUrl}
          meta={
            <div className="flex flex-wrap gap-2">
              <StatusPill status={record.status} />
            </div>
          }
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard data-icon="inline-start" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/captura">
                  <Camera data-icon="inline-start" aria-hidden="true" />
                  Nova captura
                </Link>
              </Button>
              {record.resumeHref ? (
                <Button asChild>
                  <Link href={record.resumeHref}>
                    <Play data-icon="inline-start" aria-hidden="true" />
                    Continuar captura
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />

        {profileErrorMessage ? (
          <Alert>
            <AlertTitle>Usuário responsável não carregado</AlertTitle>
            <AlertDescription>
              Nome e email não puderam ser carregados pelo gateway (
              {profileErrorMessage}). O ID técnico do usuário foi preservado.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Metadados do registro</CardTitle>
              <CardDescription>
                Dados persistidos pelo serviço de captura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <Detail label="ID" value={record.id} />
                <Separator />
                <Detail
                  label="Data/hora início"
                  value={record.startedAtLabel}
                />
                <Detail label="Data/hora fim" value={record.finishedAtLabel} />
                <Detail
                  label="Tipo de dado registrado"
                  value={record.dataTypeLabel}
                />
                <Separator />
                <Detail label="URL/site" value={record.siteUrl} breakAll />
                <Detail label="Status" value={record.statusLabel} />
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="text-primary" aria-hidden="true" />
                  Informações dos dados
                </CardTitle>
                <CardDescription>
                  Contagem de mídias vinculadas ao registro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm">
                  <Detail
                    label="Número de imagens"
                    value={record.imageCountLabel}
                  />
                  <Detail
                    label="Número de vídeos"
                    value={record.videoCountLabel}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="text-primary" aria-hidden="true" />
                  Usuário responsável
                </CardTitle>
                <CardDescription>
                  Dados retornados pelo serviço de identidade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm">
                  <Detail label="Nome" value={record.responsibleName} />
                  <Detail
                    label="Email"
                    value={record.responsibleEmail}
                    breakAll
                  />
                  <Detail
                    label="ID técnico do usuário"
                    value={record.responsibleUserId}
                    breakAll
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          breakAll
            ? "break-all font-medium"
            : "min-w-0 overflow-hidden text-ellipsis font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
