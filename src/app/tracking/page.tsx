
"use client";

import React, { useState, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, PlusCircle, CalendarIcon, TrendingUp, PiggyBank, HandCoins, ArrowDownRight, Wallet, Edit, Trash2 } from 'lucide-react';
import { format, previousFriday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WeeklyIncome, Business } from '@/lib/types';
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

export default function TrackingPage() {
  const { businesses, weeklyIncomes, addBusiness, updateBusiness, deleteBusiness, addWeeklyIncome } = useAppContext();
  const { toast } = useToast();

  const [isBusinessFormOpen, setIsBusinessFormOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  
  const [weeklyIncomeInput, setWeeklyIncomeInput] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<Date | undefined>(() => {
    const today = new Date();
    return today.getDay() === 5 ? today : previousFriday(today);
  });
  
  const [latestBreakdown, setLatestBreakdown] = useState<WeeklyIncome | null>(null);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);

  const [editedBusinessName, setEditedBusinessName] = useState('');

  const selectedBusiness = useMemo(() => {
    if (!selectedBusinessId) return null;
    return businesses.find(b => b.id === selectedBusinessId) || null;
  }, [selectedBusinessId, businesses]);
  
  const incomeHistory = useMemo(() => {
    if (!selectedBusinessId) return [];
    return weeklyIncomes
      .filter(wi => wi.businessId === selectedBusinessId)
      .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime());
  }, [selectedBusinessId, weeklyIncomes]);

  const handleAddBusiness = async () => {
    if (newBusinessName.trim().length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Business name must be at least 2 characters.' });
      return;
    }
    await addBusiness(newBusinessName.trim());
    setNewBusinessName('');
    setIsBusinessFormOpen(false);
  };
  
  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setLatestBreakdown(null);
    setWeeklyIncomeInput('');
  }

  const handleCalculate = async () => {
    const income = parseFloat(weeklyIncomeInput);
    if (isNaN(income) || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid positive income amount.' });
      return;
    }
    if (!selectedBusinessId) {
      toast({ variant: 'destructive', title: 'No Business Selected', description: 'Please select a business first.' });
      return;
    }
    if (!selectedWeek) {
      toast({ variant: 'destructive', title: 'No Week Selected', description: 'Please select a week (Friday).' });
      return;
    }
    
    const existingEntry = incomeHistory.find(entry => format(new Date(entry.weekOf), 'yyyy-MM-dd') === format(selectedWeek, 'yyyy-MM-dd'));
    if (existingEntry) {
        toast({ variant: 'destructive', title: 'Entry Exists', description: `An income entry for this business on ${format(selectedWeek, 'PPP')} already exists.`});
        return;
    }

    await addWeeklyIncome(selectedBusinessId, income, selectedWeek);
    
    const roi = income * 0.5;
    const remainingForExpenses = income - roi;
    const tithes = remainingForExpenses * 0.1;
    const savings = remainingForExpenses * 0.2;
    const remainingMoney = remainingForExpenses - tithes - savings;
    
    setLatestBreakdown({
        id: 'temp',
        businessId: selectedBusinessId,
        clientId: '', 
        weekOf: selectedWeek.toISOString(),
        income: income,
        breakdown: { roi, remainingForExpenses, tithes, savings, remainingMoney }
    });
    setWeeklyIncomeInput('');
  };
  
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const handleOpenEditForm = (business: Business) => {
    setBusinessToEdit(business);
    setEditedBusinessName(business.name);
    setIsEditFormOpen(true);
  };

  const handleUpdateBusiness = async () => {
    if (!businessToEdit || editedBusinessName.trim().length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Business name must be at least 2 characters.' });
      return;
    }
    await updateBusiness({ ...businessToEdit, name: editedBusinessName.trim() });
    setIsEditFormOpen(false);
    setBusinessToEdit(null);
  };

  const handleOpenDeleteConfirm = (business: Business) => {
    setBusinessToDelete(business);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteBusiness = async () => {
    if (!businessToDelete) return;
    await deleteBusiness(businessToDelete.id);
    setSelectedBusinessId(null);
    setIsDeleteConfirmOpen(false);
    setBusinessToDelete(null);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Briefcase className="mr-3 h-8 w-8 text-primary" />
            Business Tracker
          </h1>
          <p className="text-muted-foreground">Track weekly income and expense allocations for your businesses.</p>
        </div>
        <Button onClick={() => setIsBusinessFormOpen(true)} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Business
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Select Business</CardTitle>
          <CardDescription>Choose a business to manage its weekly income.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-2 items-center">
            <Select onValueChange={handleSelectBusiness} value={selectedBusinessId || ''}>
                <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a business..." />
                </SelectTrigger>
                <SelectContent>
                {businesses.map(business => (
                    <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={() => selectedBusiness && handleOpenEditForm(selectedBusiness)} disabled={!selectedBusinessId} className="w-full sm:w-auto">
                    <Edit className="h-4 w-4"/>
                    <span className="sr-only">Edit Business</span>
                </Button>
                <Button variant="destructive" size="icon" onClick={() => selectedBusiness && handleOpenDeleteConfirm(selectedBusiness)} disabled={!selectedBusinessId} className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4"/>
                    <span className="sr-only">Delete Business</span>
                </Button>
            </div>
          </div>
        </CardHeader>
        {selectedBusiness && (
          <CardContent className="space-y-6 border-t pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Enter Weekly Income for {selectedBusiness.name}</CardTitle>
                <CardDescription>Enter the total income for the selected week (Friday).</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto flex-grow">
                  <Label htmlFor="weekly-income">Total Income (Friday)</Label>
                  <Input id="weekly-income" type="number" placeholder="Enter total income" value={weeklyIncomeInput} onChange={e => setWeeklyIncomeInput(e.target.value)} />
                </div>
                <div className="w-full md:w-auto">
                  <Label>Week Of (Friday)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedWeek && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedWeek ? format(selectedWeek, "PPP") : <span>Pick a Friday</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedWeek} onSelect={setSelectedWeek} disabled={(date) => date.getDay() !== 5} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleCalculate} className="w-full md:w-auto">Calculate & Save</Button>
              </CardContent>
            </Card>
            
            {latestBreakdown && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>Breakdown for {format(new Date(latestBreakdown.weekOf), 'PPP')}</CardTitle>
                  <CardDescription>Based on a total income of {formatCurrency(latestBreakdown.income)}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <BreakdownItem icon={TrendingUp} label="ROI (50%)" value={formatCurrency(latestBreakdown.breakdown.roi)} color="text-blue-500" />
                  <BreakdownItem icon={Wallet} label="For Expenses" value={formatCurrency(latestBreakdown.breakdown.remainingForExpenses)} color="text-orange-500" />
                  <BreakdownItem icon={HandCoins} label="Tithes (10%)" value={formatCurrency(latestBreakdown.breakdown.tithes)} color="text-green-500" />
                  <BreakdownItem icon={PiggyBank} label="Savings (20%)" value={formatCurrency(latestBreakdown.breakdown.savings)} color="text-purple-500" />
                  <BreakdownItem icon={ArrowDownRight} label="Remaining" value={formatCurrency(latestBreakdown.breakdown.remainingMoney)} color="text-red-500" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Income History for {selectedBusiness.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week Of (Friday)</TableHead>
                      <TableHead className="text-right">Total Income</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Tithes</TableHead>
                      <TableHead className="text-right">Savings</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeHistory.length > 0 ? incomeHistory.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.weekOf), 'PPP')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.income)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.breakdown.roi)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.breakdown.tithes)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.breakdown.savings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.breakdown.remainingMoney)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={6} className="text-center">No income history for this business.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>
      
      <Dialog open={isBusinessFormOpen} onOpenChange={setIsBusinessFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="business-name">Business Name</Label>
            <Input id="business-name" value={newBusinessName} onChange={e => setNewBusinessName(e.target.value)} placeholder="Enter business name" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddBusiness}>Add Business</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Business Dialog */}
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="edit-business-name">Business Name</Label>
            <Input id="edit-business-name" value={editedBusinessName} onChange={e => setEditedBusinessName(e.target.value)} placeholder="Enter new business name" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateBusiness}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Business Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        {businessToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the business "{businessToDelete.name}" and all of its associated weekly income history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBusiness} className={cn(buttonVariants({ variant: "destructive" }))}>Delete Business</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

function BreakdownItem({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string, color: string }) {
  return (
    <div className="p-3 rounded-lg bg-background flex items-center gap-3">
      <Icon className={cn("h-7 w-7", color)} />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-lg">{value}</p>
      </div>
    </div>
  )
}
