"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Plus,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EvidenceCard } from "@/components/veridit/evidence-card";
import { MetricPanel } from "@/components/veridit/metric-panel";
import { SectionHeader } from "@/components/veridit/section-header";
import { StatusPill } from "@/components/veridit/status-pill";
import { Timeline } from "@/components/veridit/timeline";
import { getAuthSession } from "@/lib/auth-session";
import { currentUser, dashboardActivity, records } from "@/lib/mock-data";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || currentUser.firstName;
}

export function DashboardClient() {
  const [query, setQuery] = useState("");
  const [firstName] = useState(() => {
    const session = getAuthSession();

    return session
      ? getFirstName(session.user.fullName)
      : currentUser.firstName;
  });
  const normalized = query.trim().toLowerCase();
  const completed = records.filter(
    (record) => record.status === "completed",
  ).length;
  const inProgress = records.filter(
    (record) => record.status === "progress",
  ).length;

  const filteredRecords = useMemo(() => {
    if (!normalized) {
      return records;
    }

    return records.filter((record) =>
      [record.title, record.url, record.status, record.createdAt, record.hash]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [normalized]);

  return (
    <div className="grid gap-8">
      <SectionHeader
        eyebrow="Painel Veridit"
        title={`Bom dia, ${firstName}. Suas evidências estão organizadas para auditoria.`}
        description="Acompanhe capturas, relatórios, status e saldo em uma visão operacional para rotinas jurídicas."
        action={
          <Button asChild>
            <Link href="/captura">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Nova Captura
            </Link>
          </Button>
        }
      />

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo"
      >
        <MetricPanel
          label="Total de registros"
          value={records.length}
          description="Base demonstrativa"
          icon={FileText}
          progress={92}
        />
        <MetricPanel
          label="Concluídos"
          value={completed}
          description="Com hash disponível"
          icon={CheckCircle2}
          tone="success"
          progress={Math.round((completed / records.length) * 100)}
        />
        <MetricPanel
          label="Em validação"
          value={inProgress}
          description="Processamento ativo"
          icon={Clock3}
          tone="warning"
          progress={28}
        />
        <MetricPanel
          label="Créditos"
          value={currentUser.credits}
          description="Saldo para novas capturas"
          icon={CreditCard}
          tone="evidence"
          progress={64}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="premium-card rounded-2xl">
          <CardHeader className="gap-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <CardTitle>Registros de evidência</CardTitle>
              <CardDescription>
                Pesquise por título, URL, status, data ou hash.
              </CardDescription>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Buscar registros"
                className="pl-9"
                placeholder="Buscar evidências..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="transition-colors hover:bg-muted/45"
                    >
                      <TableCell className="max-w-[360px]">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{record.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {record.url}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={record.status} />
                      </TableCell>
                      <TableCell>
                        {record.kind === "video" ? "Vídeo" : "Screenshot"}
                      </TableCell>
                      <TableCell>{record.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/registros/${record.id}`}>Abrir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filteredRecords.map((record) => (
                <EvidenceCard key={record.id} record={record} />
              ))}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado para a busca.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="premium-card rounded-2xl">
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>
              Eventos relevantes do cofre de evidências.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline items={dashboardActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
