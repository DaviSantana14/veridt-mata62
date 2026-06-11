"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { getInitials } from "@/components/layout/session-user";
import { SectionHeader } from "@/components/veridit/section-header";
import { getAuthSession, saveAuthSession, type AuthSession } from "@/lib/auth-session";
import {
  changeUserPassword,
  getUserProfile,
  updateUserProfile,
} from "@/lib/gateway";

type ProfileForm = {
  fullName: string;
  email: string;
  cpf: string;
};

const emptyProfile: ProfileForm = {
  fullName: "",
  email: "",
  cpf: "",
};

function SubmitIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <Loader2
      data-icon="inline-start"
      className="animate-spin"
      aria-hidden="true"
    />
  ) : (
    <Save data-icon="inline-start" aria-hidden="true" />
  );
}

function Field({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: ReactNode;
  icon?: typeof UserRound;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        {Icon ? <Icon className="text-muted-foreground" aria-hidden="true" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

export function ProfileClient() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getAuthSession(),
  );
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const storedSession = getAuthSession();

    if (!storedSession) {
      return;
    }

    const activeSession = storedSession;

    async function loadProfile() {
      const result = await getUserProfile(activeSession.user.id);

      if (!active) {
        return;
      }

      if (!result.ok) {
        setProfile({
          fullName: activeSession.user.fullName,
          email: activeSession.user.email,
          cpf: "",
        });
        toast.error(result.message || "Erro ao carregar perfil.");
        setLoading(false);
        return;
      }

      setProfile({
        fullName: result.data.fullName,
        email: result.data.email,
        cpf: result.data.cpf,
      });
      setLoading(false);
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const fullName = profile.fullName.trim();
    const email = profile.email.trim().toLowerCase();

    if (!fullName || !email) {
      toast.error("Nome completo e e-mail são obrigatórios.");
      return;
    }

    setSavingProfile(true);
    const result = await updateUserProfile(session.user.id, {
      fullName,
      email,
    });
    setSavingProfile(false);

    if (!result.ok) {
      toast.error(result.message || "Erro ao salvar perfil.");
      return;
    }

    const nextSession: AuthSession = {
      ...session,
      user: {
        ...session.user,
        fullName: result.data.fullName,
        email: result.data.email,
        profile: result.data.profile,
      },
    };

    setSession(nextSession);
    saveAuthSession(nextSession);
    setProfile({
      fullName: result.data.fullName,
      email: result.data.email,
      cpf: result.data.cpf,
    });
    toast.success("Dados pessoais atualizados.");
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (!session) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setSavingPassword(true);
    const result = await changeUserPassword(session.user.id, {
      currentPassword,
      newPassword,
    });
    setSavingPassword(false);

    if (!result.ok) {
      toast.error(result.message || "Erro ao alterar senha.");
      return;
    }

    formElement.reset();
    toast.success(result.data.message || "Senha alterada com sucesso.");
  }

  const displayName = profile.fullName || session?.user.fullName || "Usuário";
  const displayEmail = profile.email || session?.user.email || "";

  return (
    <div className="grid gap-8">
      <SectionHeader
        eyebrow="Perfil"
        title="Conta e segurança."
        description="Atualize seus dados cadastrais e controle a senha de acesso."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="premium-card h-fit rounded-2xl">
          <CardContent className="grid gap-6 pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 border-4 border-primary/15">
                <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{displayName}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </div>
            <Badge className="w-fit rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
              <ShieldCheck aria-hidden="true" />
              Conta Ativa
            </Badge>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
              <CardDescription>Informações cadastrais do usuário.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleProfileSubmit}>
                <Field label="Nome Completo" icon={UserRound}>
                  <Input
                    name="fullName"
                    value={profile.fullName}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    disabled={loading || savingProfile}
                    required
                  />
                </Field>
                <Field label="CPF">
                  <Input name="cpf" value={profile.cpf} readOnly disabled={loading} />
                </Field>
                <Field label="E-mail" icon={Mail}>
                  <Input
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    disabled={loading || savingProfile}
                    required
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || savingProfile}
                  >
                    <SubmitIcon pending={savingProfile} />
                    Salvar dados
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="premium-card rounded-2xl">
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Altere a senha usada para acessar a conta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-3" onSubmit={handlePasswordSubmit}>
                <Field label="Senha atual" icon={KeyRound}>
                  <Input
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    disabled={savingPassword}
                    required
                  />
                </Field>
                <Field label="Nova senha">
                  <Input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    disabled={savingPassword}
                    required
                  />
                </Field>
                <Field label="Confirmar nova senha">
                  <Input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    disabled={savingPassword}
                    required
                  />
                </Field>
                <div className="sm:col-span-3">
                  <Button type="submit" disabled={savingPassword}>
                    <SubmitIcon pending={savingPassword} />
                    Alterar senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
