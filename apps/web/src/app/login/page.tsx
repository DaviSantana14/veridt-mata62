import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/veridit/auth-forms";

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Acesse sua conta para continuar">
      <LoginForm />
    </AuthShell>
  );
}
