import { chromium } from "playwright";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let browser;

  try {
    const { html, fileName } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: "HTML vazio" },
        { status: 400 }
      );
    }

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "load",
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
      { status: 500 }
    );

  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}