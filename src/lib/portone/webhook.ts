import crypto from 'crypto';

export function verifyPortOneSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature || !process.env.PORTONE_WEBHOOK_SECRET) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', process.env.PORTONE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
