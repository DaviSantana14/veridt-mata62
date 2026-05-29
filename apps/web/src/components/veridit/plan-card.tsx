import Link from "next/link";
import { Check, CreditCard, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CreditPlan } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function PlanCard({ plan }: { plan: CreditPlan }) {
  return (
    <Card
      className={cn(
        "interactive-lift relative overflow-hidden rounded-2xl",
        plan.popular ? "border-primary/45 shadow-[0_20px_52px_rgb(31_95_191/0.12)]" : "premium-card",
      )}
    >
      {plan.popular ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
      ) : null}
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard aria-hidden="true" />
          </span>
          {plan.popular ? (
            <Badge className="rounded-full bg-primary text-primary-foreground">
              Mais escolhido
            </Badge>
          ) : null}
        </div>
        <div>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>{plan.records} registros verificáveis</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="text-4xl font-semibold tracking-normal">{plan.price}</p>
          <p className="mt-1 text-sm text-muted-foreground">{plan.pricePerRecord}</p>
        </div>
        <ul className="grid gap-3 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="mt-0.5 text-[color:var(--success)]" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="grid gap-3">
        <Button asChild className="w-full">
          <Link href="/pagamento">
            <CreditCard data-icon="inline-start" aria-hidden="true" />
            Comprar créditos
          </Link>
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" />
          Pagamento com confirmação simulada
        </p>
      </CardFooter>
    </Card>
  );
}
