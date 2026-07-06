import { AppShell } from "@/components/layout/app-shell";
import { CaptureBrowserClient } from "@/components/veridit/capture-browser-client";
import { PageHeading } from "@/components/veridit/page-heading";

export default async function CaptureBrowserPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;

  return (
    <AppShell active="capture">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Registro de conteúdo"
          description="Navegue pelo conteúdo e registre prints ou vídeo a partir dos controles laterais."
        />
        <CaptureBrowserClient recordId={recordId} />
      </div>
    </AppShell>
  );
}
