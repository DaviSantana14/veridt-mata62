import Link from "next/link";
import { CheckCircle2, FileText, LayoutDashboard, ShieldCheck, Video } from "lucide-react";

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
import { Timeline } from "@/components/veridit/timeline";
import { chainOfCustody, currentUser } from "@/lib/mock-data";

export default function CaptureCompletedPage() {
  return (
    <AppShell active="capture">
      <section className="grid min-h-[calc(100dvh-160px)] place-items-center">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="premium-card rounded-2xl">
            <CardHeader className="items-center gap-4 text-center">
              <span className="flex size-20 items-center justify-center rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
                <CheckCircle2 className="size-10" aria-hidden="true" />
              </span>
              <Badge className="rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
                <ShieldCheck aria-hidden="true" />
                Integridade pronta
              </Badge>
              <div>
                <CardTitle className="text-3xl">Captura concluída</CardTitle>
                <CardDescription className="mt-2">
                  O registro foi processado e já está pronto para acompanhamento no dashboard.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid gap-3 rounded-2xl border bg-background/80 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd className="font-medium">Gravação de Navegação</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">Concluído</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Créditos utilizados</dt>
                  <dd className="font-medium">1</dd>
                </div>
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
                Um e-mail de confirmação foi enviado para {currentUser.email}
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
              <Timeline items={chainOfCustody} compact />
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
