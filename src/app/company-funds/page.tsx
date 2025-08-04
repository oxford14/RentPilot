

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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PiggyBank, PlusCircle, TrendingUp, TrendingDown, MinusCircle, Edit, Trash2, Banknote, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  const { payments, expenses, companyFundsExpenses, deleteCompanyFundsExpense, clients, viewingAsClientId } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyFundsExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<CompanyFundsExpense | null>(null);
  const [availableCompanyFunds, setAvailableCompanyFunds] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  
  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [clients, user, viewingAsClientId]);

  const monthlyFundsData = useMemo(() => {
    if (!client || client.name !== 'i-VirtuaTech' || !client.companyFundsStartDate) return [];

    const companyFundsStartDate = new Date(client.companyFundsStartDate);
    const dataByMonth: { [key: string]: Partial<MonthlyFundsData> & { fundsOut?: number, income?: number, mainExpenses?: number } } = {};
    const processDate = (date: Date) => format(date, 'yyyy-MM');

    // 1. Process all existing data, respecting the start date for each transaction type.
    payments.forEach(p => {
      const paymentDate = new Date(p.date);
      if (paymentDate < companyFundsStartDate) return;
      const monthKey = processDate(paymentDate);
      if (!dataByMonth[monthKey]) dataByMonth[monthKey] = {};
      dataByMonth[monthKey].income = (dataByMonth[monthKey].income || 0) + p.amount;
    });

    expenses.forEach(e => {
      const expenseDate = new Date(e.date);
      if (expenseDate < companyFundsStartDate) return;
      const monthKey = processDate(expenseDate);
      if (!dataByMonth[monthKey]) dataByMonth[monthKey] = {};
      dataByMonth[monthKey].mainExpenses = (dataByMonth[monthKey].mainExpenses || 0) + e.amount;
    });

    companyFundsExpenses.forEach(e => {
        const expenseDate = new Date(e.date);
        if (expenseDate < companyFundsStartDate) return;
        const monthKey = processDate(expenseDate);
        if (!dataByMonth[monthKey]) dataByMonth[monthKey] = {};
        dataByMonth[monthKey].fundsOut = (dataByMonth[monthKey].fundsOut || 0) + e.amount;
    });

    // 2. Determine the full range of months to display and create placeholders if needed.
    let loopDate = new Date(companyFundsStartDate);
    const endDate = endOfMonth(new Date());
    while(loopDate <= endDate) {
        const monthKey = processDate(loopDate);
        if(!dataByMonth[monthKey]) {
            dataByMonth[monthKey] = {}; 
        }
        loopDate = addMonths(loopDate, 1);
    }
    
    // 3. Sort the months and perform the final calculation.
    const finalSortedMonths = Object.keys(dataByMonth).sort();
    
    const startingBalance = client?.companyFundsStartingBalance || 0;
    let openingBalance = startingBalance;
    
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
      
      openingBalance = closingBalance; // The next month's opening balance is this month's closing
      return result;
    });
    
    if (finalData.length > 0) {
        setAvailableCompanyFunds(finalData[finalData.length - 1].closingBalance);
    } else {
        setAvailableCompanyFunds(startingBalance);
    }

    return finalData.reverse(); // Show most recent first
  }, [payments, expenses, companyFundsExpenses, client]);

  const expenseMonths = useMemo(() => {
    const months = new Set<string>();
    companyFundsExpenses.forEach(expense => {
      months.add(format(new Date(expense.date), 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [companyFundsExpenses]);

  const filteredCompanyExpenses = useMemo(() => {
    const sortedExpenses = [...companyFundsExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterMonth === 'all') {
      return sortedExpenses;
    }
    return sortedExpenses.filter(expense => format(new Date(expense.date), 'yyyy-MM') === filterMonth);
  }, [companyFundsExpenses, filterMonth]);


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

  if (!client || client.name !== 'i-VirtuaTech') {
    return (
      <div className="container mx-auto py-2">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This feature is exclusively for the i-VirtuaTech client.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div>
            <h1 className="text-3xl font-bold font-headline flex items-center">
            <PiggyBank className="mr-3 h-8 w-8 text-primary" />
            Company Funds
            </h1>
            <p className="text-muted-foreground">Monthly breakdown of company fund contributions and expenses.</p>
        </div>
      </div>
      
       <Card className="shadow-xl bg-gradient-to-r from-primary/80 to-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Available Company Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableCompanyFunds !== null ? (
            <p className="text-4xl font-bold tracking-tight">{formatCurrency(availableCompanyFunds)}</p>
          ) : (
            <Skeleton className="h-10 w-48 bg-white/30" />
          )}
          <p className="text-xs opacity-80 mt-1">This is the current running total of your company funds.</p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Monthly Funds Summary</CardTitle>
          <CardDescription>10% of monthly net income is allocated to the company fund, starting from {client.companyFundsStartDate ? format(new Date(client.companyFundsStartDate), 'MMMM yyyy') : 'the configured start date'}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
                <TableHead className="text-right">Funds In (10%)</TableHead>
                <TableHead className="text-right">Funds Out</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyFundsData.length > 0 ? (
                monthlyFundsData.map((row) => (
                    <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.openingBalance)}</TableCell>
                    <TableCell className={cn("text-right font-semibold", row.netIncome >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(row.netIncome)}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(row.fundsIn)}</TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">{formatCurrency(row.fundsOut)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(row.closingBalance)}</TableCell>
                    </TableRow>
                ))
               ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No financial data found for the tracking period.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Company Fund Expenses</CardTitle>
                <CardDescription>Expenses paid from the company fund.</CardDescription>
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    {expenseMonths.map(month => {
                      const [year, monthNum] = month.split('-').map(Number);
                      return (
                        <SelectItem key={month} value={month}>
                          {format(new Date(year, monthNum - 1), 'MMMM yyyy')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Expense
                </Button>
              </div>
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
              {filteredCompanyExpenses.length > 0 ? (
                filteredCompanyExpenses.map((expense) => (
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
                  <TableCell colSpan={4} className="text-center h-24">No company fund expenses recorded for this period.</TableCell>
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
