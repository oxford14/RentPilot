export type PlanKey = 'trial' | 'basic' | 'pro' | 'enterprise';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionPlanDefinition = {
  key: PlanKey;
  /** Stored in Firestore & shown in admin */
  name: string;
  /** Sent to PayMongo metadata */
  paymongoPlanName: string;
  /** Monthly rate in PHP */
  rate: number;
  /** Yearly rate in PHP (≈ 2 months free) */
  yearlyRate: number;
  description: string;
  features: string[];
  tenantLimit: number | null;
  /** Contact-sales tier: no self-serve checkout / auto-renew */
  contactSales?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    key: 'trial',
    name: 'Trial',
    paymongoPlanName: 'Trial',
    rate: 0,
    yearlyRate: 0,
    description: 'Get started with essential features for 1 month.',
    features: ['Up to 5 tenants', 'Payment tracking', 'Basic reporting', 'Email support'],
    tenantLimit: 5,
  },
  {
    key: 'basic',
    name: 'Basic',
    paymongoPlanName: 'Basic Plan',
    rate: 499,
    yearlyRate: 4990,
    description: 'Ideal for small portfolios, up to 10 tenants.',
    features: ['Up to 10 tenants', 'Advanced reporting', 'AI delinquency prediction', 'Priority support'],
    tenantLimit: 10,
  },
  {
    key: 'pro',
    name: 'Pro',
    paymongoPlanName: 'Pro Plan',
    rate: 999,
    yearlyRate: 9990,
    description: 'For growing portfolios with staff, up to 50 tenants.',
    features: [
      'Up to 50 tenants',
      'Advanced reporting',
      'AI delinquency prediction',
      'Data backup & restore',
      'Phone & chat support',
    ],
    tenantLimit: 50,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    paymongoPlanName: 'Enterprise Plan',
    rate: 2499,
    yearlyRate: 24990,
    description: 'For larger portfolios, multiple branches and professional operators.',
    features: [
      'Everything in Pro',
      'Custom portfolio and inventory limits',
      'Multiple branches or business locations',
      'Role-based access and audit logs',
      'Custom reports and integrations',
      'Data migration assistance',
      'Dedicated onboarding and account support',
      'Custom service agreement',
    ],
    tenantLimit: null,
    contactSales: true,
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
  if (n.includes('enterprise')) return 'enterprise';
  if (n.includes('pro') || n === 'company') return 'pro';
  if (n.includes('basic') || n === 'individual') return 'basic';
  return 'custom';
}

function isRealPlanKey(key: PlanKey | 'custom' | 'unknown'): key is PlanKey {
  return key === 'trial' || key === 'basic' || key === 'pro' || key === 'enterprise';
}

export function getPlanByKey(key: PlanKey): SubscriptionPlanDefinition {
  return SUBSCRIPTION_PLANS.find((p) => p.key === key)!;
}

export function getPlanDefinition(planName?: string | null): SubscriptionPlanDefinition | null {
  const key = normalizePlanKey(planName);
  if (isRealPlanKey(key)) {
    return getPlanByKey(key);
  }
  return null;
}

/** Rate for a plan under the given billing cycle (defaults to monthly). */
export function getPlanRate(
  plan: SubscriptionPlanDefinition,
  cycle: BillingCycle = 'monthly'
): number {
  return cycle === 'yearly' ? plan.yearlyRate : plan.rate;
}

/** Canonical value saved to Firestore after PayMongo payment */
export function canonicalPlanName(planName: string): string {
  const key = normalizePlanKey(planName);
  if (isRealPlanKey(key)) {
    return getPlanByKey(key).name;
  }
  return planName.trim();
}

/** Maps Firestore / legacy names to admin dropdown value */
export function resolvePlanFormValue(planName?: string | null): string {
  const key = normalizePlanKey(planName);
  if (isRealPlanKey(key)) {
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

/** e.g. "₱499/mo" or "₱4,990/yr" */
export function formatPlanRate(
  plan: SubscriptionPlanDefinition,
  cycle: BillingCycle = 'monthly'
): string {
  const amount = getPlanRate(plan, cycle);
  const suffix = cycle === 'yearly' ? '/yr' : '/mo';
  return `₱${amount.toLocaleString()}${suffix}`;
}

export type PlanAction = {
  label: string;
  amount: number;
  paymongoPlanName: string;
  targetKey: PlanKey;
  billingCycle: BillingCycle;
  variant?: 'default' | 'outline';
};

function buildAction(
  targetKey: 'basic' | 'pro',
  cycle: BillingCycle,
  labelPrefix: 'Subscribe to' | 'Renew' | 'Upgrade to' | 'Switch to' | 'Get',
  opts: { withPrice?: boolean; variant?: 'default' | 'outline' } = {}
): PlanAction {
  const def = getPlanByKey(targetKey);
  const amount = getPlanRate(def, cycle);
  const label = opts.withPrice
    ? `${labelPrefix} ${def.name} (${formatPlanRate(def, cycle)})`
    : `${labelPrefix} ${def.name}`;
  return {
    label,
    amount,
    paymongoPlanName: def.paymongoPlanName,
    targetKey,
    billingCycle: cycle,
    variant: opts.variant,
  };
}

export function getSubscriptionActions(
  planName: string | undefined,
  canRenew: boolean,
  cycle: BillingCycle = 'monthly'
): PlanAction[] {
  const key = normalizePlanKey(planName);

  // Enterprise is contact-sales only — no self-serve actions.
  if (key === 'enterprise') {
    return [];
  }

  if (key === 'unknown' || key === 'trial' || key === 'custom') {
    return [
      buildAction('basic', cycle, 'Subscribe to'),
      buildAction('pro', cycle, 'Subscribe to', { variant: 'outline' }),
    ];
  }

  if (key === 'basic') {
    const actions: PlanAction[] = [];
    if (canRenew) {
      actions.push(buildAction('basic', cycle, 'Renew', { withPrice: true }));
    }
    actions.push(
      buildAction('pro', cycle, 'Upgrade to', {
        withPrice: true,
        variant: canRenew ? 'outline' : 'default',
      })
    );
    return actions;
  }

  if (key === 'pro') {
    if (canRenew) {
      return [buildAction('pro', cycle, 'Renew', { withPrice: true })];
    }
    return [];
  }

  return [];
}
