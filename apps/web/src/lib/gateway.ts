const BASE_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3001";

type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function requestGateway<T>(
  path: string,
  init?: RequestInit,
): Promise<GatewayResult<T>> {
  try {
    const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data?.message ?? `Erro ${response.status}`,
      };
    }

    return {
      ok: true,
      data: data as T,
    };
  } catch (error) {
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

export async function getGatewayPlans() {
  return requestGateway<
    Array<{
      id: string;
      name: string;
      credits: number;
      pricePerCreditInCents: number;
      benefits: string;
    }>
  >("/billing/packages", { cache: "no-store" });
}
