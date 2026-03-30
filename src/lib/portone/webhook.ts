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

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(signatureBuf, expectedBuf);
}
