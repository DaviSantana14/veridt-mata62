import Link from "next/link";
import {
  CreditCard,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/components/veridit/section-header";
import { currentUser } from "@/lib/mock-data";

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof UserRound;
}) {
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        {Icon ? <Icon className="text-muted-foreground" aria-hidden="true" /> : null}
        {label}
      </p>
      <div className="min-h-10 rounded-xl border bg-background/80 px-3 py-2 text-sm">
        {value}
      </div>
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  checked = true,
}: {
  title: string;
  description: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background/70 p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={checked} aria-label={title} />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppShell active="profile">
      <div className="grid gap-8">
        <SectionHeader
          eyebrow="Perfil"
          title="Conta, segurança e preferências de evidência."
          description="Organize dados cadastrais e controles básicos da conta demonstrativa."
        />

        <Alert className="border-[color:var(--evidence)]/20 bg-teal-50">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Conta ativa para operação demonstrativa</AlertTitle>
          <AlertDescription>
            Dados pessoais são mockados localmente; nenhum fluxo real de autenticação foi adicionado nesta etapa.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card className="premium-card h-fit rounded-2xl">
            <CardContent className="grid gap-6 pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-20 border-4 border-primary/15">
                  <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">{currentUser.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Badge className="w-fit rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
                  <ShieldCheck aria-hidden="true" />
                  Conta Ativa
                </Badge>
                <Badge variant="secondary" className="w-fit rounded-full">
                  <CreditCard aria-hidden="true" />
                  {currentUser.credits} créditos disponíveis
                </Badge>
              </div>
              <Button variant="outline">
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Editar dados
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle>Dados pessoais</CardTitle>
                <CardDescription>Informações cadastrais do usuário.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Nome Completo" value={currentUser.name} icon={UserRound} />
                <ReadOnlyField label="CPF" value={currentUser.cpf} />
                <ReadOnlyField label="E-mail" value={currentUser.email} icon={Mail} />
                <ReadOnlyField label="Telefone" value={currentUser.phone} icon={Phone} />
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Controles de acesso da conta.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-background/70 p-4">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      <KeyRound className="text-primary" aria-hidden="true" />
                      Alterar senha
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Última alteração: {currentUser.lastPasswordChange}
                    </p>
                  </div>
                  <Button variant="outline">Alterar</Button>
                </div>
                <PreferenceRow
                  title="Autenticação de dois fatores"
                  description="Camada extra preparada para quando o backend de auth estiver disponível."
                  checked={false}
                />
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl">
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>Configurações operacionais da área Veridit.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <PreferenceRow
                  title="Avisar quando relatório estiver pronto"
                  description="Receba feedback visual e e-mail demonstrativo após a captura."
                />
                <PreferenceRow
                  title="Usar modo detalhado de relatório"
                  description="Inclui cadeia de custódia e metadados técnicos por padrão."
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Separator />
          <Button asChild variant="destructive" className="w-fit">
            <Link href="/login">
              <LogOut data-icon="inline-start" aria-hidden="true" />
              Sair do Sistema
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
