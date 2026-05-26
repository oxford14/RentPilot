"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DashboardPageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  className?: string;
}

export function DashboardPageHeader({ title, subtitle, icon: Icon, className }: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 hover:scale-105">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
