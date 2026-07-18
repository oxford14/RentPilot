import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PricingCards } from '@/components/marketing/PricingCards';
import { Reveal } from '@/components/marketing/Reveal';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

export const metadata = {
  title: 'Pricing — Rental Pilot',
  description:
    'Straightforward Rental Pilot pricing. Start free, then choose Basic or Pro as your rental portfolio grows.',
};

const comparisonRows: { label: string; values: (string | boolean)[] }[] = [
  {
    label: 'Tenant limit',
    values: SUBSCRIPTION_PLANS.map((p) =>
      p.tenantLimit === null ? 'Unlimited' : `${p.tenantLimit}`
    ),
  },
  { label: 'Payment tracking', values: [true, true, true] },
  { label: 'Basic reporting', values: [true, true, true] },
  { label: 'Advanced reporting', values: [false, true, true] },
  { label: 'AI delinquency prediction', values: [false, true, true] },
  { label: 'Data backup & restore', values: [false, false, true] },
  {
    label: 'Support',
    values: ['Email', 'Priority', 'Phone & chat'],
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-brand" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-ink/50" />;
  return <span className="text-sm text-ink">{value}</span>;
}

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,_#EFF4FF_0%,_transparent_60%)]"
        />
        <div className="mx-auto w-full max-w-3xl px-5 pb-4 pt-16 text-center sm:px-8 sm:pt-20">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink motion-safe:animate-fade-in-up sm:text-5xl">
            Pricing that grows with you
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-ink motion-safe:animate-fade-in-up motion-safe:[animation-delay:100ms]">
            Start free for a month. Move to Basic or Pro whenever your portfolio is ready — no long-term contracts.
          </p>
        </div>
      </section>

      <section className="bg-canvas pb-8 pt-8">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <PricingCards />
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Compare plans
            </h2>
          </Reveal>

          {/* Desktop table */}
          <Reveal className="mt-8 hidden overflow-hidden rounded-2xl border border-line md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-canvas">
                  <th className="w-2/5 px-6 py-4 text-sm font-semibold text-ink">Feature</th>
                  {SUBSCRIPTION_PLANS.map((p) => (
                    <th key={p.key} className="px-6 py-4 text-center text-sm font-semibold text-ink">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 1 ? 'bg-canvas/60' : 'bg-white'}>
                    <td className="px-6 py-4 text-sm font-medium text-ink">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-6 py-4 text-center">
                        <Cell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          {/* Mobile stacked */}
          <div className="mt-8 space-y-6 md:hidden">
            {SUBSCRIPTION_PLANS.map((p, planIdx) => (
              <div key={p.key} className="rounded-2xl border border-line p-5">
                <h3 className="font-display text-lg font-bold text-ink">{p.name}</h3>
                <ul className="mt-4 space-y-3">
                  {comparisonRows.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-ink">{row.label}</span>
                      <span className="font-medium text-ink">
                        <Cell value={row.values[planIdx]} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-3xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Try Rental Pilot free for a month
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-ink">
            No card required to start. Already have an account?
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="cursor-pointer bg-brand text-white hover:bg-brand-dark">
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="cursor-pointer border-line text-ink">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
