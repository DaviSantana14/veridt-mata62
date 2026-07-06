import { AppShell } from "@/components/layout/app-shell";
import { CaptureClient } from "@/components/veridit/capture-client";
import { PageHeading } from "@/components/veridit/page-heading";

export default function CapturePage() {
  return (
    <AppShell active="capture">
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Nova captura"
          description="Informe o link para abrir uma sessão navegável de registro."
        />
        <CaptureClient />
      </div>
    </AppShell>
  );
}
