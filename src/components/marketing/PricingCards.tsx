import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';

function formatRate(rate: number) {
  if (rate === 0) return '\u20b10';
  return `\u20b1${rate.toLocaleString()}`;
}

function tenantLabel(limit: number | null) {
  if (limit === null) return 'Unlimited tenants';
  return `Up to ${limit} tenants`;
}

export function PricingCards({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-6 md:grid-cols-3', className)}>
      {SUBSCRIPTION_PLANS.map((plan) => {
        const featured = plan.key === 'pro';
        const ctaLabel = plan.key === 'trial' ? 'Start free trial' : `Choose ${plan.name}`;

        return (
          <div
            key={plan.key}
            className={cn(
              'group relative flex flex-col rounded-2xl border bg-white p-6 transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 sm:p-7',
              featured
                ? 'border-brand shadow-lg shadow-brand/10 ring-1 ring-brand/20 motion-safe:hover:shadow-xl motion-safe:hover:shadow-brand/20'
                : 'border-line shadow-sm motion-safe:hover:border-brand/40 motion-safe:hover:shadow-lg'
            )}
          >
            {featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Most popular
              </span>
            )}

            <h3 className="font-display text-lg font-bold text-ink">{plan.name}</h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold tracking-tight text-ink">
                {formatRate(plan.rate)}
              </span>
              <span className="mb-1 text-sm text-muted-ink">
                {plan.rate === 0 ? '/ 1 month' : '/ month'}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-ink">{plan.description}</p>

            <div className="mt-5 rounded-xl bg-canvas px-3 py-2 text-sm font-medium text-ink">
              {tenantLabel(plan.tenantLimit)}
            </div>

            <ul className="mt-5 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              className={cn(
                'mt-7 w-full cursor-pointer',
                featured
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'bg-ink text-white hover:bg-ink/90'
              )}
            >
              <Link href="/signup">{ctaLabel}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
