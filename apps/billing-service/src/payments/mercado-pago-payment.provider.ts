import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import type {
  CreateCheckoutPreferenceInput,
  CreateCheckoutPreferenceResult,
  PaymentProvider,
  ProviderPayment,
} from './payment-provider.interface';

type MercadoPagoClients = {
  preference: Preference;
  payment: Payment;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new ServiceUnavailableException(`${name} is required`);
  }

  return value;
}

function optionalUrl(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  private clients?: MercadoPagoClients;

  async createCheckoutPreference(
    input: CreateCheckoutPreferenceInput,
  ): Promise<CreateCheckoutPreferenceResult> {
    const { preference } = this.getClients();
    const amount = input.amountInCents / 100;

    const response = await preference.create({
      body: {
        items: [
          {
            id: input.packageName,
            title: `Pacote ${input.packageName} Veridit`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: input.payerEmail,
        },
        back_urls: {
          success: optionalUrl(
            'FRONTEND_SUCCESS_URL',
            'http://localhost:3000/billing/success',
          ),
          failure: optionalUrl(
            'FRONTEND_FAILURE_URL',
            'http://localhost:3000/billing/failure',
          ),
          pending: optionalUrl(
            'FRONTEND_PENDING_URL',
            'http://localhost:3000/billing/pending',
          ),
        },
        auto_return: 'approved',
        external_reference: input.purchaseId,
        notification_url: requireEnv('MERCADO_PAGO_WEBHOOK_URL'),
        metadata: {
          purchaseId: input.purchaseId,
          userId: input.userId,
          credits: input.credits,
        },
      },
    });

    const providerPreferenceId = response.id;
    const checkoutUrl = response.init_point ?? response.sandbox_init_point;

    if (!providerPreferenceId || !checkoutUrl) {
      throw new ServiceUnavailableException(
        'Mercado Pago did not return a checkout URL',
      );
    }

    return {
      providerPreferenceId,
      checkoutUrl,
    };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const { payment } = this.getClients();
    const response = await payment.get({ id: paymentId });

    return {
      providerPaymentId: String(response.id ?? paymentId),
      status: response.status ?? 'unknown',
      externalReference: response.external_reference,
      approvedAt: parseMercadoPagoDate(response),
    };
  }

  private getClients(): MercadoPagoClients {
    if (!this.clients) {
      const client = new MercadoPagoConfig({
        accessToken: requireEnv('MERCADO_PAGO_ACCESS_TOKEN'),
        options: {
          timeout: 5000,
        },
      });

      this.clients = {
        preference: new Preference(client),
        payment: new Payment(client),
      };
    }

    return this.clients;
  }
}

function parseMercadoPagoDate(response: {
  date_approved?: string;
}): Date | undefined {
  if (!response.date_approved) {
    return undefined;
  }

  const date = new Date(response.date_approved);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
