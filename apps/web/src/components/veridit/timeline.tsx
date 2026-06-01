import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimelineItem = {
  title: string;
  description: string;
  time?: string;
  icon?: LucideIcon;
};

export function Timeline({
  items,
  compact = false,
}: {
  items: readonly TimelineItem[];
  compact?: boolean;
}) {
  return (
    <div className="grid gap-0">
      {items.map((item, index) => {
        const Icon = item.icon ?? CheckCircle2;
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.title}-${index}`} className="grid grid-cols-[36px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-9 items-center justify-center rounded-full border bg-card text-primary shadow-sm">
                <Icon aria-hidden="true" />
              </span>
              {!isLast ? <span className="h-full w-px bg-border" aria-hidden="true" /> : null}
            </div>
            <div className={cn("pb-5", compact && "pb-3")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.time ? (
                  <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
