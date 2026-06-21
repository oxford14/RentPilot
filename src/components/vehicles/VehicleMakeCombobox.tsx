"use client";

import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { VEHICLE_MAKES } from '@/lib/vehicle-makes';

interface VehicleMakeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VehicleMakeCombobox({ value, onChange, disabled }: VehicleMakeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectMake = (make: string) => {
    onChange(make);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{value || 'Select make...'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search makes..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No make found. Select from the list only.</CommandEmpty>
            <CommandGroup>
              {VEHICLE_MAKES.map((make) => (
                <CommandItem
                  key={make}
                  value={make}
                  onSelect={() => selectMake(make)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toLowerCase() === make.toLowerCase() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {make}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
