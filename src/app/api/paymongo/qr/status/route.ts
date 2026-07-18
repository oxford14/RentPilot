import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getPaymentIntentStatus } from '@/lib/paymongo-qr';
import {
  deletePendingCheckout,
  resolveQrPending,
} from '@/lib/paymongo-pending';
import { processPaymongoMetadata } from '@/lib/paymongo-handlers';
import type { PaymongoPaymentMetadata } from '@/lib/paymongo';

export const runtime = 'nodejs';

async function markProcessed(intentId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection('paymongoProcessedLinks').doc(intentId);
  const existing = await ref.get();
  if (existing.exists) return false;
  await ref.set({ processedAt: new Date().toISOString() });
  return true;
}

export async function POST(request: Request) {
  try {
    const { intentId, clientId } = await request.json();
    if (!intentId || typeof intentId !== 'string') {
      return NextResponse.json({ error: 'intentId is required' }, { status: 400 });
    }

    const expectedClientId = typeof clientId === 'string' ? clientId : undefined;
    const status = await getPaymentIntentStatus(intentId);

    if (status !== 'succeeded') {
      return NextResponse.json({ paid: false, status });
    }

    const pending = await resolveQrPending(intentId, expectedClientId);
    if (!pending) {
      // Payment succeeded but metadata is gone — likely already applied.
      return NextResponse.json({ paid: true, processed: true, duplicate: true });
    }

    const shouldProcess = await markProcessed(intentId);
    if (!shouldProcess) {
      await deletePendingCheckout(intentId);
      return NextResponse.json({ paid: true, processed: true, duplicate: true });
    }

    const metadata: PaymongoPaymentMetadata = {
      paymentType: 'subscription',
      clientId: pending.clientId,
      clientName: pending.clientName,
      planName: pending.planName,
      amount: String(pending.amount),
      billingEndDate: pending.billingEndDate,
    };

    try {
      await processPaymongoMetadata(metadata, pending.amount);
    } catch (error) {
      try {
        await getAdminDb().collection('paymongoProcessedLinks').doc(intentId).delete();
      } catch {
        // allow retry
      }
      throw error;
    }

    await deletePendingCheckout(intentId);

    return NextResponse.json({ paid: true, processed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment.';
    console.error('[PayMongo QR Status]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
