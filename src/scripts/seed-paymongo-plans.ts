/**
 * One-off script to create PayMongo Plans for RentPilot subscription tiers and
 * persist their IDs in Firestore at `systemSettings/paymongo`.
 *
 * Requires PayMongo Subscriptions + Card Vaulting + Maya to be enabled on the
 * account (contact support@paymongo.com).
 *
 * Run: npx tsx src/scripts/seed-paymongo-plans.ts
 */
import 'dotenv/config';
import { getAdminDb } from '@/lib/firebase-admin';
import { getPaymongoAuthHeader } from '@/lib/paymongo';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

type TierKey = 'basic' | 'pro';

const TIERS: Record<TierKey, { name: string; amount: number }> = {
  basic: { name: 'RentPilot Basic', amount: 49900 },
  pro: { name: 'RentPilot Pro', amount: 99900 },
};

async function createPlan(
  secretKey: string,
  params: { name: string; amount: number; onDemand: boolean }
): Promise<string> {
  const attributes: Record<string, unknown> = {
    name: params.onDemand ? `${params.name} (Maya)` : params.name,
    amount: params.amount,
    currency: 'PHP',
  };
  if (params.onDemand) {
    attributes.type = 'on_demand';
  } else {
    attributes.interval = 'month';
    attributes.interval_count = 1;
  }

  const res = await fetch(`${PAYMONGO_API}/plans`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: getPaymongoAuthHeader(secretKey),
    },
    body: JSON.stringify({ data: { attributes } }),
  });

  const data = await res.json();
  if (!res.ok || !data?.data?.id) {
    const detail =
      data?.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
      'Unknown error';
    throw new Error(`Failed to create plan "${attributes.name}": ${detail}`);
  }
  return data.data.id as string;
}

async function main() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) throw new Error('PAYMONGO_SECRET_KEY is not set.');

  const db = getAdminDb();
  const ref = db.collection('systemSettings').doc('paymongo');
  const existing = (await ref.get()).data() ?? {};

  const cardPlans = { ...(existing.cardPlans ?? {}) } as Record<TierKey, string>;
  const mayaPlans = { ...(existing.mayaPlans ?? {}) } as Record<TierKey, string>;

  for (const key of Object.keys(TIERS) as TierKey[]) {
    const tier = TIERS[key];
    if (!cardPlans[key]) {
      cardPlans[key] = await createPlan(secretKey, { ...tier, onDemand: false });
      console.log(`Created card plan ${key}: ${cardPlans[key]}`);
    } else {
      console.log(`Card plan ${key} already set: ${cardPlans[key]}`);
    }
    if (!mayaPlans[key]) {
      mayaPlans[key] = await createPlan(secretKey, { ...tier, onDemand: true });
      console.log(`Created Maya plan ${key}: ${mayaPlans[key]}`);
    } else {
      console.log(`Maya plan ${key} already set: ${mayaPlans[key]}`);
    }
  }

  await ref.set({ cardPlans, mayaPlans, updatedAt: new Date().toISOString() }, { merge: true });
  console.log('Saved plan IDs to systemSettings/paymongo.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
