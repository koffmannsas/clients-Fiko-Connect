import crypto from 'node:crypto';

/**
 * Verifies Meta WhatsApp Cloud API Webhook Signature on the raw request body.
 * Meta uses X-Hub-Signature-256 header: 'sha256=<hash>'
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader?: string,
  appSecret?: string
): boolean {
  if (!appSecret) {
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const signatureHash = signatureHeader.substring(7);
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Paystack Webhook Signature on the raw request body.
 * Paystack uses x-paystack-signature header: HMAC SHA512 of raw body with secret key.
 */
export function verifyPaystackWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader?: string,
  secretKey?: string
): boolean {
  if (!secretKey) return false;
  if (!signatureHeader) return false;

  const expectedHash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader.trim()),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}
