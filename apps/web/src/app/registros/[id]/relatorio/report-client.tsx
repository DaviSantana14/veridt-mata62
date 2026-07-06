"use client";

import { useRef } from "react";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDocument } from "@/components/veridit/report-document";
import type { RecordReportView } from "@/lib/record-report-view";

interface ReportClientProps {
  report: RecordReportView;
}

export default function ReportClient({
  report,
}: ReportClientProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePDF = async () => {
    const element = reportRef.current;

    if (!element) return;

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            ${styles}
          </style>
        </head>

        <body>
          ${element.outerHTML}
        </body>
      </html>
    `;

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          fileName: `relatorio-${report.id}.pdf`,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar PDF");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = `relatorio-${report.id}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => window.print()}
        >
          <Printer className="mr-2" />
          Imprimir
        </Button>

        <Button onClick={handlePDF}>
          <Download className="mr-2" />
          PDF
        </Button>
      </div>

      <div ref={reportRef}>
        <ReportDocument report={report} />
      </div>
    </>
  );
}
