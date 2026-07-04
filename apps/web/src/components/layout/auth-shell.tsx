import type { ReactNode } from "react";
import { BadgeCheck, FileText, Fingerprint, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VeriditLogo } from "@/components/layout/veridit-logo";

const proofItems = [
  {
    label: "Hash de integridade",
    value: "Gerado automaticamente",
    icon: Fingerprint,
  },
  {
    label: "Relatório técnico",
    value: "Pronto para anexar",
    icon: FileText,
  },
  {
    label: "Cadeia de custódia",
    value: "Eventos rastreáveis",
    icon: BadgeCheck,
  },
] as const;

export function AuthShell({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh bg-background px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)] lg:p-6">
      <section className="relative hidden overflow-hidden rounded-[28px] border bg-[#071526] p-8 text-white shadow-[0_20px_80px_rgb(7_21_38/0.18)] lg:flex lg:flex-col">
        <div className="absolute inset-0 surface-grid opacity-25" aria-hidden="true" />
        <div className="relative z-10">
          <VeriditLogo className="text-white [&_svg]:text-[#8bb7ff]" />
          <Badge className="mt-8 rounded-full border-white/15 bg-white/10 text-white">
            <ShieldCheck aria-hidden="true" />
            Registro digital premium
          </Badge>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[1.05]">
            Evidências digitais com leitura jurídica desde o primeiro registro.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/[0.72]">
            O Veridit organiza captura, metadados, hash e relatório em um fluxo claro para equipes jurídicas e periciais.
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          <Separator className="mb-5 bg-white/15" />
          <div className="grid gap-3">
            {proofItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.08] p-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#8bb7ff]">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-white/[0.62]">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex min-w-0 items-center justify-center py-6 lg:px-8">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex flex-col gap-3 text-center lg:hidden">
            <VeriditLogo className="mx-auto" />
            <p className="text-sm leading-6 text-muted-foreground">{eyebrow}</p>
          </div>
          <div className="hidden pb-6 lg:block">
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
