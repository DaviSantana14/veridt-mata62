type GatewayHealth = {
  service: string;
  status: string;
  timestamp: string;
  downstream: Record<string, string>;
};

async function getGatewayHealth(): Promise<GatewayHealth | null> {
  const gatewayUrl = process.env.API_GATEWAY_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${gatewayUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GatewayHealth;
  } catch {
    return null;
  }
}

export default async function Home() {
  const gatewayHealth = await getGatewayHealth();
  const services = gatewayHealth?.downstream ?? {
    identity: "http://localhost:3101",
    billing: "http://localhost:3102",
    capture: "http://localhost:3103",
    notification: "http://localhost:3104",
    report: "http://localhost:3105",
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-8 text-[#121417] sm:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-[#dde3ea] pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#5b6775]">
            Veridit
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold sm:text-5xl">
            Boilerplate colaborativo para o trabalho de microsservicos
          </h1>
          <p className="max-w-3xl text-base leading-7 text-[#53606e]">
            O frontend Next.js consulta somente o API Gateway. Os servicos
            abaixo existem para o grupo implementar os requisitos do PDF sem
            misturar bancos ou responsabilidades.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="rounded-lg border border-[#dde3ea] bg-white p-5">
            <p className="text-sm font-medium text-[#5b6775]">API Gateway</p>
            <p className="mt-2 text-2xl font-semibold">
              {gatewayHealth?.status === "ok" ? "online" : "indisponivel"}
            </p>
            <p className="mt-2 text-sm text-[#697586]">
              {gatewayHealth
                ? `Atualizado em ${gatewayHealth.timestamp}`
                : "Inicie o gateway em http://localhost:3001 para ver o status real."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(services).map(([name, url]) => (
              <div
                className="rounded-lg border border-[#dde3ea] bg-white p-5"
                key={name}
              >
                <p className="text-sm font-medium capitalize text-[#121417]">
                  {name}
                </p>
                <p className="mt-2 break-all text-sm text-[#697586]">{url}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
