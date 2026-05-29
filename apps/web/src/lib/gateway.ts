const gatewayUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  process.env.API_GATEWAY_URL ??
  "http://localhost:3001";

type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function requestGateway<T>(
  path: string,
  init?: RequestInit,
): Promise<GatewayResult<T>> {
  try {
    const response = await fetch(`${gatewayUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `Gateway respondeu com status ${response.status}.`,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível falar com o API Gateway.",
    };
  }
}

export function registerUser(payload: {
  firstName: string;
  lastName: string;
  cpf: string;
  phone: string;
  email: string;
  password: string;
}) {
  return requestGateway<{ id: string; email: string }>("/identity/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
