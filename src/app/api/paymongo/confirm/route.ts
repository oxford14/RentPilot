import { NextResponse } from 'next/server';
import {
  processPaidPaymongoLink,
  processPaidPaymongoCheckoutSession,
} from '@/lib/paymongo-process-link';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { linkId, sessionId, clientId } = await request.json();

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PayMongo is not configured' }, { status: 500 });
    }

    const expectedClientId = typeof clientId === 'string' ? clientId : undefined;

    let result;
    if (sessionId && typeof sessionId === 'string') {
      result = await processPaidPaymongoCheckoutSession(sessionId, secretKey, {
        expectedClientId,
      });
    } else if (linkId && typeof linkId === 'string') {
      result = await processPaidPaymongoLink(linkId, secretKey, { expectedClientId });
    } else {
      return NextResponse.json({ error: 'sessionId or linkId is required' }, { status: 400 });
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
