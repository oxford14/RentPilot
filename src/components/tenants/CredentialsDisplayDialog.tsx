
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, ClipboardCopy } from 'lucide-react';

interface CredentialsDisplayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  password?: string;
  clientName: string;
}

export function CredentialsDisplayDialog({ isOpen, onClose, username, password, clientName }: CredentialsDisplayDialogProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = React.useState<'username' | 'password' | 'all' | null>(null);

  const handleCopy = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!", description: `${field.charAt(0).toUpperCase() + field.slice(1)} copied to clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!password) return;
    const loginUrl = `https://rent-pilot.net/login`;
    const fullMessage = `
Welcome from ${clientName}!

You can log in to your tenant portal here: ${loginUrl}
Username: ${username}
Temporary Password: ${password}

You will be required to change your password on your first login.

Powered by Rent-Pilot
    `.trim().replace(/^\s+/gm, '');

    navigator.clipboard.writeText(fullMessage);
    setCopiedField('all');
    toast({ title: "Copied All Info!", description: `Login details have been copied to the clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tenant Account Credentials</DialogTitle>
          <DialogDescription>
            Please provide these temporary credentials to the tenant. They will be required to change their password upon first login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <Input id="username" value={username} readOnly />
              <Button size="icon" variant="outline" onClick={() => handleCopy(username, 'username')}>
                {copiedField === 'username' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {password && (
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input id="password" value={password} readOnly />
                 <Button size="icon" variant="outline" onClick={() => handleCopy(password, 'password')}>
                    {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                 </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
            <Button variant="secondary" onClick={handleCopyAll} disabled={!password}>
                {copiedField === 'all' ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                {copiedField === 'all' ? 'Copied!' : 'Copy All Info'}
            </Button>
            <DialogClose asChild>
                <Button type="button">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
