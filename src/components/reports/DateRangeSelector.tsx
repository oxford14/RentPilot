
"use client";

import React, { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateRangeSelectorProps {
  onDateChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeSelector({ onDateChange, className }: DateRangeSelectorProps) {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<string>("this_month");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Don't run on server or first client render before setIsClient(true)

    const today = new Date();
    let newDateRange: DateRange | undefined;
    switch (selectedPreset) {
      case "today":
        newDateRange = { from: today, to: today };
        break;
      case "yesterday":
        const yesterday = addDays(today, -1);
        newDateRange = { from: yesterday, to: yesterday };
        break;
      case "this_week":
        newDateRange = { from: addDays(today, -today.getDay()), to: addDays(today, 6 - today.getDay()) };
        break;
      case "last_week":
        const prevWeekStart = addDays(today, -today.getDay() - 7);
        const prevWeekEnd = addDays(today, -today.getDay() - 1);
        newDateRange = { from: prevWeekStart, to: prevWeekEnd };
        break;
      case "this_month":
        newDateRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case "last_month":
        const prevMonth = subMonths(today, 1);
        newDateRange = { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
        break;
      default:
        newDateRange = undefined; // Or keep current 'date' if no preset matches
    }
    setDate(newDateRange);
    onDateChange(newDateRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset, isClient]); // onDateChange removed to prevent loop if parent re-creates it

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
  };
  
  const displayDate = date; // Use state `date` which is updated by useEffect

  return (
    <div className={cn("grid gap-2 md:flex md:items-center md:gap-4", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[300px] justify-start text-left font-normal",
              !displayDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {isClient && displayDate?.from ? (
              displayDate.to ? (
                <>
                  {format(displayDate.from, "LLL dd, y")} -{" "}
                  {format(displayDate.to, "LLL dd, y")}
                </>
              ) : (
                format(displayDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={displayDate?.from}
            selected={displayDate}
            onSelect={(newRange) => {
              setDate(newRange);
              onDateChange(newRange);
              // If a custom range is selected, we might want to clear the preset or set it to a "custom" value
              // For now, let's assume selecting a date clears the preset concept for the next manual preset selection
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <Select onValueChange={handlePresetChange} value={selectedPreset}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Select preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
