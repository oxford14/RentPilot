import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { createQrPhPaymentIntent } from '@/lib/paymongo-qr';
import { saveQrPending } from '@/lib/paymongo-pending';
import { canonicalPlanName, normalizePlanKey } from '@/lib/subscription-plans';
import { canRenewSubscription } from '@/lib/subscription-status';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { amount, planName, billingCycle, details } = await request.json();
    const normalizedCycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    if (!process.env.PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo is not configured.');
    }
    if (!amount || amount <= 0) {
      throw new Error('A valid payment amount is required.');
    }
    if (!planName || !details?.clientId) {
      throw new Error('Client and plan details are required.');
    }

    const { clientId, clientName, billingEndDate } = details as {
      clientId: string;
      clientName?: string;
      billingEndDate?: string;
    };

    const db = getAdminDb();
    const clientSnap = await db.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) {
      throw new Error('Client not found.');
    }

    const clientData = clientSnap.data()!;
    const currentPlanKey = normalizePlanKey(clientData.subscriptionPlanName);
    const paidPlanKey = normalizePlanKey(planName);
    const isSamePlanRenewal =
      currentPlanKey !== 'unknown' &&
      paidPlanKey !== 'unknown' &&
      currentPlanKey === paidPlanKey;

    if (isSamePlanRenewal) {
      const canRenew = canRenewSubscription({
        subscriptionStatus: clientData.subscriptionStatus,
        subscriptionEndDate: billingEndDate?.trim() || clientData.subscriptionEndDate,
      });
      if (!canRenew) {
        throw new Error(
          'Renewal is only available within 3 days of your subscription end date.'
        );
      }
    }

    const roundedAmount = Math.round(Number(amount) * 100) / 100;
    const { intentId, qrImageUrl, testUrl } = await createQrPhPaymentIntent(
      Math.round(roundedAmount * 100)
    );

    if (!qrImageUrl) {
      throw new Error('Payment provider did not return a QR code.');
    }

    await saveQrPending(intentId, {
      clientId,
      clientName: clientName ?? clientData.name,
      planName: canonicalPlanName(planName),
      amount: roundedAmount,
      billingCycle: normalizedCycle,
      billingEndDate: billingEndDate ? String(billingEndDate) : undefined,
    });

    return NextResponse.json({
      intentId,
      qrImageUrl,
      testUrl,
      amount: roundedAmount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not generate QR code.';
    console.error('[PayMongo QR Create]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
