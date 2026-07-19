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
type Cycle = 'monthly' | 'yearly';
type CyclePlanIds = { monthly?: string; yearly?: string };

// Amounts in centavos. Yearly = monthly x 10 (~2 months free).
const TIERS: Record<TierKey, { name: string; monthly: number; yearly: number }> = {
  basic: { name: 'RentPilot Basic', monthly: 49900, yearly: 499000 },
  pro: { name: 'RentPilot Pro', monthly: 99900, yearly: 999000 },
};

async function createPlan(
  secretKey: string,
  params: { name: string; amount: number; cycle: Cycle; onDemand: boolean }
): Promise<string> {
  const cycleLabel = params.cycle === 'yearly' ? 'Yearly' : 'Monthly';
  const attributes: Record<string, unknown> = {
    name: params.onDemand
      ? `${params.name} ${cycleLabel} (Maya)`
      : `${params.name} ${cycleLabel}`,
    amount: params.amount,
    currency: 'PHP',
  };
  if (params.onDemand) {
    // On-demand (Maya): no interval; our scheduler triggers each cycle.
    attributes.type = 'on_demand';
  } else {
    attributes.interval = params.cycle === 'yearly' ? 'year' : 'month';
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

  const cardPlans = { ...(existing.cardPlans ?? {}) } as Record<TierKey, CyclePlanIds>;
  const mayaPlans = { ...(existing.mayaPlans ?? {}) } as Record<TierKey, CyclePlanIds>;
  const cycles: Cycle[] = ['monthly', 'yearly'];

  for (const key of Object.keys(TIERS) as TierKey[]) {
    const tier = TIERS[key];
    cardPlans[key] = { ...(cardPlans[key] ?? {}) };
    mayaPlans[key] = { ...(mayaPlans[key] ?? {}) };

    for (const cycle of cycles) {
      const amount = cycle === 'yearly' ? tier.yearly : tier.monthly;

      if (!cardPlans[key][cycle]) {
        cardPlans[key][cycle] = await createPlan(secretKey, {
          name: tier.name,
          amount,
          cycle,
          onDemand: false,
        });
        console.log(`Created card plan ${key}/${cycle}: ${cardPlans[key][cycle]}`);
      } else {
        console.log(`Card plan ${key}/${cycle} already set: ${cardPlans[key][cycle]}`);
      }

      if (!mayaPlans[key][cycle]) {
        mayaPlans[key][cycle] = await createPlan(secretKey, {
          name: tier.name,
          amount,
          cycle,
          onDemand: true,
        });
        console.log(`Created Maya plan ${key}/${cycle}: ${mayaPlans[key][cycle]}`);
      } else {
        console.log(`Maya plan ${key}/${cycle} already set: ${mayaPlans[key][cycle]}`);
      }
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
