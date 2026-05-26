import {
  fetchPaymongoLink,
  fetchPaymongoCheckoutSession,
  metadataFromPaymongoRecord,
  parsePaymongoMetadata,
} from '@/lib/paymongo';
import { processPaymongoMetadata } from '@/lib/paymongo-handlers';
import { getAdminDb } from '@/lib/firebase-admin';

export type ProcessPaidLinkResult = {
  processed: boolean;
  duplicate?: boolean;
  paymentType?: string;
  message?: string;
};

async function markPaymentProcessed(paymentId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection('paymongoProcessedLinks').doc(paymentId);
  const existing = await ref.get();
  if (existing.exists) return false;
  await ref.set({ processedAt: new Date().toISOString() });
  return true;
}

export async function processPaidPaymongoLink(
  linkId: string,
  secretKey: string,
  options?: { expectedClientId?: string }
): Promise<ProcessPaidLinkResult> {
  const link = await fetchPaymongoLink(linkId, secretKey);
  if (!link) {
    throw new Error('Payment link not found.');
  }

  if (link.status !== 'paid') {
    return {
      processed: false,
      message: 'Payment is not completed yet. Finish checkout on PayMongo, then try again.',
    };
  }

  if (!link.remarks) {
    throw new Error('Payment link has no metadata.');
  }

  const metadata = parsePaymongoMetadata(link.remarks);
  if (!metadata?.paymentType) {
    throw new Error('Unrecognized payment metadata on this link.');
  }

  if (
    options?.expectedClientId &&
    'clientId' in metadata &&
    metadata.clientId !== options.expectedClientId
  ) {
    throw new Error('This payment does not belong to your organization.');
  }

  const shouldProcess = await markPaymentProcessed(linkId);
  if (!shouldProcess) {
    return { processed: true, duplicate: true, paymentType: metadata.paymentType };
  }

  try {
    await processPaymongoMetadata(metadata, link.amount);
    return { processed: true, paymentType: metadata.paymentType };
  } catch (error) {
    try {
      await getAdminDb().collection('paymongoProcessedLinks').doc(linkId).delete();
    } catch {
      // allow retry
    }
    throw error;
  }
}

export async function processPaidPaymongoCheckoutSession(
  sessionId: string,
  secretKey: string,
  options?: { expectedClientId?: string }
): Promise<ProcessPaidLinkResult> {
  const session = await fetchPaymongoCheckoutSession(sessionId, secretKey);
  if (!session) {
    throw new Error('Checkout session not found.');
  }

  if (session.status !== 'paid') {
    return {
      processed: false,
      message: 'Payment is still processing. Please wait a moment.',
    };
  }

  const metadata = metadataFromPaymongoRecord(session.metadata);
  if (!metadata?.paymentType) {
    throw new Error('Unrecognized payment metadata on this checkout session.');
  }

  if (
    options?.expectedClientId &&
    'clientId' in metadata &&
    metadata.clientId !== options.expectedClientId
  ) {
    throw new Error('This payment does not belong to your organization.');
  }

  const shouldProcess = await markPaymentProcessed(sessionId);
  if (!shouldProcess) {
    return { processed: true, duplicate: true, paymentType: metadata.paymentType };
  }

  const paidAmount =
    metadata.paymentType === 'subscription' && metadata.amount
      ? Number(metadata.amount)
      : session.amount;

  try {
    await processPaymongoMetadata(metadata, paidAmount > 0 ? paidAmount : session.amount);
    return { processed: true, paymentType: metadata.paymentType };
  } catch (error) {
    try {
      await getAdminDb().collection('paymongoProcessedLinks').doc(sessionId).delete();
    } catch {
      // allow retry
    }
    throw error;
  }
}
