"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  Sparkles,
  Zap,
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
import { useUserCreditBalance } from "@/components/veridit/credit-balance";
import { MetricPanel } from "@/components/veridit/metric-panel";
import { StatusPill } from "@/components/veridit/status-pill";
import { getAuthSession } from "@/lib/auth-session";
import {
  toCaptureRecordView,
  type CaptureRecordView,
} from "@/lib/capture-record-view";
import { listCaptureRecords } from "@/lib/gateway";
import { currentUser } from "@/lib/mock-data";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || currentUser.firstName;
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardClient() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<CaptureRecordView[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const { credits, loading: creditsLoading } = useUserCreditBalance();
  const [firstName] = useState(() => {
    const session = getAuthSession();

    return session
      ? getFirstName(session.user.fullName)
      : currentUser.firstName;
  });
  const normalized = query.trim().toLowerCase();
  const completed = records.filter(
    (record) => record.status === "COMPLETED",
  ).length;
  const inProgress = records.filter(
    (record) => record.status === "STARTED",
  ).length;
  const creditValue = creditsLoading && credits === null ? null : (credits ?? 0);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      const session = getAuthSession();

      if (!session) {
        setRecords([]);
        setRecordsLoading(false);
        setRecordsError("Sessão expirada. Faça login novamente.");
        return;
      }

      setRecordsLoading(true);
      setRecordsError(null);

      const result = await listCaptureRecords(session.user.id);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setRecords([]);
        setRecordsError(result.message);
        setRecordsLoading(false);
        return;
      }

      setRecords(result.data.records.map(toCaptureRecordView));
      setRecordsLoading(false);
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    if (!normalized) {
      return records;
    }

    return records.filter((record) =>
      record.searchableText.toLowerCase().includes(normalized),
    );
  }, [normalized, records]);

  return (
    <div className="grid gap-7">
      {/* Hero greeting + credit banner */}
      <section 
        className="relative rounded-[1.25rem] overflow-hidden bg-gradient-to-br from-[#0e4a8a] via-[#1f5fbf] to-[#0f766e] shadow-[0_2px_4px_rgb(15_23_42/0.08),0_12px_40px_rgb(31_95_191/0.18),inset_0_1px_0_rgb(255_255_255/0.08)] reveal-up" 
        style={{ animationDelay: "0ms" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(255,255,255,0.06),transparent),radial-gradient(circle_at_20%_80%,rgba(15,118,110,0.25),transparent_50%)] pointer-events-none" />
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to right, transparent, black 30%, black 70%, transparent)"
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 md:p-8 md:px-9">
          <div className="flex-1 min-w-0">
            <p className="text-2xl sm:text-[1.75rem] font-bold text-[#f0f6ff] leading-[1.2] tracking-[-0.02em]">
              {getTimeGreeting()}, {firstName}
            </p>
            <p className="mt-1.5 text-[0.9rem] text-[#dcebff]/70 leading-[1.5]">
              Suas evidências estão organizadas para auditoria.
            </p>
          </div>
          <div className="flex flex-col md:items-end flex-shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-[0.875rem] bg-white/12 backdrop-blur-md text-[#7dd3c0] shadow-[0_0_20px_rgba(125,211,192,0.15)]">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#dcebff]/60">Saldo disponível</span>
                <span className="text-[2rem] font-extrabold text-white leading-[1.1] tracking-[-0.03em] flex items-baseline gap-1.5">
                  {creditValue === null ? (
                    <span className="text-2xl text-[#dcebff]/40">...</span>
                  ) : (
                    <>
                      {creditValue}
                      <span className="text-sm font-medium text-[#dcebff]/55">créditos</span>
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="secondary" className="bg-white/12 text-[#f0f6ff] border border-white/15 backdrop-blur-sm hover:bg-white/20 hover:border-white/30 transition-colors">
                <Link href="/creditos">
                  <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                  Comprar créditos
                </Link>
              </Button>
              <Button asChild size="sm" className="shadow-[0_0_16px_rgba(255,255,255,0.1)]">
                <Link href="/captura">
                  <Plus className="mr-2 h-4 w-4" data-icon="inline-start" aria-hidden="true" />
                  Nova Captura
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric cards */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Resumo"
      >
        <div className="reveal-up" style={{ animationDelay: "60ms" }}>
          <MetricPanel
            label="Total de registros"
            value={records.length}
            description="Base de evidências"
            icon={FileText}
          />
        </div>
        <div className="reveal-up" style={{ animationDelay: "120ms" }}>
          <MetricPanel
            label="Concluídos"
            value={completed}
            description="Com hash disponível"
            icon={CheckCircle2}
            tone="success"
          />
        </div>
        <div className="reveal-up" style={{ animationDelay: "180ms" }}>
          <MetricPanel
            label="Em validação"
            value={inProgress}
            description="Processamento ativo"
            icon={Clock3}
            tone="warning"
          />
        </div>
      </section>

      {/* Records table — full width */}
      <div className="reveal-up" style={{ animationDelay: "240ms" }}>
        <Card className="premium-card rounded-2xl">
          <CardHeader className="gap-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <CardTitle>Registros de evidência</CardTitle>
              <CardDescription>
                Pesquise por título, URL, status, data ou detalhes.
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
                    <TableHead>Dados</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
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
                            {record.siteUrl}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={record.status} />
                      </TableCell>
                      <TableCell>{record.dataTypeLabel}</TableCell>
                      <TableCell>{record.startedAtLabel}</TableCell>
                      <TableCell>{record.finishedAtLabel}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={record.actionHref}>
                            {record.actionLabel}
                          </Link>
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

            {recordsLoading ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Carregando registros...
              </div>
            ) : null}

            {recordsError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
                <p className="font-medium">Não foi possível carregar os registros.</p>
                <p className="mt-1">{recordsError}</p>
              </div>
            ) : null}

            {!recordsLoading && !recordsError && filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {normalized
                  ? "Nenhum registro encontrado para a busca."
                  : "Nenhum registro realizado ainda."}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
