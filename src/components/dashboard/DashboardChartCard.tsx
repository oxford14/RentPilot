"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DashboardChartCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  staggerIndex?: number;
}

export function DashboardChartCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  staggerIndex = 0,
}: DashboardChartCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl',
        'animate-in fade-in slide-in-from-bottom-6 fill-mode-both duration-700',
        className
      )}
      style={{ animationDelay: `${200 + staggerIndex * 100}ms` }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-headline text-lg">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
