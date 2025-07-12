
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

const CustomCheckbox = React.forwardRef<
  HTMLDivElement,
  CustomCheckboxProps
>(({ id, label, checked, onCheckedChange, className }, ref) => {
  return (
    <div className={cn("checkbox-wrapper-42 flex items-center", className)} ref={ref}>
      <input 
        id={id} 
        type="checkbox" 
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <label className="cbx" htmlFor={id}></label>
      <label className="lbl" htmlFor={id}>{label}</label>
    </div>
  );
});
CustomCheckbox.displayName = "CustomCheckbox";

export { CustomCheckbox };
