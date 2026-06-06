import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  SERVICE_PORTS,
  type AuthResponse,
  type ContentRecordResponse,
  type CreditPackageResponse,
  type HealthResponse,
  type LoginUserRequest,
  type PurchaseCreditsRequest,
  type RegisterUserRequest,
  type ServiceName,
  type StartCaptureRequest,
  type UserResponse,
} from '@veridit/contracts';
import { LoginDto } from './dto/login.dto';

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
      `http://localhost:${SERVICE_PORTS.identity}`,
    billing:
      process.env.BILLING_SERVICE_URL ??
      `http://localhost:${SERVICE_PORTS.billing}`,
    capture:
      process.env.CAPTURE_SERVICE_URL ??
      `http://localhost:${SERVICE_PORTS.capture}`,
    notification:
      process.env.NOTIFICATION_SERVICE_URL ??
      `http://localhost:${SERVICE_PORTS.notification}`,
    report:
      process.env.REPORT_SERVICE_URL ??
      `http://localhost:${SERVICE_PORTS.report}`,
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

  loginUser(body: LoginUserRequest): Promise<AuthResponse> {
    return this.postToService(
      'identity-service',
      this.urls.identity,
      '/auth/login',
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
  ): Promise<T> {
    return this.request<T>(service, `${baseUrl}${path}`, {
      method: 'POST',
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
  ): Promise<T> {
    try {
      const response = await fetch(url, init);
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new BadGatewayException({
          service,
          statusCode: response.status,
          payload,
        });
      }

      return payload as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException({
        service,
        message,
      });
    }
  }
}
