import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/components/veridit/auth-forms";

export default function RegisterPage() {
  return (
    <AuthShell eyebrow="Crie sua conta para começar a registrar">
      <RegisterForm />
    </AuthShell>
  );
}
