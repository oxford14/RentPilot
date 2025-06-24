
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MonitoringCardProps {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}

export function MonitoringCard({ title, icon: Icon, count, children }: MonitoringCardProps) {
  return (
    <Card className="bg-black/50 backdrop-blur-lg border border-white/20 text-white shadow-xl flex flex-col h-[60vh]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icon className="h-6 w-6" />
                <span className="text-xl font-semibold">{title}</span>
            </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-3">
            {children}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
