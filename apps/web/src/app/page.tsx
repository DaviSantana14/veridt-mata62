import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VeriditLogo } from "@/components/layout/veridit-logo";
import { TrustMark } from "@/components/veridit/trust-mark";
import { landingFeatures, legalProofPillars, trustIndicators } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/[0.82] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 lg:px-8">
          <VeriditLogo />
          <nav className="flex items-center gap-2" aria-label="Acesso">
            <Button asChild variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/cadastro">Criar Conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b bg-card/[0.64]">
        <div className="mx-auto flex min-h-[620px] w-full max-w-[1120px] flex-col items-center justify-center px-4 py-20 text-center lg:px-8">
          <Badge variant="secondary" className="rounded-full">
            <ShieldCheck aria-hidden="true" />
            Evidências digitais verificáveis
          </Badge>
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-normal sm:text-6xl">
            Veridit
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Capture páginas em imagem ou vídeo, preserve metadados e gere relatórios comprobatórios em um fluxo simples.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">
                Começar registro
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Acessar sistema</Link>
            </Button>
          </div>

          <div className="mt-14 grid w-full gap-3 sm:grid-cols-3">
            {["Imagem ou vídeo", "Hash de integridade", "Relatório organizado"].map((item) => (
              <div key={item} className="rounded-2xl border bg-background/80 px-4 py-4 text-sm font-medium shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-12 sm:grid-cols-3 lg:px-8">
        {trustIndicators.map((item) => (
          <TrustMark key={item.label} {...item} />
        ))}
      </section>

      <section className="border-y bg-card/[0.72] py-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="rounded-full">
              Fluxo jurídico
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal">
              Da captura ao documento, sem dispersar evidências.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              A interface prioriza operação rápida, rastreabilidade e leitura clara para anexos, auditorias e conferências.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {legalProofPillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <Card key={pillar.title} className="premium-card interactive-lift rounded-2xl">
                  <CardHeader>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon aria-hidden="true" />
                    </span>
                    <CardTitle>{pillar.title}</CardTitle>
                    <CardDescription>{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {landingFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title} className="premium-card interactive-lift rounded-2xl">
                <CardHeader>
                  <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" />
                  </span>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="premium-card mx-auto mb-16 w-[calc(100%-2rem)] max-w-[1408px] overflow-hidden rounded-[28px] px-6 py-12 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText aria-hidden="true" />
              Relatórios comprobatórios
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold">
              Registre evidências em imagens ou vídeos.
            </h2>
          </div>
          <Button asChild size="lg" className="w-fit">
            <Link href="/cadastro">
              Criar conta demonstrativa
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card/[0.72]">
        <div className="mx-auto flex min-h-[88px] w-full max-w-[1440px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <VeriditLogo className="min-h-0 text-base" />
            <span>Registro digital demonstrativo.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link className="text-muted-foreground hover:text-foreground" href="/login">
              Login
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/cadastro">
              Cadastro
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
