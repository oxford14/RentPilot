
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { PiggyBank, PlusCircle, TrendingUp, TrendingDown, MinusCircle, Edit, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, getYear, getMonth } from 'date-fns';
import { CompanyFundsExpenseForm } from '@/components/company-funds/CompanyFundsExpenseForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CompanyFundsExpense } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MonthlyFundsData {
  month: string;
  year: number;
  monthDate: Date;
  income: number;
  mainExpenses: number;
  netIncome: number;
  fundsIn: number;
  fundsOut: number;
  openingBalance: number;
  closingBalance: number;
}

const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CompanyFundsPage() {
  const { payments, expenses, companyFundsExpenses, deleteCompanyFundsExpense } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyFundsExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<CompanyFundsExpense | null>(null);

  const monthlyFundsData = useMemo(() => {
    const dataByMonth: { [key: string]: Partial<MonthlyFundsData> } = {};

    const processDate = (date: Date) => format(date, 'yyyy-MM');

    payments.forEach(p => {
      const monthKey = processDate(new Date(p.date));
      dataByMonth[monthKey] = {
        ...dataByMonth[monthKey],
        income: (dataByMonth[monthKey]?.income || 0) + p.amount,
      };
    });

    expenses.forEach(e => {
      const monthKey = processDate(new Date(e.date));
      dataByMonth[monthKey] = {
        ...dataByMonth[monthKey],
        mainExpenses: (dataByMonth[monthKey]?.mainExpenses || 0) + e.amount,
      };
    });

    companyFundsExpenses.forEach(e => {
        const monthKey = processDate(new Date(e.date));
        dataByMonth[monthKey] = {
            ...dataByMonth[monthKey],
            fundsOut: (dataByMonth[monthKey]?.fundsOut || 0) + e.amount,
        };
    });

    const sortedMonths = Object.keys(dataByMonth).sort();
    if (sortedMonths.length === 0) return [];
    
    const firstMonthDate = new Date(sortedMonths[0]);
    let loopDate = startOfMonth(subMonths(firstMonthDate, 1));
    const endDate = endOfMonth(new Date());

    while(loopDate <= endDate) {
        const monthKey = processDate(loopDate);
        if(!dataByMonth[monthKey]) {
            dataByMonth[monthKey] = {};
        }
        loopDate = addMonths(loopDate, 1);
    }

    const finalSortedMonths = Object.keys(dataByMonth).sort();

    let openingBalance = 0;
    const finalData: MonthlyFundsData[] = finalSortedMonths.map(monthKey => {
      const monthData = dataByMonth[monthKey];
      const income = monthData?.income || 0;
      const mainExpenses = monthData?.mainExpenses || 0;
      const netIncome = income - mainExpenses;
      const fundsIn = netIncome > 0 ? netIncome * 0.10 : 0;
      const fundsOut = monthData?.fundsOut || 0;
      const closingBalance = openingBalance + fundsIn - fundsOut;

      const [year, monthNum] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, monthNum - 1);
      
      const result: MonthlyFundsData = {
        month: format(monthDate, 'MMMM yyyy'),
        year,
        monthDate,
        income,
        mainExpenses,
        netIncome,
        fundsIn,
        fundsOut,
        openingBalance,
        closingBalance,
      };
      
      openingBalance = closingBalance;
      return result;
    });

    return finalData.reverse(); // Show most recent first
  }, [payments, expenses, companyFundsExpenses]);

  const handleOpenForm = (expense?: CompanyFundsExpense) => {
    setEditingExpense(expense || null);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteCompanyFundsExpense(expenseToDelete.id);
      toast({ title: "Expense Deleted" });
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <PiggyBank className="mr-3 h-8 w-8 text-primary" />
          Company Funds
        </h1>
        <p className="text-muted-foreground">Monthly breakdown of company fund contributions and expenses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Funds Summary</CardTitle>
          <CardDescription>10% of monthly net income is allocated to the company fund.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Total Income</TableHead>
                <TableHead className="text-right">Main Expenses</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
                <TableHead className="text-right">Funds In (10%)</TableHead>
                <TableHead className="text-right">Funds Out</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyFundsData.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(row.income)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(row.mainExpenses)}</TableCell>
                  <TableCell className={cn("text-right font-semibold", row.netIncome >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(row.netIncome)}</TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(row.fundsIn)}</TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">{formatCurrency(row.fundsOut)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(row.closingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Company Fund Expenses</CardTitle>
                <CardDescription>All expenses paid from the company fund.</CardDescription>
              </div>
              <Button onClick={() => handleOpenForm()}>
                  <PlusCircle className="mr-2 h-4 w-4"/>
                  Add Expense
              </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (₱)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyFundsExpenses.length > 0 ? (
                companyFundsExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), 'PP')}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(expense)}>
                        <Edit className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(expense)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No company fund expenses recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CompanyFundsExpenseForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} expense={editingExpense}/>
      
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense "{expenseToDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
