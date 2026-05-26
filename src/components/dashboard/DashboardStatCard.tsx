"use client";

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from './useCountUp';

type GradientVariant = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';

const gradientStyles: Record<GradientVariant, string> = {
  blue: 'from-blue-600 via-blue-500 to-indigo-600 shadow-blue-500/25',
  emerald: 'from-emerald-600 via-emerald-500 to-teal-600 shadow-emerald-500/25',
  amber: 'from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/25',
  violet: 'from-violet-600 via-purple-500 to-fuchsia-600 shadow-violet-500/25',
  rose: 'from-rose-600 via-rose-500 to-pink-600 shadow-rose-500/25',
  cyan: 'from-cyan-600 via-sky-500 to-blue-500 shadow-cyan-500/25',
};

export interface DashboardStatCardProps {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  variant?: GradientVariant;
  href?: string;
  actionLabel?: string;
  animateValue?: boolean;
  formatValue?: (n: number) => string;
  staggerIndex?: number;
  ready?: boolean;
}

export function DashboardStatCard({
  label,
  value,
  description,
  icon: Icon,
  variant = 'blue',
  href,
  actionLabel,
  animateValue = true,
  formatValue,
  staggerIndex = 0,
  ready = true,
}: DashboardStatCardProps) {
  const numericValue = typeof value === 'number' ? value : null;
  const animatedCount = useCountUp(numericValue ?? 0, ready && animateValue && numericValue !== null);
  const displayValue =
    numericValue !== null && animateValue && ready
      ? formatValue
        ? formatValue(animatedCount)
        : animatedCount.toLocaleString()
      : value;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-[1px] shadow-lg transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl',
        gradientStyles[variant],
        'animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500'
      )}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <div className="relative flex h-full flex-col rounded-[calc(1rem-1px)] bg-gradient-to-br p-5 text-white">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5 transition-transform duration-700 group-hover:translate-x-2"
          aria-hidden
        />

        <div className="relative flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-white/85">{label}</p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className="relative mt-3 text-3xl font-bold tracking-tight tabular-nums transition-all duration-300">
          {ready ? displayValue : '…'}
        </p>
        <p className="relative mt-1 text-xs text-white/75">{description}</p>

        {href && actionLabel && (
          <Link href={href} className="relative mt-4">
            <Button
              size="sm"
              variant="secondary"
              className="w-full border-0 bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 hover:text-white"
            >
              {actionLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
