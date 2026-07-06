"use client";

import { useEffect, useState } from "react";
import { Archive, BadgeCheck, ShieldCheck } from "lucide-react";

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
import { Timeline } from "@/components/veridit/timeline";
import {
  chainOfCustody,
  reportValidationItems,
  type VeriditRecord,
} from "@/lib/mock-data";

import { getAuthSession } from "@/lib/auth-session";
import { getUserProfile } from "@/lib/gateway";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border bg-background/70 p-3 sm:grid-cols-[180px_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export function ReportDocument({ record }: { record: VeriditRecord }) {
  const [user, setUser] = useState({
    fullName: "",
    email: "",
    cpf: "",
  });

  useEffect(() => {
    async function loadUser() {
      const session = getAuthSession();

      if (!session) {
        return;
      }

      const result = await getUserProfile(session.user.id);

      if (result.ok) {
        setUser({
          fullName: result.data.fullName,
          email: result.data.email,
          cpf: result.data.cpf,
        });
      }
    }

    void loadUser();
  }, []);

  return (
    <Card className="document-paper overflow-hidden rounded-2xl border bg-card shadow-[0_24px_80px_rgb(15_23_42/0.10)]">
      <CardHeader className="border-b bg-card/95 p-6 text-center sm:p-8">
        <div className="mx-auto">
          <VeriditLogo className="pointer-events-none justify-center" />
        </div>

        <Badge className="mx-auto mt-4 rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
          <BadgeCheck aria-hidden="true" />
          Documento verificável
        </Badge>

        <CardTitle className="mt-4 text-2xl">
          Relatório de Registro Digital
        </CardTitle>

        <CardDescription>
          Veridit - captura, metadados e cadeia de custódia
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-8 p-5 sm:p-8">
        <section>
          <h2 className="text-lg font-semibold">
            Informações do registro
          </h2>

          <dl className="mt-4 grid gap-3">
            <Detail label="ID do Registro" value={record.id} />
            <Detail label="Título" value={record.title} />
            <Detail label="URL" value={record.url} />
            <Detail label="Data de Criação" value={record.createdAt} />
            <Detail
              label="Data de Conclusão"
              value={record.completedAt ?? "Em processamento"}
            />
            <Detail
              label="Tipo"
              value={
                record.kind === "video"
                  ? "Gravação de Navegação"
                  : "Screenshot"
              }
            />
            <Detail
              label="Duração"
              value={record.duration ?? "Instantânea"}
            />
            <Detail
              label="Tamanho"
              value={record.size ?? "Calculando"}
            />
          </dl>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold">Responsável</h2>

          <dl className="mt-4 grid gap-3">
            <Detail
              label="Nome"
              value={user.fullName || "Carregando..."}
            />

            <Detail
              label="E-mail"
              value={user.email || "Carregando..."}
            />

            <Detail
              label="CPF"
              value={user.cpf || "Carregando..."}
            />
          </dl>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold">
            Validação e integridade
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {reportValidationItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border bg-background/70 p-4"
                >
                  <Icon
                    className="text-primary"
                    aria-hidden="true"
                  />

                  <p className="mt-3 text-sm font-semibold">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border bg-[#071526] p-4 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck
                className="text-[#8bb7ff]"
                aria-hidden="true"
              />
              Hash de Integridade
            </p>

            <p className="mt-2 break-all font-mono text-xs leading-6 text-white/70">
              {record.hash}
            </p>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Archive
              className="text-primary"
              aria-hidden="true"
            />
            Cadeia de custódia
          </h2>

          <Timeline items={chainOfCustody} compact />
        </section>
      </CardContent>
    </Card>
  );
}
