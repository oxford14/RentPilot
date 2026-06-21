"use client";

import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant } from '@/lib/types';
import { Search, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenterSearchPanelProps {
  selectedRenter: Tenant | null;
  onSelectRenter: (renter: Tenant) => void;
  onRenterCreated: (renter: Tenant) => void;
}

export function RenterSearchPanel({
  selectedRenter,
  onSelectRenter,
  onRenterCreated,
}: RenterSearchPanelProps) {
  const { tenants, addTenant } = useAppContext();
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activeRenters = useMemo(
    () =>
      tenants
        .filter((t) => t.status === 'active')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tenants]
  );

  const filteredRenters = useMemo(() => {
    if (!search.trim()) return activeRenters;
    const q = search.toLowerCase();
    return activeRenters.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
    );
  }, [activeRenters, search]);

  const handleCreateRenter = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) return;
    setIsCreating(true);
    try {
      const joinDate = new Date().toISOString();
      const newId = await addTenant({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        monthlyRentalRate: 0,
        securityDeposit: 0,
        status: 'active',
        joinDate,
      });
      const created =
        (newId && tenants.find((t) => t.id === newId)) ||
        tenants.find((t) => t.email === newEmail.trim()) ||
        ({
          id: newId || 'new',
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          monthlyRentalRate: 0,
          rent_history: [],
          status: 'active' as const,
          joinDate,
        } satisfies Tenant);
      onRenterCreated(created);
      setShowNewForm(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {selectedRenter && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{selectedRenter.name}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedRenter.email}</p>
          </div>
          <Badge variant="secondary">Selected</Badge>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search renter by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      <ScrollArea className="h-40 rounded-lg border">
        <div className="p-1 space-y-1">
          {filteredRenters.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No renters found.</p>
          ) : (
            filteredRenters.map((renter) => (
              <button
                key={renter.id}
                type="button"
                onClick={() => onSelectRenter(renter)}
                className={cn(
                  'w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/70',
                  selectedRenter?.id === renter.id && 'bg-primary/10 ring-1 ring-primary/30'
                )}
              >
                <p className="font-medium text-sm">{renter.name}</p>
                <p className="text-xs text-muted-foreground">{renter.email} · {renter.phone}</p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {!showNewForm ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => setShowNewForm(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Renter
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
          <p className="text-sm font-medium">New Renter</p>
          <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11" />
          <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-11" />
          <Input placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-11" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={isCreating || !newName || !newEmail || !newPhone}
              onClick={handleCreateRenter}
            >
              Save Renter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
