"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Wallet, CalendarClock, MessageCircle } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateReminder } from '@/ai/flows/generate-reminder-flow';
import { generateUpcomingDueDateReminder } from '@/ai/flows/generate-upcoming-reminder-flow';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay, format } from 'date-fns';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function ReminderDialog({ isOpen, onClose, tenant }: ReminderDialogProps) {
  const { toast } = useToast();
  const { payments, additionalDues, clients } = useAppContext();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('balance');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { balance, nextDueDate } = useMemo(() => {
    if (!tenant) return { balance: 0, nextDueDate: null };

    const today = startOfDay(new Date());
    const balance = calculateTenantBalance(tenant, payments, additionalDues, today);

    const getAnniversaryForMonth = (tenant: Tenant, refDate: Date): Date => {
        const joinDate = new Date(tenant.joinDate);
        const joinDay = joinDate.getUTCDate();
        const refYear = refDate.getUTCFullYear();
        const refMonth = refDate.getUTCMonth();
        
        const lastDayInMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
        const anniversaryDay = Math.min(joinDay, lastDayInMonth);
        
        return new Date(Date.UTC(refYear, refMonth, anniversaryDay));
    };

    const anniversaryThisMonth = getAnniversaryForMonth(tenant, today);
    let nextDueDate;
    if (anniversaryThisMonth > today) {
      nextDueDate = anniversaryThisMonth;
    } else {
      const nextMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
      nextDueDate = getAnniversaryForMonth(tenant, nextMonthDate);
    }
    
    return { balance, nextDueDate };
  }, [tenant, payments, additionalDues]);
  
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setActiveTab('balance');
    }
  }, [isOpen]);

  const handleGenerateBalanceReminder = async () => {
    if (!tenant) return;
    setIsLoading(true);
    setMessage('');
    try {
      if (balance <= 0) {
        setMessage("This tenant has no outstanding balance. A reminder is not necessary.");
        return;
      }
      const client = user?.clientId ? clients.find(c => c.id === user.clientId) : null;
      const landlordName = client?.name || "your landlord";
      const result = await generateReminder({
        tenantName: tenant.name.split(' ')[0],
        amountDue: balance,
        landlordOrBusinessName: landlordName,
      });
      setMessage(result.reminderMessage);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to generate message', description: error.message || 'An AI error occurred.' });
      setMessage('Could not generate reminder. Please try again or write one manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateUpcomingReminder = async () => {
    if (!tenant || !nextDueDate) return;
    setIsLoading(true);
    setMessage('');
    try {
      const client = user?.clientId ? clients.find(c => c.id === user.clientId) : null;
      const landlordName = client?.name || "your landlord";
      const result = await generateUpcomingDueDateReminder({
        tenantName: tenant.name.split(' ')[0],
        dueDate: format(nextDueDate, 'MMMM do'),
        landlordOrBusinessName: landlordName,
      });
      setMessage(result.reminderMessage);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to generate message', description: error.message || 'An AI error occurred.' });
      setMessage('Could not generate reminder. Please try again or write one manually.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendReminder = () => {
    console.log("--- SIMULATED SMS REMINDER ---");
    console.log(`To: ${tenant?.phone} (${tenant?.name})`);
    console.log(`Message: ${message}`);
    console.log("------------------------------");

    toast({
      title: "Reminder Sent (Simulation)",
      description: `A reminder text has been logged to the console for ${tenant?.name}.`,
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Reminder to {tenant?.name}</DialogTitle>
          <DialogDescription>
            Choose a reminder type, generate a message, and send it to the tenant.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => {setActiveTab(value); setMessage('');}} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="balance">Balance Due</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="balance" className="py-4 space-y-2">
                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><Wallet className="h-4 w-4"/>Outstanding Balance:</span>
                    <span className="font-bold">{`₱${balance > 0 ? balance.toFixed(2) : '0.00'}`}</span>
                </div>
                <Button onClick={handleGenerateBalanceReminder} disabled={isLoading || balance <= 0} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Generate Balance Reminder
                </Button>
            </TabsContent>
            <TabsContent value="upcoming" className="py-4 space-y-2">
                 <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4"/>Next Due Date:</span>
                    <span className="font-bold">{nextDueDate ? format(nextDueDate, 'PPP') : 'N/A'}</span>
                </div>
                <Button onClick={handleGenerateUpcomingReminder} disabled={isLoading || !nextDueDate} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Generate Upcoming Reminder
                </Button>
            </TabsContent>
            <TabsContent value="custom" className="py-4 space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4"/>
                    Write a custom message below to send to the tenant.
                </p>
            </TabsContent>
        </Tabs>
        
        <div className="space-y-2">
          <Label htmlFor="reminder-message">Message Preview</Label>
          <Textarea
            id="reminder-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={activeTab === 'custom' ? 'Type your custom message here...' : 'Generated message will appear here...'}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSendReminder} disabled={!message}>
            <Send className="mr-2 h-4 w-4" />
            Send Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
