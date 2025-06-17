
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { useAppContext } from '@/contexts/AppContext';
import { AreaChart as LucideAreaChart, BarChartHorizontalBig, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { format, startOfDay, endOfDay } from 'date-fns';

interface MonthlyData {
  name: string; // e.g., "Jan '24"
  income: number;
  expenses: number;
}

const getMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export default function EarningsReportPage() {
  const { payments, expenses: allExpenses } = useAppContext(); // Renamed to avoid conflict
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
     // Set a default date range, e.g., this month, on initial load
    const today = new Date();
    const from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const to = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)); // Last day of current month
    setDateRange({ from, to });
  }, []);


  useEffect(() => {
    if (!isClient || !dateRange?.from || !dateRange?.to) {
      setChartData([]);
      return;
    }

    const startDate = startOfDay(new Date(dateRange.from));
    const endDate = endOfDay(new Date(dateRange.to));

    const monthlyAggregates: Record<string, { name: string; income: number; expenses: number }> = {};

    let currentMonthIter = new Date(startDate);
    while (currentMonthIter <= endDate) {
      const monthYearStr = getMonthYear(currentMonthIter.toISOString());
      const monthName = format(currentMonthIter, "MMM yy");
      if (!monthlyAggregates[monthYearStr]) {
        monthlyAggregates[monthYearStr] = { name: monthName, income: 0, expenses: 0 };
      }
      currentMonthIter.setMonth(currentMonthIter.getMonth() + 1);
      currentMonthIter.setDate(1); 
    }

    payments
      .filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= startDate && paymentDate <= endDate;
      })
      .forEach(p => {
        const monthYearStr = getMonthYear(p.date);
        if (monthlyAggregates[monthYearStr]) {
          monthlyAggregates[monthYearStr].income += p.amount;
        }
      });

    allExpenses
      .filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      })
      .forEach(e => {
        const monthYearStr = getMonthYear(e.date);
        if (monthlyAggregates[monthYearStr]) {
          monthlyAggregates[monthYearStr].expenses += e.amount;
        }
      });
    
    const sortedChartData = Object.keys(monthlyAggregates)
      .sort()
      .map(key => monthlyAggregates[key]);

    setChartData(sortedChartData);

  }, [payments, allExpenses, dateRange, isClient]);

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2 flex items-center">
          <LucideAreaChart className="mr-3 h-8 w-8 text-primary" />
          Earnings Report (Income vs. Expenses)
        </h1>
        <p className="text-muted-foreground">Visualize monthly income and expenses over a selected period.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Date Range</CardTitle>
          <CardDescription>Select a date range to generate the earnings report.</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeSelector onDateChange={setDateRange} />
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
             <BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary"/>
            Monthly Breakdown
          </CardTitle>
          <CardDescription>
            {dateRange?.from && dateRange.to 
              ? `Showing data from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
              : "Select a date range to view chart data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClient && chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tickFormatter={(value) => `₱${value.toLocaleString()}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={5}
                />
                <ChartTooltipContent 
                    formatter={(value, name) => (
                        <div className="flex flex-col">
                            <span className="capitalize">{name}</span>
                            <span>₱{Number(value).toLocaleString()}</span>
                        </div>
                    )}
                />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
              <Info className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg">
                {isClient ? "No data available for the selected period." : "Loading chart data..."}
              </p>
              <p className="text-sm">
                {isClient ? "Try adjusting the date range or ensure there are payments and expenses recorded." : "Please wait."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
