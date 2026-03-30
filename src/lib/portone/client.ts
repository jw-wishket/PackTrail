'use client';

export async function requestPayment({
  storeId,
  paymentId,
  orderName,
  totalAmount,
  payMethod,
}: {
  storeId: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  payMethod: 'NAVER_PAY' | 'KAKAO_PAY';
}) {
  const PortOne = await import('@portone/browser-sdk/v2');

  const channelKey =
    payMethod === 'NAVER_PAY'
      ? process.env.NEXT_PUBLIC_PORTONE_NAVER_CHANNEL_KEY
      : process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY;

  const response = await PortOne.requestPayment({
    storeId,
    paymentId,
    orderName,
    totalAmount,
    currency: 'CURRENCY_KRW',
    payMethod: 'EASY_PAY',
    channelKey: channelKey || '',
  });

  return response;
}
