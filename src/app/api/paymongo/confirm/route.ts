import { NextResponse } from 'next/server';
import {
  processPaidPaymongoLink,
  processPaidPaymongoCheckoutSession,
} from '@/lib/paymongo-process-link';
import {
  deletePendingCheckout,
  resolvePendingCheckout,
} from '@/lib/paymongo-pending';
import { isClientSubscriptionActive } from '@/lib/paymongo-subscription-check';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { linkId, clientId, paymentRef } = body;
    let sessionId = body.sessionId as string | undefined;

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PayMongo is not configured' }, { status: 500 });
    }

    const expectedClientId = typeof clientId === 'string' ? clientId : undefined;

    if (!sessionId && typeof paymentRef === 'string' && paymentRef) {
      const pending = await resolvePendingCheckout(paymentRef, expectedClientId);
      if (pending) {
        sessionId = pending.sessionId;
      }
    }

    if (!sessionId && !linkId && expectedClientId) {
      const alreadyActive = await isClientSubscriptionActive(expectedClientId);
      if (alreadyActive) {
        if (typeof paymentRef === 'string' && paymentRef) {
          await deletePendingCheckout(paymentRef);
        }
        return NextResponse.json({
          processed: true,
          duplicate: true,
          alreadyActivated: true,
          paymentType: 'subscription',
        });
      }
    }

    let result;
    if (sessionId && typeof sessionId === 'string') {
      result = await processPaidPaymongoCheckoutSession(sessionId, secretKey, {
        expectedClientId,
      });
      if (typeof paymentRef === 'string' && paymentRef && result.processed) {
        await deletePendingCheckout(paymentRef);
      }
    } else if (linkId && typeof linkId === 'string') {
      result = await processPaidPaymongoLink(linkId, secretKey, { expectedClientId });
    } else {
      return NextResponse.json(
        { error: 'sessionId, paymentRef, or linkId is required' },
        { status: 400 }
      );
    }

    if (!result.processed) {
      return NextResponse.json(
        { error: result.message ?? 'Payment not completed yet' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    console.error('[PayMongo Confirm]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
