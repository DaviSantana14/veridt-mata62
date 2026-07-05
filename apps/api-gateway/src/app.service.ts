import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import {
  SERVICE_PORTS,
  type AuthResponse,
  type ChangePasswordRequest,
  type ContentRecordResponse,
  type CreateCreditPurchaseRequest,
  type CreateCreditPurchaseResponse,
  type CreditPackageResponse,
  type HealthResponse,
  type LoginUserRequest,
  type PurchaseCreditsRequest,
  type RegisterUserRequest,
  type ServiceName,
  type StartCaptureRequest,
  type UpdateUserProfileRequest,
  type UserResponse,
} from '@veridit/contracts';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface GatewayHealthResponse extends HealthResponse {
  downstream: Record<string, string>;
}

@Injectable()
export class AppService {
  login(body: LoginDto): Promise<{ mensagem: string; accessToken: string }> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/login',
      body,
    );
  }

  private readonly urls = {
    identity:
      process.env.IDENTITY_SERVICE_URL ??
      `http://127.0.0.1:${SERVICE_PORTS.identity}`,
    billing:
      process.env.BILLING_SERVICE_URL ??
      `http://127.0.0.1:${SERVICE_PORTS.billing}`,
    capture:
      process.env.CAPTURE_SERVICE_URL ??
      `http://127.0.0.1:${SERVICE_PORTS.capture}`,
    notification:
      process.env.NOTIFICATION_SERVICE_URL ??
      `http://127.0.0.1:${SERVICE_PORTS.notification}`,
    report:
      process.env.REPORT_SERVICE_URL ??
      `http://127.0.0.1:${SERVICE_PORTS.report}`,
  };

  getHealth(): GatewayHealthResponse {
    return {
      service: 'api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
      downstream: this.urls,
    };
  }

  getIdentityHealth(): Promise<HealthResponse> {
    return this.getFromService(
      'identity-service',
      this.urls.identity,
      '/health',
    );
  }

  createUser(body: RegisterUserRequest): Promise<UserResponse> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/users',
      body,
    );
  }

  getUser(id: string): Promise<UserResponse> {
    return this.getFromService(
      'identity-service',
      this.urls.identity,
      `/users/${id}`,
    );
  }

  updateUser(
    id: string,
    body: UpdateUserProfileRequest,
  ): Promise<UserResponse> {
    return this.patchToService(
      'identity-service',
      this.urls.identity,
      `/users/${id}`,
      body,
    );
  }

  changePassword(
    id: string,
    body: ChangePasswordRequest,
  ): Promise<{ message: string }> {
    return this.patchToService(
      'identity-service',
      this.urls.identity,
      `/users/${id}/password`,
      body,
    );
  }

  loginUser(body: LoginUserRequest): Promise<AuthResponse> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/auth/login',
      body,
    );
  }

  // --- MÉTODOS DE RECUPERAÇÃO DE SENHA ---
  forgotPassword(body: ForgotPasswordDto): Promise<{ message: string }> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/auth/forgot-password', // Repassa para a rota exata do identity
      body,
    );
  }

  resetPassword(body: ResetPasswordDto): Promise<{ message: string }> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/auth/reset-password', // Repassa para a rota exata do identity
      body,
    );
  }

  getBillingHealth(): Promise<HealthResponse> {
    return this.getFromService('billing-service', this.urls.billing, '/health');
  }

  getCreditPackages(): Promise<CreditPackageResponse[]> {
    return this.getFromService(
      'billing-service',
      this.urls.billing,
      '/packages',
    );
  }

  createMockPurchase(
    body: PurchaseCreditsRequest,
  ): Promise<PurchaseCreditsRequest & { purchaseId: string; status: string }> {
    return this.postToService(
      'billing-service',
      this.urls.billing,
      '/purchases/mock',
      body,
    );
  }

  createCreditPurchase(
    body: CreateCreditPurchaseRequest,
    idempotencyKey: string,
  ): Promise<CreateCreditPurchaseResponse> {
    return this.postToService(
      'billing-service',
      this.urls.billing,
      '/purchases',
      body,
      {
        'idempotency-key': idempotencyKey,
      },
      {
        preserveClientErrors: true,
      },
    );
  }

  handleMercadoPagoWebhook(
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, unknown>,
  ): Promise<{ received: boolean; processed: boolean; status?: string }> {
    return this.postToService(
      'billing-service',
      this.urls.billing,
      '/payments/mercado-pago/webhook',
      this.normalizeMercadoPagoWebhookPayload(body, query),
      this.filterMercadoPagoWebhookHeaders(headers),
      {
        preserveClientErrors: true,
      },
    );
  }

  getCaptureHealth(): Promise<HealthResponse> {
    return this.getFromService('capture-service', this.urls.capture, '/health');
  }

  createMockCapture(body: StartCaptureRequest): Promise<ContentRecordResponse> {
    return this.postToService(
      'capture-service',
      this.urls.capture,
      '/records/mock',
      body,
    );
  }

  private getFromService<T>(
    service: ServiceName,
    baseUrl: string,
    path: string,
  ): Promise<T> {
    return this.request<T>(service, `${baseUrl}${path}`);
  }

  private postToService<T>(
    service: ServiceName,
    baseUrl: string,
    path: string,
    body: object,
    headers: Record<string, string> = {},
    options: { preserveClientErrors?: boolean } = {},
  ): Promise<T> {
    return this.request<T>(
      service,
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      },
      options,
    );
  }

  private patchToService<T>(
    service: ServiceName,
    baseUrl: string,
    path: string,
    body: object,
  ): Promise<T> {
    return this.request<T>(service, `${baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(
    service: ServiceName,
    url: string,
    init?: RequestInit,
    options: { preserveClientErrors?: boolean } = {},
  ): Promise<T> {
    try {
      const response = await fetch(url, init);
      const payload: unknown = await response.json();

      if (!response.ok) {
        if (
          options.preserveClientErrors &&
          response.status >= 400 &&
          response.status < 500
        ) {
          throw new HttpException(
            this.toHttpExceptionResponse(payload),
            response.status,
          );
        }

        throw new HttpException(
          {
            service,
            statusCode: response.status,
            payload,
          },
          response.status,
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException({
        service,
        message,
      });
    }
  }

  private toHttpExceptionResponse(
    payload: unknown,
  ): string | Record<string, unknown> {
    if (typeof payload === 'string') {
      return payload;
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload)
    ) {
      return payload as Record<string, unknown>;
    }

    return { payload };
  }

  private filterMercadoPagoWebhookHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string> {
    const forwardedHeaders: Record<string, string> = {};

    for (const name of ['x-signature', 'x-request-id']) {
      const value = headers[name];

      if (typeof value === 'string' && value.trim()) {
        forwardedHeaders[name] = value;
      }
    }

    return forwardedHeaders;
  }

  private normalizeMercadoPagoWebhookPayload(
    body: Record<string, unknown>,
    query: Record<string, unknown>,
  ): Record<string, unknown> {
    const data = body.data ?? query.data ?? this.toDataObject(query['data.id']);

    return {
      ...query,
      ...body,
      ...(data ? { data } : {}),
    };
  }

  private toDataObject(dataId: unknown): { id: unknown } | undefined {
    return dataId ? { id: dataId } : undefined;
  }
}
