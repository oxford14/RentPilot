

"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Briefcase, PlusCircle, CalendarIcon, Edit, Trash2, Settings, List, Wallet } from 'lucide-react';
import { format, lastDayOfMonth, getDate } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WeeklyIncome, Business, BreakdownRule } from '@/lib/types';
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
import { BusinessConfigForm } from '@/components/tracking/BusinessConfigForm';
import { ManualInputDialog } from '@/components/tracking/ManualInputDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function TrackingPage() {
  const { businesses, weeklyIncomes, addBusiness, updateBusiness, deleteBusiness, addWeeklyIncome, deleteWeeklyIncome, clients, viewingAsClientId } = useAppContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [isBusinessFormOpen, setIsBusinessFormOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  
  const [weeklyIncomeInput, setWeeklyIncomeInput] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [latestBreakdown, setLatestBreakdown] = useState<Omit<WeeklyIncome, 'id'|'clientId'> | null>(null);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  
  const [incomeToDelete, setIncomeToDelete] = useState<WeeklyIncome | null>(null);

  const [editedBusinessName, setEditedBusinessName] = useState('');
  
  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);
  
  const [isManualInputDialogOpen, setIsManualInputDialogOpen] = useState(false);
  const [manualInputData, setManualInputData] = useState<{
    rules: BreakdownRule[];
    totalIncome: number;
    week: Date;
    business: Business;
  } | null>(null);

  const currentClient = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [clients, user, viewingAsClientId]);

  useEffect(() => {
    if (currentClient && currentClient.name !== "D' First Hub") {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'This feature is only available for D\' First Hub.' });
      router.push('/');
    }
  }, [currentClient, router, toast]);

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

  const performFullCalculation = async (totalIncome: number, business: Business, week: Date, manualValues: Record<string, number>) => {
    let remainingAmount = totalIncome;
    const breakdown: { [key: string]: number } = {};
    const config = business.breakdownConfig || [];

    for (const rule of config) {
      if (remainingAmount <= 0) break;
      let deduction = 0;
      if (rule.type === 'percentage') {
        deduction = remainingAmount * (rule.value / 100);
      } else if (rule.type === 'fixed') {
        deduction = rule.value;
      } else if (rule.type === 'manual_input') {
        deduction = manualValues[rule.name] || 0;
      }
      
      deduction = Math.min(deduction, remainingAmount);
      
      breakdown[rule.name] = (breakdown[rule.name] || 0) + deduction;
      remainingAmount -= deduction;
    }

    const incomeEntry: Omit<WeeklyIncome, 'id' | 'clientId'> = {
      businessId: business.id,
      weekOf: week.toISOString(),
      income: totalIncome,
      breakdown,
      remainingMoney: remainingAmount,
    };
    
    await addWeeklyIncome(incomeEntry);
    
    setLatestBreakdown(incomeEntry);
    setWeeklyIncomeInput('');
  };

  const handleCalculate = async () => {
    const income = parseFloat(weeklyIncomeInput);
    if (isNaN(income) || income <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Income', description: 'Please enter a valid positive income amount.' });
      return;
    }
    if (!selectedBusiness) {
      toast({ variant: 'destructive', title: 'No Business Selected', description: 'Please select a business first.' });
      return;
    }
    if (!selectedDate) {
      toast({ variant: 'destructive', title: 'No Date Selected', description: 'Please select a date for the income entry.' });
      return;
    }
    
    const existingEntry = incomeHistory.find(entry => format(new Date(entry.weekOf), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
    if (existingEntry) {
        toast({ variant: 'destructive', title: 'Entry Exists', description: `An income entry for this business on ${format(selectedDate, 'PPP')} already exists.`});
        return;
    }

    const manualRules = selectedBusiness.breakdownConfig?.filter(r => r.type === 'manual_input') || [];

    if (manualRules.length > 0) {
      setManualInputData({
        rules: manualRules,
        totalIncome: income,
        week: selectedDate,
        business: selectedBusiness,
      });
      setIsManualInputDialogOpen(true);
    } else {
      await performFullCalculation(income, selectedBusiness, selectedDate, {});
    }
  };

  const handleManualInputSubmit = async (manualValues: Record<string, number>) => {
    if (!manualInputData) return;
    
    await performFullCalculation(
      manualInputData.totalIncome,
      manualInputData.business,
      manualInputData.week,
      manualValues
    );
    
    setIsManualInputDialogOpen(false);
    setManualInputData(null);
  };
  
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₱--.--';
    }
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
  
  const handleUpdateBusinessConfig = (updatedBusiness: Business) => {
    updateBusiness(updatedBusiness);
  }

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
  
  const handleOpenIncomeDeleteConfirm = (incomeEntry: WeeklyIncome) => {
    setIncomeToDelete(incomeEntry);
  };
  
  const handleConfirmDeleteIncome = async () => {
    if (!incomeToDelete) return;
    await deleteWeeklyIncome(incomeToDelete.id);
    setIncomeToDelete(null);
  };

  const frequencyLabel = useMemo(() => {
    if (!selectedBusiness) return 'Income';
    const freq = selectedBusiness.trackingFrequency || 'weekly';
    if (freq === 'bi-monthly') return 'Bi-monthly';
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  }, [selectedBusiness]);

  const isDateDisabled = (date: Date): boolean => {
    if (!selectedBusiness) return false;
    const { trackingFrequency, weeklyDay, dayOfMonth } = selectedBusiness;
    
    if (trackingFrequency === 'weekly') {
      const targetDay = weeklyDay ?? 5;
      return date.getDay() !== targetDay;
    }
    
    if (trackingFrequency === 'monthly') {
        const targetDate = dayOfMonth ?? 1;
        const lastDayInMonth = getDate(lastDayOfMonth(date));
        const effectiveTargetDate = Math.min(targetDate, lastDayInMonth);
        return getDate(date) !== effectiveTargetDate;
    }

    if (trackingFrequency === 'bi-monthly') {
        const day = getDate(date);
        const lastDay = getDate(lastDayOfMonth(date));
        return day !== 15 && day !== lastDay;
    }

    return false;
  };

  if (currentClient && currentClient.name !== "D' First Hub") {
    return null; // Don't render content if redirection is about to happen
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Briefcase className="mr-3 h-8 w-8 text-primary" />
            Business Tracker
          </h1>
          <p className="text-muted-foreground">Track income and expense allocations for your businesses.</p>
        </div>
        <Button onClick={() => setIsBusinessFormOpen(true)} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Business
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Select Business</CardTitle>
          <CardDescription>Choose a business to manage its income and configuration.</CardDescription>
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
                <Button variant="outline" size="icon" onClick={() => selectedBusiness && setIsConfigFormOpen(true)} disabled={!selectedBusinessId} className="w-full sm:w-auto">
                    <Settings className="h-4 w-4"/>
                    <span className="sr-only">Configure Business</span>
                </Button>
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
                <CardTitle>Enter {frequencyLabel} Income for {selectedBusiness.name}</CardTitle>
                <CardDescription>Enter the total income for the selected date.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto flex-grow">
                  <Label htmlFor="weekly-income">Total Income</Label>
                  <Input id="weekly-income" type="number" placeholder="Enter total income" value={weeklyIncomeInput} onChange={e => setWeeklyIncomeInput(e.target.value)} />
                </div>
                <div className="w-full md:w-auto">
                  <Label>Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setIsCalendarOpen(false);
                        }}
                        disabled={isDateDisabled}
                        initialFocus
                      />
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
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(latestBreakdown.breakdown).map(([name, amount]) => (
                    <div key={name} className="p-3 rounded-lg bg-background flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-primary"/>
                        <div>
                            <p className="text-sm text-muted-foreground">{name}</p>
                            <p className="font-semibold text-lg">{formatCurrency(amount)}</p>
                        </div>
                    </div>
                  ))}
                   <div className="p-3 rounded-lg bg-background flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-green-500"/>
                        <div>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="font-semibold text-lg">{formatCurrency(latestBreakdown.remainingMoney)}</p>
                        </div>
                    </div>
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
                      <TableHead>Entry Date</TableHead>
                      <TableHead className="text-right">Total Income</TableHead>
                      <TableHead className="text-right">Remaining Money</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeHistory.length > 0 ? incomeHistory.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.weekOf), 'PPP')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.income)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.remainingMoney)}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                        <List className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Breakdown Details</h4>
                                            <p className="text-sm text-muted-foreground">
                                               For entry date {format(new Date(entry.weekOf), 'PPP')}
                                            </p>
                                        </div>
                                        <div className="grid gap-2 text-sm">
                                            {Object.entries(entry.breakdown).map(([key, value]) => (
                                                <div className="grid grid-cols-2 items-center gap-4" key={key}>
                                                    <span>{key}</span>
                                                    <span className="text-right font-semibold">{formatCurrency(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleOpenIncomeDeleteConfirm(entry)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center">No income history for this business.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>
      
      {isConfigFormOpen && selectedBusiness && (
        <BusinessConfigForm
          isOpen={isConfigFormOpen}
          onClose={() => setIsConfigFormOpen(false)}
          business={selectedBusiness}
          onSave={handleUpdateBusinessConfig}
        />
      )}
      
      {isManualInputDialogOpen && manualInputData && (
        <ManualInputDialog
          isOpen={isManualInputDialogOpen}
          onClose={() => setIsManualInputDialogOpen(false)}
          rules={manualInputData.rules}
          totalIncome={manualInputData.totalIncome}
          onSubmit={handleManualInputSubmit}
        />
      )}

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

      {/* Delete Income Entry Confirmation */}
      <AlertDialog open={!!incomeToDelete} onOpenChange={(isOpen) => !isOpen && setIncomeToDelete(null)}>
        {incomeToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the income entry for {selectedBusiness?.name} from {format(new Date(incomeToDelete.weekOf), 'PPP')}. This allows you to re-calculate for that date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteIncome} className={cn(buttonVariants({ variant: "destructive" }))}>Delete Entry</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

    </div>
  );
}
