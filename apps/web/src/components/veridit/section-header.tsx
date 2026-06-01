import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <Badge variant="secondary" className="mb-3 rounded-full">
            {eyebrow}
          </Badge>
        ) : null}
        <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
