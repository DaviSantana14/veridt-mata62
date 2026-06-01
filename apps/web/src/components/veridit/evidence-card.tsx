import Link from "next/link";
import { Camera, FileText, Video } from "lucide-react";

import { StatusPill } from "@/components/veridit/status-pill";
import type { VeriditRecord } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function EvidenceCard({ record }: { record: VeriditRecord }) {
  const Icon = record.kind === "video" ? Video : Camera;

  return (
    <Link
      href={`/registros/${record.id}`}
      className="premium-card interactive-lift grid gap-4 rounded-2xl p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            record.kind === "video" ? "bg-primary/10 text-primary" : "bg-teal-50 text-[color:var(--evidence)]",
          )}
        >
          <Icon aria-hidden="true" />
        </span>
        <StatusPill status={record.status} />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold">{record.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{record.url}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{record.createdAt}</span>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 font-medium text-primary">
          <FileText aria-hidden="true" />
          Abrir
        </span>
      </div>
    </Link>
  );
}
