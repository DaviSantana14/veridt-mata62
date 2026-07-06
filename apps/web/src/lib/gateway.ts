import type {
  BrowserInputRequest,
  BrowserInputResponse,
  CaptureAssetResponse,
  CaptureFrameResponse,
  CaptureRecordDetailsResponse,
  CaptureVideoStateResponse,
  CompleteCaptureResponse,
  CreateCardPaymentRequest,
  CreateCardPaymentResponse,
  CreateEmbeddedCreditPurchaseResponse,
  CreditPackageResponse,
  NavigateCaptureRequest,
  NavigateCaptureResponse,
  SimulatePaymentResponse,
  StartCaptureRequest,
  StartCaptureSessionResponse,
  UserCreditBalanceResponse,
} from "@veridit/contracts";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3001";
const REQUEST_TIMEOUT_MS = 10000;

type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function requestGateway<T>(
  path: string,
  init?: RequestInit,
  options: { timeoutMs?: number } = {},
): Promise<GatewayResult<T>> {
  try {
    const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );

    const response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    }).finally(() => clearTimeout(timeoutId));

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          data?.message ?? data?.payload?.message ?? `Erro ${response.status}`,
      };
    }

    return {
      ok: true,
      data: data as T,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        message: "Tempo esgotado ao conectar com o gateway",
      };
    }

    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Erro de conexão com gateway",
    };
  }
}
export function startMockCapture(payload: {
  userId: string;
  title: string;
  siteUrl: string;
}) {
  return requestGateway<{ id: string }>("/capture/records/mock", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function startCapture(payload: StartCaptureRequest) {
  return requestGateway<StartCaptureSessionResponse>(
    "/capture/records",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: 30000,
    },
  );
}

export function getCaptureFrame(recordId: string) {
  return requestGateway<CaptureFrameResponse>(
    `/capture/records/${recordId}/frame`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function getCaptureRecord(recordId: string) {
  return requestGateway<CaptureRecordDetailsResponse>(
    `/capture/records/${recordId}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function sendCaptureInput(
  recordId: string,
  payload: BrowserInputRequest,
) {
  return requestGateway<BrowserInputResponse>(
    `/capture/records/${recordId}/input`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function navigateCapture(
  recordId: string,
  payload: NavigateCaptureRequest,
) {
  return requestGateway<NavigateCaptureResponse>(
    `/capture/records/${recordId}/navigate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: 30000,
    },
  );
}

export function captureScreenshot(recordId: string) {
  return requestGateway<CaptureAssetResponse>(
    `/capture/records/${recordId}/screenshots`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    {
      timeoutMs: 20000,
    },
  );
}

export function startCaptureVideo(recordId: string) {
  return requestGateway<CaptureVideoStateResponse>(
    `/capture/records/${recordId}/video/start`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function stopCaptureVideo(recordId: string) {
  return requestGateway<CaptureVideoStateResponse>(
    `/capture/records/${recordId}/video/stop`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    {
      timeoutMs: 20000,
    },
  );
}

export function completeCapture(recordId: string) {
  return requestGateway<CompleteCaptureResponse>(
    `/capture/records/${recordId}/complete`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function createMockPurchase(payload: {
  userId: string;
  packageName: "basic" | "medium" | "premium";
  payerEmail: string;
}) {
  return requestGateway<{ purchaseId: string; status: string }>(
    "/billing/purchases/mock",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function createCreditPurchase(
  payload: {
    userId: string;
    packageName: "basic" | "medium" | "premium";
    payerEmail: string;
  },
  idempotencyKey: string,
) {
  return requestGateway<{
    purchaseId: string;
    status: "PENDING" | "PAID" | "CANCELED";
    checkoutUrl: string;
    providerPreferenceId: string;
  }>("/billing/purchases", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function createEmbeddedCreditPurchase(
  payload: {
    userId: string;
    packageName: "basic" | "medium" | "premium";
    payerEmail: string;
  },
  idempotencyKey: string,
) {
  return requestGateway<CreateEmbeddedCreditPurchaseResponse>(
    "/billing/purchases/card",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );
}

export function createCardPayment(
  purchaseId: string,
  payload: CreateCardPaymentRequest,
  idempotencyKey: string,
) {
  return requestGateway<CreateCardPaymentResponse>(
    `/billing/purchases/${purchaseId}/mercado-pago/card-payment`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );
}

export function simulatePayment(purchaseId: string) {
  return requestGateway<SimulatePaymentResponse>(
    `/billing/purchases/${purchaseId}/simulate-payment`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getUserCreditBalance(userId: string) {
  return requestGateway<UserCreditBalanceResponse>(
    `/billing/users/${userId}/credits`,
    {
      method: "GET",
    },
  );
}

export function loginUser(payload: { email: string; password: string }) {
  return requestGateway<{
    accessToken: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      profile: "COMMON_USER" | "LAWYER";
    };
  }>("/identity/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload: {
  fullName: string;
  cpf: string;
  email: string;
  password: string;
  profile: string;
  oabNumber?: string;
}) {
  return requestGateway<{ id: string }>("/identity/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(payload: { email: string }) {
  return requestGateway<{ message: string }>("/identity/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return requestGateway<{ message: string }>("/identity/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUserProfile(userId: string) {
  return requestGateway<{
    id: string;
    fullName: string;
    email: string;
    cpf: string;
    profile: "COMMON_USER" | "LAWYER";
    createdAt: string;
  }>(`/identity/users/${userId}`, {
    method: "GET",
  });
}

export function updateUserProfile(
  userId: string,
  payload: {
    fullName: string;
    email: string;
  },
) {
  return requestGateway<{
    id: string;
    fullName: string;
    email: string;
    cpf: string;
    profile: "COMMON_USER" | "LAWYER";
    createdAt: string;
  }>(`/identity/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changeUserPassword(
  userId: string,
  payload: {
    currentPassword: string;
    newPassword: string;
  },
) {
  return requestGateway<{ message: string }>(
    `/identity/users/${userId}/password`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function getGatewayPlans() {
  return requestGateway<CreditPackageResponse[]>("/billing/packages", {
    cache: "no-store",
  });
}
