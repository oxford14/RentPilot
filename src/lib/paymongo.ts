import crypto from 'crypto';

export type PaymongoPaymentMetadata =
  | {
      paymentType: 'subscription';
      clientId: string;
      clientName?: string;
      planName: string;
      amount?: string;
      linkId?: string;
    }
  | {
      paymentType: 'rent';
      tenantId: string;
      tenantName?: string;
      clientId: string;
      linkId?: string;
    };

export function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  livemode: boolean
): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1);
  }

  const timestamp = parts.t;
  const expected = livemode ? parts.li : parts.te;
  if (!timestamp || !expected) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computed = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  try {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return computed === expected;
  }
}

export function parsePaymongoMetadata(remarks: unknown): PaymongoPaymentMetadata | null {
  if (!remarks) return null;
  if (typeof remarks === 'string') {
    try {
      return JSON.parse(remarks) as PaymongoPaymentMetadata;
    } catch {
      return null;
    }
  }
  if (typeof remarks === 'object') {
    return remarks as PaymongoPaymentMetadata;
  }
  return null;
}

export async function fetchPaymongoLink(
  linkId: string,
  secretKey: string
): Promise<{ remarks: string | null; amount: number } | null> {
  const authString = Buffer.from(`${secretKey}:`).toString('base64');
  const response = await fetch(`https://api.paymongo.com/v1/links/${linkId}`, {
    headers: {
      accept: 'application/json',
      authorization: `Basic ${authString}`,
    },
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.attributes) {
    console.error('[PayMongo] Failed to fetch link:', linkId, data?.errors);
    return null;
  }

  const attrs = data.data.attributes;
  return {
    remarks: attrs.remarks ?? null,
    amount: (attrs.amount ?? 0) / 100,
  };
}

export function getPaymongoAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}
