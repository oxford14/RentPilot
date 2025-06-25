
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateReminder } from '@/ai/flows/generate-reminder-flow';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay } from 'date-fns';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function ReminderDialog({ isOpen, onClose, tenant }: ReminderDialogProps) {
  const { toast } = useToast();
  const { payments, additionalDues, clients } = useAppContext();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [amountDue, setAmountDue] = useState(0);

  useEffect(() => {
    if (isOpen && tenant) {
      const fetchReminder = async () => {
        setIsLoading(true);
        setReminderMessage('');
        try {
          const today = startOfDay(new Date());
          const balance = calculateTenantBalance(tenant, payments, additionalDues, today);
          setAmountDue(balance);

          if (balance <= 0) {
            setReminderMessage("This tenant has no outstanding balance. A reminder is not necessary.");
            setIsLoading(false);
            return;
          }

          const client = user?.clientId ? clients.find(c => c.id === user.clientId) : null;
          const landlordName = client?.name || "your landlord";

          const result = await generateReminder({
            tenantName: tenant.name.split(' ')[0], // Use first name
            amountDue: balance,
            landlordOrBusinessName: landlordName,
          });
          setReminderMessage(result.reminderMessage);
        } catch (error: any) {
          console.error('Failed to generate reminder:', error);
          toast({
            variant: 'destructive',
            title: 'Failed to generate message',
            description: error.message || 'An AI error occurred.',
          });
          setReminderMessage('Could not generate reminder. Please try again or write one manually.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchReminder();
    }
  }, [isOpen, tenant, payments, additionalDues, clients, user?.clientId, toast]);

  const handleSendReminder = () => {
    console.log("--- SIMULATED SMS REMINDER ---");
    console.log(`To: ${tenant?.phone} (${tenant?.name})`);
    console.log(`Message: ${reminderMessage}`);
    console.log("------------------------------");

    toast({
      title: "Reminder Sent (Simulation)",
      description: `A reminder text has been logged to the console for ${tenant?.name}.`,
    });
    onClose();
  };
  
  const canSend = !isLoading && amountDue > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Rent Reminder</DialogTitle>
          <DialogDescription>
            Review the AI-generated message below and send it to {tenant?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-message">Reminder Message</Label>
            {isLoading ? (
              <div className="flex items-center justify-center h-24 border rounded-md bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Generating message...</p>
              </div>
            ) : (
              <Textarea
                id="reminder-message"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={5}
                readOnly={amountDue <= 0}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSendReminder} disabled={!canSend}>
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? 'Please wait' : 'Send Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
