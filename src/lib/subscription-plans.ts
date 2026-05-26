export type PlanKey = 'trial' | 'basic' | 'pro';

export type SubscriptionPlanDefinition = {
  key: PlanKey;
  /** Stored in Firestore & shown in admin */
  name: string;
  /** Sent to PayMongo metadata */
  paymongoPlanName: string;
  rate: number;
  description: string;
  features: string[];
  tenantLimit: number | null;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    key: 'trial',
    name: 'Trial',
    paymongoPlanName: 'Trial',
    rate: 0,
    description: 'Get started with essential features for 1 month.',
    features: ['Up to 3 tenants', 'Payment tracking', 'Basic reporting', 'Email support'],
    tenantLimit: 3,
  },
  {
    key: 'basic',
    name: 'Basic',
    paymongoPlanName: 'Basic Plan',
    rate: 200,
    description: 'Ideal for growing businesses, up to 50 tenants.',
    features: ['Up to 50 tenants', 'Advanced reporting', 'AI delinquency prediction', 'Priority support'],
    tenantLimit: 50,
  },
  {
    key: 'pro',
    name: 'Pro',
    paymongoPlanName: 'Pro Plan',
    rate: 500,
    description: 'For large-scale operations with unlimited tenants.',
    features: [
      'Unlimited tenants',
      'Advanced reporting',
      'AI delinquency prediction',
      'Data backup & restore',
      'Phone & chat support',
    ],
    tenantLimit: null,
  },
];

/** Admin form select options (includes legacy + custom) */
export const ADMIN_SUBSCRIPTION_PLAN_OPTIONS = [
  ...SUBSCRIPTION_PLANS.map((p) => ({ name: p.name, rate: p.rate })),
  { name: 'Custom Price', rate: null as number | null },
];

export function normalizePlanKey(planName?: string | null): PlanKey | 'custom' | 'unknown' {
  const n = (planName ?? '').trim().toLowerCase();
  if (!n) return 'unknown';
  if (n.includes('trial')) return 'trial';
  if (n.includes('pro') || n === 'company') return 'pro';
  if (n.includes('basic') || n === 'individual') return 'basic';
  return 'custom';
}

export function getPlanByKey(key: PlanKey): SubscriptionPlanDefinition {
  return SUBSCRIPTION_PLANS.find((p) => p.key === key)!;
}

export function getPlanDefinition(planName?: string | null): SubscriptionPlanDefinition | null {
  const key = normalizePlanKey(planName);
  if (key === 'trial' || key === 'basic' || key === 'pro') {
    return getPlanByKey(key);
  }
  return null;
}

/** Canonical value saved to Firestore after PayMongo payment */
export function canonicalPlanName(planName: string): string {
  const key = normalizePlanKey(planName);
  if (key === 'trial' || key === 'basic' || key === 'pro') {
    return getPlanByKey(key).name;
  }
  return planName.trim();
}

/** Maps Firestore / legacy names to admin dropdown value */
export function resolvePlanFormValue(planName?: string | null): string {
  const key = normalizePlanKey(planName);
  if (key === 'trial' || key === 'basic' || key === 'pro') {
    return getPlanByKey(key).name;
  }
  if (planName?.trim()) return 'Custom Price';
  return '';
}

export function planDisplayLabel(planName?: string | null): string {
  const def = getPlanDefinition(planName);
  if (def) return `${def.name} Plan`;
  if (planName?.trim()) return planName;
  return 'No plan selected';
}

export type PlanAction = {
  label: string;
  amount: number;
  paymongoPlanName: string;
  targetKey: PlanKey;
  variant?: 'default' | 'outline';
};

export function getSubscriptionActions(
  planName: string | undefined,
  canRenew: boolean
): PlanAction[] {
  const key = normalizePlanKey(planName);

  if (key === 'unknown' || key === 'trial' || key === 'custom') {
    return [
      {
        label: 'Subscribe to Basic',
        amount: 200,
        paymongoPlanName: 'Basic Plan',
        targetKey: 'basic',
      },
      {
        label: 'Subscribe to Pro',
        amount: 500,
        paymongoPlanName: 'Pro Plan',
        targetKey: 'pro',
        variant: 'outline',
      },
    ];
  }

  if (key === 'basic') {
    const actions: PlanAction[] = [];
    if (canRenew) {
      actions.push({
        label: 'Renew Basic (₱200/mo)',
        amount: 200,
        paymongoPlanName: 'Basic Plan',
        targetKey: 'basic',
      });
    }
    actions.push({
      label: 'Upgrade to Pro (₱500/mo)',
      amount: 500,
      paymongoPlanName: 'Pro Plan',
      targetKey: 'pro',
      variant: canRenew ? 'outline' : 'default',
    });
    return actions;
  }

  if (key === 'pro') {
    if (canRenew) {
      return [
        {
          label: 'Renew Pro (₱500/mo)',
          amount: 500,
          paymongoPlanName: 'Pro Plan',
          targetKey: 'pro',
        },
      ];
    }
    return [];
  }

  return [];
}
