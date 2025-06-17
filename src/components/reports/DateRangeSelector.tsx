
"use client";

import React, { useState } from "react";
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
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  React.useEffect(() => {
    onDateChange(date);
  }, [date, onDateChange]);
  
  const handlePresetChange = (value: string) => {
    const today = new Date();
    let newDate: DateRange | undefined;
    switch (value) {
      case "today":
        newDate = { from: today, to: today };
        break;
      case "yesterday":
        const yesterday = addDays(today, -1);
        newDate = { from: yesterday, to: yesterday };
        break;
      case "this_week":
        newDate = { from: addDays(today, -today.getDay()), to: addDays(today, 6 - today.getDay()) };
        break;
      case "last_week":
        const prevWeekStart = addDays(today, -today.getDay() - 7);
        const prevWeekEnd = addDays(today, -today.getDay() - 1);
        newDate = { from: prevWeekStart, to: prevWeekEnd };
        break;
      case "this_month":
        newDate = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case "last_month":
        const prevMonth = subMonths(today, 1);
        newDate = { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
        break;
      default:
        newDate = undefined;
    }
    setDate(newDate);
  };


  return (
    <div className={cn("grid gap-2 md:flex md:items-center md:gap-4", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
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
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <Select onValueChange={handlePresetChange} defaultValue="this_month">
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
