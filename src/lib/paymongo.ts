import crypto from 'crypto';

export type PaymongoPaymentMetadata =
  | {
      paymentType: 'subscription';
      clientId: string;
      clientName?: string;
      planName: string;
      amount?: string;
      /** 'monthly' | 'yearly' — determines whether we extend by 1 or 12 months */
      billingCycle?: 'monthly' | 'yearly';
      /** Subscription due date at checkout — used to extend from billing date, not payment date */
      billingEndDate?: string;
      /** Return URL lookup when sessionStorage is unavailable after PayMongo redirect */
      paymentRef?: string;
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

export type PaymongoLinkDetails = {
  remarks: string | null;
  amount: number;
  status: string;
};

export async function fetchPaymongoLink(
  linkId: string,
  secretKey: string
): Promise<PaymongoLinkDetails | null> {
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
    status: attrs.status ?? 'unpaid',
  };
}

export function getPaymongoAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export type PaymongoCheckoutSessionDetails = {
  status: string;
  metadata: Record<string, string>;
  amount: number;
};

export function metadataFromPaymongoRecord(
  record: Record<string, string> | null | undefined
): PaymongoPaymentMetadata | null {
  if (!record?.paymentType) return null;
  if (record.paymentType === 'subscription') {
    return {
      paymentType: 'subscription',
      clientId: record.clientId,
      clientName: record.clientName,
      planName: record.planName,
      amount: record.amount,
      billingCycle: record.billingCycle === 'yearly' ? 'yearly' : 'monthly',
      billingEndDate: record.billingEndDate,
      paymentRef: record.paymentRef,
    };
  }
  if (record.paymentType === 'rent') {
    return {
      paymentType: 'rent',
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      clientId: record.clientId,
    };
  }
  return null;
}

function checkoutSessionIsPaid(attrs: Record<string, unknown>): boolean {
  const status = String(attrs.status ?? '').toLowerCase();
  if (status === 'paid' || status === 'complete' || status === 'succeeded') {
    return true;
  }

  const payments = attrs.payments as
    | Array<{ attributes?: { status?: string }; status?: string }>
    | undefined;
  return (
    payments?.some((payment) => {
      const paymentStatus = (
        payment.attributes?.status ?? payment.status ?? ''
      ).toLowerCase();
      return paymentStatus === 'paid' || paymentStatus === 'succeeded';
    }) ?? false
  );
}

export async function fetchPaymongoCheckoutSession(
  sessionId: string,
  secretKey: string
): Promise<PaymongoCheckoutSessionDetails | null> {
  const authString = Buffer.from(`${secretKey}:`).toString('base64');
  const response = await fetch(
    `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
    {
      headers: {
        accept: 'application/json',
        authorization: `Basic ${authString}`,
      },
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.data?.attributes) {
    console.error('[PayMongo] Failed to fetch checkout session:', sessionId, data?.errors);
    return null;
  }

  const attrs = data.data.attributes as Record<string, unknown>;
  const lineItems = attrs.line_items as Array<{ amount?: number; quantity?: number }> | undefined;
  const totalCentavos =
    lineItems?.reduce((sum, item) => sum + (item.amount ?? 0) * (item.quantity ?? 1), 0) ??
    0;

  const metadata: Record<string, string> = {};
  if (attrs.metadata && typeof attrs.metadata === 'object') {
    for (const [key, value] of Object.entries(attrs.metadata)) {
      metadata[key] = String(value);
    }
  }

  return {
    status: checkoutSessionIsPaid(attrs) ? 'paid' : String(attrs.status ?? 'active'),
    metadata,
    amount: totalCentavos / 100,
  };
}
