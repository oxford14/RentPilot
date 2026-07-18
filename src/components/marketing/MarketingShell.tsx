"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Features', href: '/welcome#features' },
  { label: 'Pricing', href: '/pricing' },
];

function Brand() {
  return (
    <Link href="/welcome" className="group flex cursor-pointer items-center">
      <Image
        src={MAIN_APP_LOGO_URL}
        alt="Rental Pilot"
        width={282}
        height={100}
        className="h-9 w-auto object-contain transition-transform duration-200 ease-out group-hover:scale-105"
        priority
      />
    </Link>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'cursor-pointer text-sm font-medium text-muted-ink transition-colors duration-150 hover:text-ink',
                  pathname === link.href && 'text-ink'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" className="cursor-pointer text-ink hover:bg-brand/5">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="cursor-pointer bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors duration-150 hover:bg-brand/5 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="animate-fade-in border-t border-line/80 bg-white md:hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-medium text-muted-ink transition-colors hover:bg-brand/5 hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button
                  asChild
                  className="w-full cursor-pointer bg-brand text-white hover:bg-brand-dark"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line/80 bg-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Brand />
              <p className="mt-3 text-sm leading-relaxed text-muted-ink">
                Rental management for landlords and fleet operators — tenants, billing, and reminders in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">Product</h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/welcome#features" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Features</Link></li>
                  <li><Link href="/pricing" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Pricing</Link></li>
                  <li><Link href="/signup" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Start free trial</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">Account</h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/login" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Sign in</Link></li>
                  <li><Link href="/signup" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Create account</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">Legal</h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/terms" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Terms</Link></li>
                  <li><Link href="/privacy-policy" className="cursor-pointer text-ink/80 transition-colors hover:text-brand">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line/80 pt-6 sm:flex-row">
            <p className="text-xs text-muted-ink">
              &copy; {new Date().getFullYear()} Rental Pilot. All rights reserved.
            </p>
            <a
              href="https://www.facebook.com/rentpilotweb/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line text-muted-ink transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
