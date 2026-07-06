import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NormalizedStatus = "completed" | "progress" | "failed";

export type StatusPillStatus =
  | NormalizedStatus
  | "COMPLETED"
  | "STARTED"
  | "FAILED";

const statusCopy: Record<
  NormalizedStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    className: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  },
  progress: {
    label: "Em Andamento",
    icon: Clock3,
    className: "bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  },
  failed: {
    label: "Falha",
    icon: AlertTriangle,
    className: "bg-[color:var(--danger-soft)] text-destructive",
  },
};

function normalizeStatus(status: StatusPillStatus): NormalizedStatus {
  if (status === "COMPLETED") {
    return "completed";
  }

  if (status === "STARTED") {
    return "progress";
  }

  if (status === "FAILED") {
    return "failed";
  }

  return status;
}

export function StatusPill({ status }: { status: StatusPillStatus }) {
  const item = statusCopy[normalizeStatus(status)];
  const Icon = item.icon;

  return (
    <Badge
      className={cn(
        "min-h-7 gap-1.5 rounded-full border-transparent px-2.5 font-medium",
        item.className,
      )}
    >
      <Icon aria-hidden="true" />
      {item.label}
    </Badge>
  );
}
