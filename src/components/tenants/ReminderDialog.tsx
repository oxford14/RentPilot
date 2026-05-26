
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Wallet, CalendarClock } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay, format } from 'date-fns';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function ReminderDialog({ isOpen, onClose, tenant }: ReminderDialogProps) {
  const { toast } = useToast();
  const { addAnnouncement, payments, additionalDues, clients } = useAppContext();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('balance');
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const { balance, nextDueDate } = useMemo(() => {
    if (!tenant) return { balance: 0, nextDueDate: null };

    const today = startOfDay(new Date());
    const balance = calculateTenantBalance(tenant, payments, additionalDues, today);

    const getAnniversaryForMonth = (tenant: Tenant, refDate: Date): Date => {
        const joinDate = new Date(tenant.joinDate);
        const joinDay = tenant.monthlyDueDay || joinDate.getUTCDate();
        
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
      setCustomMessage('');
      // Set the default tab based on whether there's a balance or not
      setActiveTab(balance > 0 ? 'balance' : 'upcoming');
    }
  }, [isOpen, balance]);

  const sendReminder = async (message: string, title: string) => {
    setIsLoading(true);
    if (!tenant || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot send reminder without tenant or user context.' });
      setIsLoading(false);
      return;
    }
    
    if (!tenant.hasAccount || !tenant.username) {
        toast({ variant: 'destructive', title: 'Account Not Found', description: 'This tenant does not have an online account to receive notifications.' });
        setIsLoading(false);
        return;
    }
    
    if (!tenant.clientId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot send reminder to a tenant without an assigned client.' });
      setIsLoading(false);
      return;
    }

    try {
      await addAnnouncement({
        title: title,
        content: message,
        scope: tenant.clientId,
        audience: 'tenant',
        senderId: user.username,
        senderName: user.username,
        recipientId: tenant.id,
        recipientUsername: tenant.username,
        status: 'sent',
        isScheduled: false,
        scheduledAt: new Date().toISOString(),
      });

      toast({
        title: "Reminder Sent",
        description: `A notification has been sent to ${tenant.name}.`,
      });
    } catch (error) {
      console.error("Failed to send reminder announcement:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send",
        description: "There was an error sending the reminder.",
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  };
  
  const handleSendBalanceReminder = () => {
    if (!tenant || balance <= 0) return;
    const client = user?.clientId ? clients.find(c => c.id === user.clientId) : null;
    const landlordName = client?.name || "your landlord";
    const message = `Hi ${tenant.name.split(' ')[0]}, just a friendly reminder from ${landlordName} that you have an outstanding balance of ₱${balance.toFixed(2)}. Please let us know if you have any questions. Thank you!`;
    sendReminder(message, "Outstanding Balance Reminder");
  };

  const handleSendUpcomingReminder = () => {
    if (!tenant || !nextDueDate) return;
    const client = user?.clientId ? clients.find(c => c.id === user.clientId) : null;
    const landlordName = client?.name || "your landlord";
    const message = `Hi ${tenant.name.split(' ')[0]}, this is a friendly reminder from ${landlordName} that your next rent payment is due on ${format(nextDueDate, 'MMMM do')}. Thank you!`;
    sendReminder(message, "Upcoming Due Date Reminder");
  };

  const handleSendCustomReminder = () => {
    if (!customMessage.trim()) {
      toast({ variant: 'destructive', title: 'Empty Message', description: 'Cannot send an empty message.' });
      return;
    }
    sendReminder(customMessage, "A message from your landlord");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Reminder to {tenant?.name}</DialogTitle>
          <DialogDescription>
            Choose a reminder type to send to the tenant's notification inbox.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="balance">Balance Due</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="balance" className="py-4 space-y-4">
                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><Wallet className="h-4 w-4"/>Outstanding Balance:</span>
                    <span className="font-bold">{`₱${balance > 0 ? balance.toFixed(2) : '0.00'}`}</span>
                </div>
                <Button onClick={handleSendBalanceReminder} disabled={balance <= 0 || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Send Balance Reminder
                </Button>
            </TabsContent>
            <TabsContent value="upcoming" className="py-4 space-y-4">
                 <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4"/>Next Due Date:</span>
                    <span className="font-bold">{nextDueDate ? format(nextDueDate, 'PPP') : 'N/A'}</span>
                </div>
                <Button onClick={handleSendUpcomingReminder} disabled={!nextDueDate || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Send Upcoming Reminder
                </Button>
            </TabsContent>
            <TabsContent value="custom" className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="custom-reminder-message">Custom Message</Label>
                    <Textarea
                        id="custom-reminder-message"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={5}
                        placeholder={'Type your custom message here...'}
                    />
                </div>
                <Button onClick={handleSendCustomReminder} disabled={!customMessage.trim() || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Send Custom Message
                </Button>
            </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
