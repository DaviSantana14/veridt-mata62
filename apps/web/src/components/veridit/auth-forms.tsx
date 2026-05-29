"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/lib/gateway";

function SubmitIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
  ) : null;
}

function AuthNotice() {
  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ShieldCheck aria-hidden="true" />
      <AlertTitle>Acesso demonstrativo</AlertTitle>
      <AlertDescription>
        Login e recuperação seguem simulados enquanto os serviços de autenticação ficam fora deste escopo.
      </AlertDescription>
    </Alert>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      toast.success("Acesso simulado com sucesso.");
      router.push("/dashboard");
    }, 350);
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Entrar</CardTitle>
        <CardDescription>
          Acesse seu cofre de evidências e acompanhe registros digitais.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <AuthNotice />
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue="ana.silva@email.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue="senha123"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" disabled={pending} className="w-full shadow-[0_12px_28px_rgb(31_95_191/0.18)]">
              <SubmitIcon pending={pending} />
              Entrar
            </Button>
            <FieldDescription className="text-center">
              Não tem uma conta?{" "}
              <Link className="font-medium text-primary" href="/cadastro">
                Cadastre-se
              </Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await registerUser({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      cpf: String(form.get("cpf") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setPending(false);

    if (result.ok) {
      toast.success("Conta criada com sucesso.");
      router.push("/dashboard");
      return;
    }

    toast.warning("Cadastro simulado. API Gateway indisponível.", {
      description: result.message,
    });
    router.push("/dashboard");
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Criar Conta</CardTitle>
        <CardDescription>
          Informe seus dados para acessar a área demonstrativa do Veridit.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Alert className="border-[color:var(--evidence)]/20 bg-teal-50">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Cadastro com fallback</AlertTitle>
          <AlertDescription>
            A tela tenta o gateway em <span className="font-mono">/identity/users</span> e segue com simulação se a API estiver indisponível.
          </AlertDescription>
        </Alert>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Nome</FieldLabel>
                <Input id="firstName" name="firstName" defaultValue="Ana Carolina" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
                <Input id="lastName" name="lastName" defaultValue="Silva" required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                <Input id="cpf" name="cpf" defaultValue="123.456.789-00" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue="(11) 98765-4321"
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="register-email">E-mail</FieldLabel>
              <Input
                id="register-email"
                name="email"
                type="email"
                defaultValue="ana.silva@email.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-password">Senha</FieldLabel>
              <Input
                id="register-password"
                name="password"
                type="password"
                defaultValue="senha123"
                autoComplete="new-password"
                required
              />
            </Field>
            <Button type="submit" disabled={pending} className="w-full shadow-[0_12px_28px_rgb(31_95_191/0.18)]">
              <SubmitIcon pending={pending} />
              Cadastrar
            </Button>
            <FieldDescription className="text-center">
              Já tem uma conta?{" "}
              <Link className="font-medium text-primary" href="/login">
                Entrar
              </Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function RecoverPasswordForm() {
  const [pending, setPending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      toast.success("Instruções enviadas para ana.silva@email.com.");
    }, 350);
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
        <CardDescription>
          Informe seu e-mail para receber as instruções de recuperação.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <AuthNotice />
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recover-email">E-mail</FieldLabel>
              <Input
                id="recover-email"
                name="email"
                type="email"
                defaultValue="ana.silva@email.com"
                autoComplete="email"
                required
              />
            </Field>
            <Button type="submit" disabled={pending} className="w-full">
              <SubmitIcon pending={pending} />
              Enviar Instruções
              {!pending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Button>
            <FieldDescription className="text-center">
              <Link className="font-medium text-primary" href="/login">
                Voltar para o login
              </Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
