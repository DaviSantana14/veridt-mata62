import type { ReactNode } from "react";
import { SectionHeader } from "@/components/veridit/section-header";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <SectionHeader title={title} description={description} action={action} />
  );
}
