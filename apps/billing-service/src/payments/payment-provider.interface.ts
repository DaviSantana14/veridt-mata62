import type { CreateCreditPurchaseRequest } from '@veridit/contracts';

export type CreateCheckoutPreferenceInput = CreateCreditPurchaseRequest & {
  purchaseId: string;
  amountInCents: number;
  credits: number;
};

export type CreateCheckoutPreferenceResult = {
  providerPreferenceId: string;
  checkoutUrl: string;
};

export type ProviderPayment = {
  providerPaymentId: string;
  status: string;
  externalReference?: string;
  approvedAt?: Date;
};

export interface PaymentProvider {
  createCheckoutPreference(
    input: CreateCheckoutPreferenceInput,
  ): Promise<CreateCheckoutPreferenceResult>;

  getPayment(paymentId: string): Promise<ProviderPayment>;
}
