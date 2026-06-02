import { Badge } from "@/components/ui/badge";
import { statusCopy, type RecordStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: RecordStatus }) {
  const item = statusCopy[status];
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
