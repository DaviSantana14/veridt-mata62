import { createHmac, timingSafeEqual } from 'crypto';
import { BadRequestException } from '@nestjs/common';

type VerifyMercadoPagoWebhookSignatureInput = {
  dataId: string;
  requestId: string | undefined;
  signature: string | undefined;
  secret: string;
};

export function verifyMercadoPagoWebhookSignature({
  dataId,
  requestId,
  signature,
  secret,
}: VerifyMercadoPagoWebhookSignatureInput): void {
  if (!requestId || !signature) {
    throw new BadRequestException('Mercado Pago webhook signature is required');
  }

  const signatureParts = parseSignature(signature);

  if (!signatureParts.ts || !signatureParts.v1) {
    throw new BadRequestException('Mercado Pago webhook signature is invalid');
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${signatureParts.ts};`;
  const expectedSignature = createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  if (!safeCompareHex(expectedSignature, signatureParts.v1)) {
    throw new BadRequestException('Mercado Pago webhook signature is invalid');
  }
}

function parseSignature(signature: string): { ts?: string; v1?: string } {
  return signature.split(',').reduce<{ ts?: string; v1?: string }>(
    (parts, segment) => {
      const [key, value] = segment.split('=').map((part) => part.trim());

      if (key === 'ts' || key === 'v1') {
        parts[key] = value;
      }

      return parts;
    },
    {},
  );
}

function safeCompareHex(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
