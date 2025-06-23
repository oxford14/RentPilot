
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { useAppContext } from '@/contexts/AppContext';
import { AreaChart as LucideAreaChart, BarChartHorizontalBig, Info, TrendingUp, TrendingDown, DollarSign, ListChecks, PieChart as LucidePieChart, FileDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MonthlyData {
  name: string; // e.g., "Jan '24"
  income: number;
  expenses: number;
}

interface ExpenseCategoryData {
  category: ExpenseCategory;
  total: number;
  fill: string;
}

const getMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const incomeExpenseChartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const expenseCategoryColors: { [key in ExpenseCategory]: string } = {
  'Maintenance': "hsl(var(--chart-1))",
  'Utilities': "hsl(var(--chart-2))",
  'Administrative': "hsl(var(--chart-3))",
  'Marketing': "hsl(var(--chart-4))",
  'Supplies': "hsl(var(--chart-5))",
  'Repairs': "hsl(var(--chart-1))", // Repeating colors for example, ideally more distinct
  'Taxes & Fees': "hsl(var(--chart-2))",
  'Other': "hsl(var(--chart-3))",
};

const expenseCategoryChartConfig = Object.keys(expenseCategoryColors).reduce((acc, category) => {
  acc[category as ExpenseCategory] = {
    label: category,
    color: expenseCategoryColors[category as ExpenseCategory],
  };
  return acc;
}, {} as ChartConfig);


export default function EarningsReportPage() {
  const { payments, expenses: allExpenses, expenseCategories } = useAppContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyData[]>([]);
  const [expenseCategoryChartData, setExpenseCategoryChartData] = useState<ExpenseCategoryData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [totalIncomeForPeriod, setTotalIncomeForPeriod] = useState(0);
  const [totalExpensesForPeriod, setTotalExpensesForPeriod] = useState(0);
  const [netProfitForPeriod, setNetProfitForPeriod] = useState(0);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const today = new Date();
    const from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const to = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    setDateRange({ from, to });
  }, []);


  useEffect(() => {
    if (!isClient || !dateRange?.from || !dateRange?.to) {
      setMonthlyChartData([]);
      setExpenseCategoryChartData([]);
      setTotalIncomeForPeriod(0);
      setTotalExpensesForPeriod(0);
      setNetProfitForPeriod(0);
      return;
    }

    const startDate = startOfDay(new Date(dateRange.from));
    const endDate = endOfDay(new Date(dateRange.to));

    const periodPayments = payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= startDate && paymentDate <= endDate;
    });
    const periodExpenses = allExpenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });

    const currentTotalIncome = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const currentTotalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    setTotalIncomeForPeriod(currentTotalIncome);
    setTotalExpensesForPeriod(currentTotalExpenses);
    setNetProfitForPeriod(currentTotalIncome - currentTotalExpenses);

    // Monthly aggregation for Bar Chart
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

    periodPayments.forEach(p => {
        const monthYearStr = getMonthYear(p.date);
        if (monthlyAggregates[monthYearStr]) {
          monthlyAggregates[monthYearStr].income += p.amount;
        }
    });

    periodExpenses.forEach(e => {
        const monthYearStr = getMonthYear(e.date);
        if (monthlyAggregates[monthYearStr]) {
          monthlyAggregates[monthYearStr].expenses += e.amount;
        }
    });
    
    const sortedMonthlyChartData = Object.keys(monthlyAggregates)
      .sort()
      .map(key => monthlyAggregates[key]);
    setMonthlyChartData(sortedMonthlyChartData);

    // Expense Category aggregation for Pie Chart
    const categoryTotals: { [key in ExpenseCategory]?: number } = {};
    periodExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const categoryChartData: ExpenseCategoryData[] = Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category: category as ExpenseCategory,
        total: total || 0,
        fill: expenseCategoryColors[category as ExpenseCategory] || "hsl(var(--chart-5))", // Fallback color
      }))
      .filter(item => item.total > 0) // Only show categories with expenses
      .sort((a, b) => b.total - a.total); // Sort by total descending
    setExpenseCategoryChartData(categoryChartData);

  }, [payments, allExpenses, dateRange, isClient, expenseCategories]);

  const handleExportPDF = async () => {
    const input = reportContentRef.current;
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Report content not found.' });
      return;
    }

    setIsExporting(true);
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: null, // Use element's background
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('earnings-report.pdf');
      toast({ title: 'PDF Exported', description: 'Your report has been downloaded.' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ variant: 'destructive', title: 'PDF Export Failed', description: 'An unexpected error occurred.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 flex items-center">
            <LucideAreaChart className="mr-3 h-8 w-8 text-primary" />
            Earnings Report
          </h1>
          <p className="text-muted-foreground">Visualize monthly income, expenses, and spending distribution.</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="shadow-md">
          <FileDown className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </Button>
      </div>

      <div ref={reportContentRef} className="space-y-8 bg-background p-4 rounded-lg">
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
              Monthly Income vs. Expenses
            </CardTitle>
            <CardDescription>
              {dateRange?.from && dateRange.to 
                ? `Showing data from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
                : "Select a date range to view chart data."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && monthlyChartData.length > 0 ? (
              <ChartContainer config={incomeExpenseChartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                  {isClient ? "No income/expense data for the selected period." : "Loading chart data..."}
                </p>
                <p className="text-sm">
                  {isClient ? "Try adjusting the date range or ensure there are payments and expenses recorded." : "Please wait."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <LucidePieChart className="mr-2 h-5 w-5 text-primary" />
              Expense Breakdown by Category
            </CardTitle>
            <CardDescription>
              Distribution of total expenses across categories for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && expenseCategoryChartData.length > 0 ? (
              <ChartContainer config={expenseCategoryChartConfig} className="min-h-[300px] w-full aspect-square sm:aspect-video">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <ChartTooltipContent 
                      nameKey="category" 
                      formatter={(value, name) => (
                          <div className="flex flex-col">
                              <span className="capitalize">{name}</span>
                              <span>₱{Number(value).toLocaleString()}</span>
                          </div>
                      )}
                    />
                    <Pie
                      data={expenseCategoryChartData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, category }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const percentage = (percent * 100).toFixed(0);
                        if (parseInt(percentage) < 5) return null; // Hide label if too small
                        return (
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                            {`${category} (${percentage}%)`}
                          </text>
                        );
                      }}
                    >
                      {expenseCategoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend content={<ChartLegendContent nameKey="category" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                <Info className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p className="text-lg">
                  {isClient ? "No expense data to categorize for the selected period." : "Loading category data..."}
                </p>
                <p className="text-sm">
                  {isClient ? "Ensure expenses are recorded with categories." : "Please wait."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" />
              Period Summary
            </CardTitle>
            <CardDescription>
              Total income, expenses, and net profit for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-7 w-7 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-xl font-semibold text-green-600">
                    ₱{isClient ? totalIncomeForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-7 w-7 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-xl font-semibold text-destructive">
                    ₱{isClient ? totalExpensesForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <DollarSign className={cn("h-7 w-7", isClient && netProfitForPeriod >= 0 ? "text-green-500" : isClient && netProfitForPeriod < 0 ? "text-destructive" : "text-muted-foreground")} />
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={cn("text-xl font-bold", isClient && netProfitForPeriod >= 0 ? "text-green-600" : isClient && netProfitForPeriod < 0 ? "text-destructive" : "text-foreground")}>
                    ₱{isClient ? netProfitForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
