export async function verifyPayment(paymentId: string): Promise<{
  verified: boolean;
  amount?: number;
  status?: string;
}> {
  try {
    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
      }
    );

    if (!response.ok) {
      return { verified: false };
    }

    const data = await response.json();
    return {
      verified: data.status === 'PAID',
      amount: data.amount?.total,
      status: data.status,
    };
  } catch {
    return { verified: false };
  }
}
