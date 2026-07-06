import { chromium } from "playwright";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let browser;

  try {
    const { html, fileName } = await request.json();

    if (typeof html !== "string" || !html.trim()) {
      return NextResponse.json({ error: "HTML vazio" }, { status: 400 });
    }

    if (typeof fileName !== "string" || !/^[A-Za-z0-9._-]+\.pdf$/.test(fileName)) {
      return NextResponse.json(
        { error: "Nome de arquivo invalido" },
        { status: 400 },
      );
    }

    if (/<script[\s>]/i.test(html)) {
      return NextResponse.json(
        { error: "HTML contem script nao permitido" },
        { status: 400 },
      );
    }

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      javaScriptEnabled: false,
    });

    page.setDefaultTimeout(10000);
    await page.route("**/*", (route) => {
      const url = route.request().url();

      if (url.startsWith("data:") || url.startsWith("about:")) {
        return route.continue();
      }

      return route.abort();
    });

    await page.setContent(html, {
      waitUntil: "load",
      timeout: 10000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Erro PDF:", error);

    return NextResponse.json(
      {
        error: "Falha ao gerar PDF",
        details: String(error),
      },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
