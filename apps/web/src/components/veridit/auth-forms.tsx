"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveAuthSession } from "@/lib/auth-session";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "@/lib/gateway";

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
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
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
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [savedEmail, setSavedEmail] = useState("");

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));

    try {
      const result = await requestPasswordReset({ email });

      if (!result.ok) {
        toast.error(result.message || "Erro ao solicitar código.");
        return;
      }

      setSavedEmail(email);
      setStep(2);
      toast.success("Se o e-mail estiver cadastrado, o código foi enviado.");
    } catch {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setPending(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);
    const code = String(form.get("code"));
    const newPassword = String(form.get("newPassword"));

    try {
      const result = await resetPassword({
        email: savedEmail,
        code,
        newPassword,
      });

      if (!result.ok) {
        toast.error(result.message || "Erro ao redefinir a senha.");
        return;
      }

      toast.success("Senha redefinida com sucesso! Faça login.");
      router.push("/login");
    } catch {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="premium-card w-full rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">
          {step === 1 ? "Recuperar Senha" : "Redefinir Senha"}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? "Informe seu e-mail para receber as instruções."
            : `Digite o código enviado para ${savedEmail} e sua nova senha.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recover-email">E-mail</FieldLabel>
                <Input id="recover-email" name="email" type="email" required />
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
        ) : (
          <form onSubmit={handleResetPassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code">Código de Verificação</FieldLabel>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  maxLength={6}
                  placeholder="Ex: 123456"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">Nova Senha</FieldLabel>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                />
              </Field>

              <Button type="submit" disabled={pending} className="w-full">
                <SubmitIcon pending={pending} />
                Confirmar Nova Senha
              </Button>

              <FieldDescription className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-medium text-primary hover:underline"
                >
                  Voltar e tentar outro e-mail
                </button>
              </FieldDescription>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
