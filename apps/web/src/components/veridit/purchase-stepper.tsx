"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StepperStep = {
  label: string;
  description?: string;
};

type StepperProps = {
  steps: StepperStep[];
  activeStep: number;
  className?: string;
};

export function PurchaseStepper({ steps, activeStep, className }: StepperProps) {
  return (
    <nav
      aria-label="Progresso da compra"
      className={cn(
        "px-6 py-4 rounded-2xl bg-background/50 backdrop-blur-xl border shadow-sm",
        className,
      )}
    >
      <ol className="flex items-center m-0 p-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isCompleted = stepNumber < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center min-w-0",
                !isLast ? "flex-1" : "",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full border-2 text-[13px] font-semibold flex-shrink-0 transition-all duration-300",
                    isActive
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_rgba(31,95,191,0.15)]"
                      : isCompleted
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-background border-border text-muted-foreground",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="leading-none">{stepNumber}</span>
                  )}
                </span>
                
                <div className="hidden sm:flex flex-col min-w-0">
                  <span
                    className={cn(
                      "text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300",
                      isActive
                        ? "text-primary"
                        : isCompleted
                          ? "text-green-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-[11px] text-muted-foreground/70 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <span
                  className={cn(
                    "flex-1 h-0.5 mx-4 lg:mx-6 min-w-[1.5rem] rounded-full transition-colors duration-300",
                    isCompleted ? "bg-green-600" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const purchaseSteps: StepperStep[] = [
  { label: "Escolher plano", description: "Selecione o pacote ideal" },
  { label: "Realizar compra", description: "Pagamento seguro" },
  { label: "Confirmação", description: "Créditos liberados" },
];
