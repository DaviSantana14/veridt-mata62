"use client";

import { cn } from "@/lib/utils";

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
      className={cn("purchase-stepper", className)}
    >
      <ol className="purchase-stepper-list">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isCompleted = stepNumber < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.label}
              className={cn(
                "purchase-stepper-item",
                isActive && "purchase-stepper-item--active",
                isCompleted && "purchase-stepper-item--completed",
              )}
            >
              <div className="purchase-stepper-indicator">
                <span
                  className={cn(
                    "purchase-stepper-circle",
                    isActive && "purchase-stepper-circle--active",
                    isCompleted && "purchase-stepper-circle--completed",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M11.5 3.5L5.5 10.5L2.5 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="purchase-stepper-number">{stepNumber}</span>
                  )}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "purchase-stepper-connector",
                      isCompleted && "purchase-stepper-connector--completed",
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="purchase-stepper-label-group">
                <span
                  className={cn(
                    "purchase-stepper-label",
                    isActive && "purchase-stepper-label--active",
                    isCompleted && "purchase-stepper-label--completed",
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="purchase-stepper-description">
                    {step.description}
                  </span>
                )}
              </div>
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
