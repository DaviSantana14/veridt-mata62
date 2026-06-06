"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveAuthSession } from "@/lib/auth-session";
import { loginUser, registerUser } from "@/lib/gateway";

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

function SubmitIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <Loader2
      data-icon="inline-start"
      className="animate-spin"
      aria-hidden="true"
    />
  ) : null;
}

function AuthNotice() {
  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ShieldCheck aria-hidden="true" />
      <AlertTitle>Acesso demonstrativo</AlertTitle>
      <AlertDescription>
        Autenticação e recuperação seguem integradas ao gateway.
      </AlertDescription>
    </Alert>
  );

}

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const result = await loginUser({ email, password });

      if (!result.ok) {
        toast.error(result.message || "Erro ao entrar");
        return;
      }

      saveAuthSession(result.data);
      toast.success("Login realizado com sucesso.");
      router.push("/dashboard");
    } catch {
      toast.error("Erro de conexão com servidor");
    } finally {
      setPending(false);
    }
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
                autoComplete="email"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" disabled={pending} className="w-full">
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
  const [profile, setProfile] = useState<"COMMON_USER" | "LAWYER">(
    "COMMON_USER",
  );
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);

    const firstName = String(form.get("firstName"));
    const lastName = String(form.get("lastName"));
    const cpf = String(form.get("cpf")).replace(/\D/g, "");
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const oabNumber = String(form.get("oab") ?? "");

    const result = await registerUser({
      fullName: `${firstName} ${lastName}`.trim(),
      cpf,
      email,
      password,
      profile,
      ...(profile === "LAWYER" ? { oabNumber } : {}),
    });

    setPending(false);

    if (!result.ok) {
      toast.error(result.message || "Erro ao criar conta");
      return;
    }

    toast.success("Conta criada com sucesso. Faça login para continuar.");
    router.push("/login");
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Criar Conta</CardTitle>
        <CardDescription>
          Informe seus dados para acessar a plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={profile === "COMMON_USER" ? "default" : "outline"}
            onClick={() => setProfile("COMMON_USER")}
          >
            Usuário
          </Button>

          <Button
            type="button"
            variant={profile === "LAWYER" ? "default" : "outline"}
            onClick={() => setProfile("LAWYER")}
          >
            Advogado
          </Button>
        </div>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Nome</FieldLabel>
                <Input id="firstName" name="firstName" required />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
                <Input id="lastName" name="lastName" required />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="cpf">CPF</FieldLabel>
              <Input id="cpf" name="cpf" required />
            </Field>

            {profile === "LAWYER" && (
              <Field>
                <FieldLabel htmlFor="oab">Número da OAB</FieldLabel>
                <Input
                  id="oab"
                  name="oab"
                  placeholder="Ex: BA12345"
                  maxLength={12}
                  required={profile === "LAWYER"}
                />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input id="email" name="email" type="email" required />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input id="password" name="password" type="password" required />
            </Field>

            <Button type="submit" disabled={pending} className="w-full">
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
      toast.success("Instruções enviadas para seu e-mail.");
    }, 350);
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
        <CardDescription>
          Informe seu e-mail para recuperação.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recover-email">E-mail</FieldLabel>
              <Input
                id="recover-email"
                name="email"
                type="email"
                required
              />
            </Field>

            <Button type="submit" disabled={pending} className="w-full">
              <SubmitIcon pending={pending} />
              Enviar Instruções
              {!pending ? (
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              ) : null}
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
