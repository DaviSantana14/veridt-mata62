import { AuthShell } from "@/components/layout/auth-shell";
import { RecoverPasswordForm } from "@/components/veridit/auth-forms";

export default function RecoverPasswordPage() {
  return (
    <AuthShell eyebrow="Recupere o acesso à sua conta Veridit">
      <RecoverPasswordForm />
    </AuthShell>
  );
}
