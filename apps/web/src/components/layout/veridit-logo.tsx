import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function VeriditLogo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-lg text-xl font-bold tracking-normal text-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <ShieldCheck className="text-primary" aria-hidden="true" />
      <span>Veridit</span>
    </Link>
  );
}

