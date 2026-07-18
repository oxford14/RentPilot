import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BellRing,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Users,
  Car,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PricingCards } from '@/components/marketing/PricingCards';
import { Reveal } from '@/components/marketing/Reveal';

export const metadata = {
  title: 'Rental Pilot — Rental management for landlords & fleets',
  description:
    'Track tenants, collect rent, manage vehicle bookings, and never miss a due date. Rental Pilot brings your whole rental business into one clean workspace.',
};

const stats = [
  { value: '2,000+', label: 'Units managed' },
  { value: '₱48M+', label: 'Rent tracked' },
  { value: '98%', label: 'On-time collection' },
  { value: '4.9/5', label: 'Customer rating' },
];

const walkthrough = [
  {
    icon: Users,
    eyebrow: 'Tenants & billing',
    title: 'Every tenant, balance, and payment in one ledger',
    body: 'See who has paid, who is overdue, and what is due next. Record payments, generate charges, and keep a clean history for each unit.',
    image: '/images/marketing/module-tenants.png',
    alt: 'Rental Pilot tenant billing ledger',
  },
  {
    icon: Car,
    eyebrow: 'Vehicle rentals',
    title: 'Book and track your fleet without the guesswork',
    body: 'A visual booking calendar shows availability at a glance. Assign vehicles, set rates, and confirm reservations in a couple of clicks.',
    image: '/images/marketing/module-vehicles.png',
    alt: 'Rental Pilot vehicle booking calendar',
  },
];

const testimonials = [
  {
    quote:
      'Rental Pilot replaced three spreadsheets and a whiteboard. I finally know exactly who owes what — collections are up and my evenings are free.',
    name: 'Maria Santos',
    role: 'Manages 42 units, Quezon City',
    avatar: '/images/marketing/avatar-1.png',
  },
  {
    quote:
      'The booking calendar alone paid for itself. No more double-booked vehicles, and every rental is invoiced automatically.',
    name: 'David Cruz',
    role: 'Fleet owner, 18 vehicles',
    avatar: '/images/marketing/avatar-2.png',
  },
];

export default function WelcomePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_0%,_#EFF4FF_0%,_transparent_60%)]"
        />
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_1.25fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="motion-safe:animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              Property &amp; vehicle management
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Run every rental on{' '}
              <span className="text-brand">Rental Pilot</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-ink">
              Tenants, billing, vehicle bookings, and reminders — together in one clean workspace built for landlords and fleet operators.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="cursor-pointer bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark">
                <Link href="/signup">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="cursor-pointer border-line text-ink">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-ink">
              <div className="flex -space-x-2">
                <Image src="/images/marketing/avatar-1.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                <Image src="/images/marketing/avatar-2.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
              </div>
              <div className="flex items-center gap-1">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <span className="ml-1">Loved by landlords &amp; fleet owners</span>
              </div>
            </div>
          </div>

          <div className="motion-safe:animate-fade-in-up motion-safe:[animation-delay:150ms] lg:-mr-16 xl:-mr-28">
            <div className="rounded-2xl border border-line bg-white p-2 shadow-2xl shadow-ink/10 motion-safe:md:animate-float-slow">
              <Image
                src="/images/marketing/dashboard-rentalpilot.png"
                alt="Rental Pilot dashboard showing rent collections and tenant payments"
                width={1024}
                height={640}
                priority
                className="h-auto w-full rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-y border-line bg-white">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-line px-5 sm:px-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 60} className="px-4 py-6 text-center md:py-8">
                <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-ink">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bento feature grid */}
      <section id="features" className="scroll-mt-16 bg-canvas py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              One workspace for the whole rental business
            </h2>
            <p className="mt-4 text-lg text-muted-ink">
              Stop juggling spreadsheets and chat threads. Rental Pilot keeps properties, vehicles, and payments in sync.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Large: tenants */}
            <Reveal className="md:col-span-2">
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg">
                <div className="p-6 sm:p-8">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                    <Users className="h-4 w-4" /> Tenants &amp; billing
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-ink sm:text-2xl">
                    Track balances, charges, and payments per unit
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-ink">
                    A living ledger for every tenant — overdue flags, payment history, and one-click charges.
                  </p>
                </div>
                <div className="mt-auto overflow-hidden border-t border-line">
                  <Image
                    src="/images/marketing/module-tenants.png"
                    alt="Rental Pilot tenant billing ledger"
                    width={1024}
                    height={768}
                    className="h-auto w-full transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </Reveal>

            {/* Vehicles */}
            <Reveal delay={80}>
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg">
                <div className="p-6">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                    <Car className="h-4 w-4" /> Vehicle rentals
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-ink">
                    A booking calendar for your fleet
                  </h3>
                </div>
                <div className="mt-auto overflow-hidden border-t border-line">
                  <Image
                    src="/images/marketing/module-vehicles.png"
                    alt="Rental Pilot vehicle booking calendar"
                    width={1024}
                    height={768}
                    className="h-auto w-full transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </Reveal>

            {/* Small icon cards */}
            {[
              { icon: BellRing, title: 'Automatic reminders', body: 'Due-date and overdue nudges sent for you.' },
              { icon: Sparkles, title: 'AI delinquency prediction', body: 'Spot late payers before they slip.' },
              { icon: BarChart3, title: 'Revenue & occupancy reports', body: 'Know how the business is trending.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-brand/40 motion-safe:hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-200 motion-safe:group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-ink">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Walkthrough rows */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl space-y-16 px-5 sm:px-8 lg:space-y-24">
          {walkthrough.map((mod, i) => (
            <Reveal key={mod.title}>
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                    <mod.icon className="h-4 w-4" />
                    {mod.eyebrow}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {mod.title}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-ink">{mod.body}</p>
                  <Link
                    href="/signup"
                    className="mt-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
                  >
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-lg">
                    <Image
                      src={mod.image}
                      alt={mod.alt}
                      width={1024}
                      height={768}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-canvas py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Trusted by people who run rentals
            </h2>
            <p className="mt-4 text-lg text-muted-ink">
              Landlords and fleet operators use Rental Pilot to stay on top of every peso.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <figure className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg sm:p-8">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-ink">{t.name}</p>
                      <p className="text-sm text-muted-ink">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-muted-ink">
                Start free, then pick the plan that fits your portfolio. Upgrade anytime.
              </p>
            </div>
            <Button asChild variant="ghost" className="cursor-pointer text-brand hover:bg-brand/5">
              <Link href="/pricing">
                See full pricing <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>

          <Reveal>
            <PricingCards className="mt-10" />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white pb-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center sm:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,_rgba(37,99,235,0.35)_0%,_transparent_70%)]"
              />
              <div className="relative">
                <div className="mb-5 flex items-center justify-center gap-2 text-sm font-medium text-white/70">
                  <ShieldCheck className="h-4 w-4" /> No card required · Free for 1 month
                </div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to take control of your rentals?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                  Join landlords and fleet operators running their entire business on Rental Pilot.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="cursor-pointer bg-brand text-white hover:bg-brand-dark">
                    <Link href="/signup">
                      Start free trial <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="cursor-pointer border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
