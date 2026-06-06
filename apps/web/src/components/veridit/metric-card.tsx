import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <Card className="min-h-[108px] rounded-[14px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardAction>
          <Icon className={iconClassName} aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold leading-8">{value}</p>
      </CardContent>
    </Card>
  );
}
