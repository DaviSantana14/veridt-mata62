export interface RenderedEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

interface EmailLayoutInput {
  preview: string;
  title: string;
  bodyHtml: string;
  button: {
    label: string;
    href: string;
  };
  footerNote: string;
}

interface WelcomeEmailInput {
  fullName: string;
}

interface PasswordResetEmailInput {
  fullName: string;
  code: string;
}

interface CreditPurchaseEmailInput {
  purchaseId: string;
  packageName: string;
  credits: number;
}

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

function getFrontendOrigin(): string {
  const origin = process.env.FRONTEND_ORIGIN?.trim();

  if (!origin) {
    return DEFAULT_FRONTEND_ORIGIN;
  }

  return origin.replace(/\/+$/, '');
}

function buildFrontendUrl(path: string): string {
  return `${getFrontendOrigin()}${path}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderButton(label: string, href: string): string {
  const safeLabel = escapeHtml(label);
  const safeHref = escapeHtml(href);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
      <tr>
        <td style="background-color: #1f6feb; border-radius: 6px;">
          <a href="${safeHref}" style="display: inline-block; padding: 13px 18px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; line-height: 18px; text-decoration: none;">${safeLabel}</a>
        </td>
      </tr>
    </table>`;
}

function renderCodeBlock(code: string): string {
  return `
    <div style="margin: 20px 0; padding: 16px 14px; border: 1px dashed #9aa9bd; border-radius: 8px; background-color: #f1f5fb; color: #172033; font-family: Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 8px; line-height: 34px; text-align: center;">${escapeHtml(code)}</div>`;
}

function renderSummaryRows(rows: Array<[string, string]>): string {
  const renderedRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #edf1f6; color: #667085; font-family: Arial, sans-serif; font-size: 13px; line-height: 18px;">${escapeHtml(label)}</td>
          <td align="right" style="padding: 10px 0; border-top: 1px solid #edf1f6; color: #172033; font-family: Arial, sans-serif; font-size: 13px; font-weight: 700; line-height: 18px;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 18px;">
      ${renderedRows}
    </table>`;
}

function renderEmailLayout(input: EmailLayoutInput): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #eef2f7;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${escapeHtml(input.preview)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #eef2f7; margin: 0; padding: 28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #dce3ee; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="height: 5px; background-color: #22c55e; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background-color: #102033; padding: 22px 28px; color: #ffffff; font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 1px;">VERIDIT</td>
            </tr>
            <tr>
              <td style="padding: 30px 28px 28px;">
                <div style="color: #69748a; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; line-height: 16px; text-transform: uppercase;">Notificação segura</div>
                <h1 style="margin: 10px 0 16px; color: #101828; font-family: Arial, sans-serif; font-size: 24px; font-weight: 800; line-height: 30px;">${escapeHtml(input.title)}</h1>
                ${input.bodyHtml}
                ${renderButton(input.button.label, input.button.href)}
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 18px 28px; color: #738095; font-family: Arial, sans-serif; font-size: 12px; line-height: 18px;">${escapeHtml(input.footerNote)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 14px; color: #4a5568; font-family: Arial, sans-serif; font-size: 15px; line-height: 23px;">${escapeHtml(text)}</p>`;
}

export function renderWelcomeEmail(
  input: WelcomeEmailInput,
): RenderedEmailTemplate {
  const dashboardUrl = buildFrontendUrl('/dashboard');
  const subject = 'Bem-vindo ao Veridit';
  const text = [
    `Olá ${input.fullName}, sua conta Veridit foi criada com sucesso.`,
    'A partir de agora você pode registrar evidências digitais, acompanhar capturas e gerar relatórios.',
    `Acesse sua área: ${dashboardUrl}`,
  ].join('\n\n');

  const html = renderEmailLayout({
    preview: 'Sua conta Veridit foi criada com sucesso.',
    title: `Sua conta está pronta, ${input.fullName}`,
    bodyHtml: [
      paragraph(
        'Sua conta Veridit foi criada com sucesso. A partir de agora você pode registrar evidências digitais com rastreabilidade.',
      ),
      paragraph(
        'Use o painel para iniciar capturas, acompanhar registros e acessar relatórios quando precisar.',
      ),
    ].join(''),
    button: {
      label: 'Abrir painel',
      href: dashboardUrl,
    },
    footerNote:
      'Email automático da Veridit. Esta mensagem confirma a criação da sua conta.',
  });

  return {
    subject,
    text,
    html,
  };
}

export function renderPasswordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmailTemplate {
  const resetUrl = buildFrontendUrl('/recuperar-senha');
  const subject = 'Código de recuperação de senha Veridit';
  const text = [
    `Olá ${input.fullName}, seu código de recuperação é ${input.code}.`,
    'Ele expira em 15 minutos.',
    `Acesse a recuperação de senha: ${resetUrl}`,
    'Se você não solicitou este código, ignore este email.',
  ].join('\n\n');

  const html = renderEmailLayout({
    preview: 'Use este código para recuperar seu acesso Veridit.',
    title: 'Use este código para recuperar seu acesso',
    bodyHtml: [
      paragraph(
        `Olá ${input.fullName}, recebemos uma solicitação de recuperação para sua conta Veridit.`,
      ),
      renderCodeBlock(input.code),
      paragraph('Este código expira em 15 minutos.'),
      paragraph('Se você não solicitou este código, ignore este email.'),
    ].join(''),
    button: {
      label: 'Abrir recuperação',
      href: resetUrl,
    },
    footerNote:
      'Email automático de segurança da Veridit. Nunca compartilhe este código fora da tela de recuperação.',
  });

  return {
    subject,
    text,
    html,
  };
}

export function renderCreditPurchaseEmail(
  input: CreditPurchaseEmailInput,
): RenderedEmailTemplate {
  const creditsUrl = buildFrontendUrl('/creditos');
  const subject = 'Compra de créditos Veridit confirmada';
  const text = [
    `Compra ${input.purchaseId} confirmou ${input.credits} créditos para o pacote ${input.packageName}.`,
    `Acesse seus créditos: ${creditsUrl}`,
  ].join('\n\n');

  const html = renderEmailLayout({
    preview: 'Sua compra de créditos Veridit foi confirmada.',
    title: 'Seus créditos foram adicionados',
    bodyHtml: [
      paragraph(
        'Confirmamos sua compra de créditos Veridit. Os créditos já estão disponíveis para novas capturas.',
      ),
      renderSummaryRows([
        ['Pacote', input.packageName],
        ['Créditos', String(input.credits)],
        ['Compra', input.purchaseId],
      ]),
    ].join(''),
    button: {
      label: 'Ver créditos',
      href: creditsUrl,
    },
    footerNote:
      'Guarde este email como comprovante da notificação de compra de créditos Veridit.',
  });

  return {
    subject,
    text,
    html,
  };
}
