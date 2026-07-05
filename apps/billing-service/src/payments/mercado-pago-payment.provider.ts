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
  const value = process.env[name]?.trim();

  return value || fallback;
}

function getMercadoPagoEnvironment(): 'sandbox' | 'production' {
  return process.env.MERCADO_PAGO_ENVIRONMENT === 'production'
    ? 'production'
    : 'sandbox';
}

function selectCheckoutUrl(response: {
  init_point?: string;
  sandbox_init_point?: string;
}): string | undefined {
  return getMercadoPagoEnvironment() === 'production'
    ? response.init_point
    : response.sandbox_init_point;
}

function shouldAutoReturn(successUrl: string): boolean {
  try {
    const url = new URL(successUrl);
    return !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  private clients?: MercadoPagoClients;

  async createCheckoutPreference(
    input: CreateCheckoutPreferenceInput,
  ): Promise<CreateCheckoutPreferenceResult> {
    const { preference } = this.getClients();
    const amount = input.amountInCents / 100;
    const backUrls = {
      success: optionalUrl(
        'FRONTEND_SUCCESS_URL',
        'http://localhost:3000/pagamento/retorno?status=success',
      ),
      failure: optionalUrl(
        'FRONTEND_FAILURE_URL',
        'http://localhost:3000/pagamento/retorno?status=failure',
      ),
      pending: optionalUrl(
        'FRONTEND_PENDING_URL',
        'http://localhost:3000/pagamento/retorno?status=pending',
      ),
    };

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
        back_urls: backUrls,
        auto_return: shouldAutoReturn(backUrls.success)
          ? 'approved'
          : undefined,
        external_reference: input.purchaseId,
        notification_url: requireEnv('MERCADO_PAGO_WEBHOOK_URL'),
        metadata: {
          purchaseId: input.purchaseId,
          userId: input.userId,
          credits: input.credits,
        },
      },
      requestOptions: {
        idempotencyKey: input.idempotencyKey,
      },
    });

    const providerPreferenceId = response.id;
    const checkoutUrl = selectCheckoutUrl(response);

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

  async findCheckoutPreferenceByPurchaseId(
    purchaseId: string,
  ): Promise<CreateCheckoutPreferenceResult | null> {
    const { preference } = this.getClients();
    const search = await preference.search({
      options: {
        external_reference: purchaseId,
        limit: 1,
      },
    });
    const preferenceId = search.elements?.[0]?.id;

    if (!preferenceId) {
      return null;
    }

    const response = await preference.get({ preferenceId });
    const checkoutUrl = selectCheckoutUrl(response);

    if (!response.id || !checkoutUrl) {
      return null;
    }

    return {
      providerPreferenceId: response.id,
      checkoutUrl,
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
