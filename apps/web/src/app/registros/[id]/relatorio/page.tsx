import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/veridit/section-header";
import { getCaptureDetailHref } from "@/lib/capture-record-formatters";
import {
  getCaptureRecord,
  getUserProfile,
  listCaptureAssets,
} from "@/lib/gateway";
import { toRecordReportView } from "@/lib/record-report-view";
import ReportClient from "./report-client";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recordResult = await getCaptureRecord(id);

  if (!recordResult.ok) {
    notFound();
  }

  const [responsibleResult, assetsResult] = await Promise.all([
    getUserProfile(recordResult.data.userId),
    listCaptureAssets(id),
  ]);

  if (!assetsResult.ok) {
    throw new Error(assetsResult.message);
  }

  const report = toRecordReportView(
    recordResult.data,
    responsibleResult.ok ? responsibleResult.data : undefined,
    assetsResult.data.assets,
  );

  return (
    <AppShell active="dashboard">
      <div className="mx-auto grid max-w-5xl gap-6">
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" aria-label="Voltar">
            <Link href={getCaptureDetailHref(report.id)}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>

          <SectionHeader
            eyebrow="Relatório"
            title="Relatório do registro digital"
            description={`${report.id} - ${report.title}`}
          />
        </div>

        <ReportClient key={report.id} report={report} />
      </div>
    </AppShell>
  );
}
