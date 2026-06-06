import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const toneClass = {
  primary: "bg-primary/10 text-primary",
  success: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  warning: "bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  evidence: "bg-teal-50 text-[color:var(--evidence)]",
};

export function MetricPanel({
  label,
  value,
  description,
  icon: Icon,
  progress,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  progress?: number;
  tone?: keyof typeof toneClass;
}) {
  return (
    <Card className="premium-card interactive-lift min-h-[148px] rounded-2xl">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <CardAction>
          <span className={cn("flex size-10 items-center justify-center rounded-xl", toneClass[tone])}>
            <Icon aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold leading-none">{value}</p>
        {typeof progress === "number" ? (
          <Progress value={progress} className="mt-5 h-2" aria-label={`${label}: ${progress}%`} />
        ) : null}
      </CardContent>
    </Card>
  );
}
