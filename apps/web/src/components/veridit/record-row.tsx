import Link from "next/link";
import { Camera, MoreHorizontal, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/veridit/status-badge";
import type { VeriditRecord } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function RecordRow({ record }: { record: VeriditRecord }) {
  const Icon = record.kind === "video" ? Video : Camera;

  return (
    <Link
      href={`/registros/${record.id}`}
      className="flex min-h-[74px] items-center justify-between gap-4 rounded-[10px] border bg-card p-4 outline-none transition-colors hover:bg-muted/35 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
            record.kind === "video" ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
          )}
        >
          <Icon aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {record.title}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="max-w-[44vw] truncate sm:max-w-none">{record.url}</span>
            <span aria-hidden="true">•</span>
            <span>{record.createdAt}</span>
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={record.status} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden rounded-lg sm:inline-flex"
          aria-label={`Abrir ações de ${record.title}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </div>
    </Link>
  );
}
