
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import type { Expense } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Filter, ListX, Wallet } from 'lucide-react';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector'; 
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { useToast } from '@/hooks/use-toast';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

export default function ExpensesPage() {
  const { expenses, deleteExpense } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOpenForm = (expense?: Expense) => {
    setEditingExpense(expense || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingExpense(null);
    setIsFormOpen(false);
  };

  const confirmDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const handleDeleteExpenseAction = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete.id);
      toast({ title: "Expense Deleted", description: `Expense "${expenseToDelete.description}" has been deleted.` });
      setExpenseToDelete(null);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!isClient) return []; // Don't filter on server or before client hydration
    let dataToFilter = [...expenses];
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); 
      
      dataToFilter = dataToFilter.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= fromDate && expenseDate <= toDate;
      });
    }
    return dataToFilter.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, dateRange, isClient]);

  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Wallet className="mr-3 h-8 w-8 text-primary" />
            Manage Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage all your operational expenses.</p>
        </div>
        <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Expense
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5 text-primary" />
            Filter Expenses
          </CardTitle>
          <CardDescription>Select a date range to view expenses for a specific period.</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeSelector onDateChange={setDateRange} />
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex justify-between items-center">
            <div>
                <CardTitle>Expense List</CardTitle>
                <CardDescription>
                Displaying {filteredExpenses.length} expense(s) totaling ₱{totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {dateRange?.from && dateRange.to ? ` from ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}` : ''}.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length > 0 ? (
            <ScrollArea className="max-h-[500px] overflow-y-auto">
              <div className="rounded-lg border shadow-sm bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount (₱)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenForm(expense)} title="Edit Expense">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => confirmDeleteExpense(expense)} title="Delete Expense">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <ListX className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg">No expenses found for the selected period.</p>
              <p className="text-sm">Try adjusting the date range or add new expenses.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <ExpenseForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          expense={editingExpense}
        />
      )}

      <AlertDialog open={!!expenseToDelete} onOpenChange={(isOpen) => { if (!isOpen) setExpenseToDelete(null); }}>
        {expenseToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the expense: "{expenseToDelete.description}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteExpenseAction}>Delete Expense</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
