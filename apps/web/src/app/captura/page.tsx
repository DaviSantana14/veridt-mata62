import { AppShell } from "@/components/layout/app-shell";
import { CaptureClient } from "@/components/veridit/capture-client";
import { PageHeading } from "@/components/veridit/page-heading";

export default function CapturePage() {
  return (
    <AppShell active="capture">
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Registrar nova evidência digital"
          description="Configure captura, perfil técnico e pré-visualização antes de consumir crédito."
        />
        <CaptureClient />
      </div>
    </AppShell>
  );
}
