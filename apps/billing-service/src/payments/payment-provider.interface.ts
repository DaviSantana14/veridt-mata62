import type {
  CardPaymentPayerIdentification,
  CreateCardPaymentRequest,
  CreateCreditPurchaseRequest,
} from '@veridit/contracts';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type CreateCheckoutPreferenceInput = CreateCreditPurchaseRequest & {
  purchaseId: string;
  idempotencyKey: string;
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
  pix?: {
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
  };
};

export type CreateCardPaymentInput = CreateCardPaymentRequest & {
  purchaseId: string;
  userId: string;
  packageName: CreateCreditPurchaseRequest['packageName'];
  amountInCents: number;
  credits: number;
  payerEmail: string;
  payer: {
    email: string;
    identification?: CardPaymentPayerIdentification;
  };
  idempotencyKey: string;
};

export interface PaymentProvider {
  createCheckoutPreference(
    input: CreateCheckoutPreferenceInput,
  ): Promise<CreateCheckoutPreferenceResult>;

  findCheckoutPreferenceByPurchaseId(
    purchaseId: string,
  ): Promise<CreateCheckoutPreferenceResult | null>;

  createCardPayment(input: CreateCardPaymentInput): Promise<ProviderPayment>;

  getPayment(paymentId: string): Promise<ProviderPayment>;
}
