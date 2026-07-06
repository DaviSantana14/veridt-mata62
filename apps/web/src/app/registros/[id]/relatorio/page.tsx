import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/veridit/section-header";
import { getCaptureDetailHref } from "@/lib/capture-record-formatters";
import { getRecordById } from "@/lib/mock-data";
import ReportClient from "./report-client";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = getRecordById(id);

  if (!record) {
    notFound();
  }

  return (
    <AppShell active="dashboard">
      <div className="mx-auto grid max-w-5xl gap-6">
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href={getCaptureDetailHref(record.id)}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>

          <SectionHeader
            eyebrow="Relatório"
            title="Relatório do registro digital"
            description={`${record.id} - ${record.title}`}
          />
        </div>

        <ReportClient key={record.id} record={record} />
      </div>
    </AppShell>
  );
}
