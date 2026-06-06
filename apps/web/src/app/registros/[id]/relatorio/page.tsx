import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ReportDocument } from "@/components/veridit/report-document";
import { SectionHeader } from "@/components/veridit/section-header";
import { getRecordById } from "@/lib/mock-data";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getRecordById(id);

  return (
    <AppShell active="dashboard">
      <div className="mx-auto grid max-w-5xl gap-6">
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href={`/registros/${record.id}`}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <SectionHeader
            eyebrow="Relatório"
            title="Relatório do registro digital"
            description={`${record.id} - ${record.title}`}
            action={
              <>
                <Button variant="outline">
                  <Printer data-icon="inline-start" aria-hidden="true" />
                  Imprimir
                </Button>
                <Button>
                  <Download data-icon="inline-start" aria-hidden="true" />
                  PDF
                </Button>
              </>
            }
          />
        </div>

        <ReportDocument record={record} />
      </div>
    </AppShell>
  );
}
