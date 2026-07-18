import { getPaymongoAuthHeader } from '@/lib/paymongo';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

export type QrPhIntent = {
  intentId: string;
  clientKey: string;
  qrImageUrl: string;
  testUrl: string | null;
};

function getSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PayMongo secret key is not configured.');
  return key;
}

function getPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
  if (!key) throw new Error('PayMongo public key is not configured.');
  return key;
}

export function isPaymongoTestMode(): boolean {
  return (process.env.PAYMONGO_SECRET_KEY ?? '').startsWith('sk_test_');
}

/**
 * Creates a QR Ph payment via a PayMongo payment intent:
 * 1. create a payment_intent (secret key)
 * 2. create a qrph payment_method (public key)
 * 3. attach the method to the intent (public key) -> returns the QR image
 */
export async function createQrPhPaymentIntent(amountInCentavos: number): Promise<QrPhIntent> {
  const secretKey = getSecretKey();
  const publicKey = getPublicKey();

  const intentRes = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: getPaymongoAuthHeader(secretKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountInCentavos,
          payment_method_allowed: ['qrph'],
          currency: 'PHP',
          capture_type: 'automatic',
        },
      },
    }),
  });

  const intentData = await intentRes.json();
  if (!intentRes.ok || intentData.errors) {
    const detail =
      intentData.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
      'Could not create payment intent.';
    throw new Error(detail);
  }

  const intentId = intentData.data.id as string;
  const clientKey = intentData.data.attributes.client_key as string;

  const methodRes = await fetch(`${PAYMONGO_API}/payment_methods`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: getPaymongoAuthHeader(publicKey),
    },
    body: JSON.stringify({
      data: { attributes: { type: 'qrph' } },
    }),
  });

  const methodData = await methodRes.json();
  if (!methodRes.ok || methodData.errors) {
    const detail =
      methodData.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
      'Could not create QR payment method.';
    throw new Error(detail);
  }

  const paymentMethodId = methodData.data.id as string;

  const attachRes = await fetch(`${PAYMONGO_API}/payment_intents/${intentId}/attach`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: getPaymongoAuthHeader(publicKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
        },
      },
    }),
  });

  const attachData = await attachRes.json();
  if (!attachRes.ok || attachData.errors) {
    const detail =
      attachData.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
      'Could not generate QR code.';
    throw new Error(detail);
  }

  const nextAction = attachData.data?.attributes?.next_action;
  const qrImageUrl: string = nextAction?.code?.image_url ?? '';
  const testUrl: string | null = nextAction?.code?.test_url ?? null;

  return { intentId, clientKey, qrImageUrl, testUrl };
}

/**
 * Fetches the current status of a payment intent, e.g.
 * `awaiting_payment_method` | `awaiting_next_action` | `processing` | `succeeded`.
 */
export async function getPaymentIntentStatus(intentId: string): Promise<string> {
  const secretKey = getSecretKey();
  const res = await fetch(`${PAYMONGO_API}/payment_intents/${intentId}`, {
    headers: {
      accept: 'application/json',
      authorization: getPaymongoAuthHeader(secretKey),
    },
  });

  const data = await res.json();
  if (!res.ok || !data?.data?.attributes) {
    const detail =
      data?.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
      'Payment intent lookup failed.';
    throw new Error(detail);
  }

  return String(data.data.attributes.status ?? 'unknown');
}
