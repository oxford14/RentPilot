
"use client";

import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, CheckCircle, Clock, FileWarning, ListChecks } from 'lucide-react';
import type { AdditionalDue } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdditionalDuesTableProps {
  tenantId: string;
  onEdit: (due: AdditionalDue) => void;
  onDelete: (dueId: string) => void;
  onUpdateStatus: (due: AdditionalDue) => void;
}

export function AdditionalDuesTable({ tenantId, onEdit, onDelete, onUpdateStatus }: AdditionalDuesTableProps) {
  const { additionalDues } = useAppContext();
  const { toast } = useToast();
  const [dueToDelete, setDueToDelete] = useState<AdditionalDue | null>(null);

  const filteredDues = useMemo(() => {
    return additionalDues
      .filter(due => due.tenantId === tenantId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [additionalDues, tenantId]);
  
  const handleMarkAsPaid = (due: AdditionalDue) => {
    onUpdateStatus({ ...due, status: 'paid' });
    toast({ title: "Status Updated", description: "The due has been marked as paid."});
  };

  const handleConfirmDelete = () => {
    if (dueToDelete) {
      onDelete(dueToDelete.id);
      toast({ title: "Due Deleted", description: "The charge has been permanently deleted." });
      setDueToDelete(null);
    }
  };

  if (!filteredDues.length) {
     return (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            <ListChecks className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p className="text-lg font-medium">No Additional Dues Found</p>
            <p className="text-sm">This tenant has no extra charges recorded. Click "Add New Charge" to begin.</p>
        </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount (₱)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDues.map((due) => (
              <TableRow key={due.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>{format(new Date(due.dueDate), "PP")}</TableCell>
                <TableCell className="font-medium">{due.type}</TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  <Tooltip>
                    <TooltipTrigger>
                        <p>{due.notes || '-'}</p>
                    </TooltipTrigger>
                    {due.notes && <TooltipContent>{due.notes}</TooltipContent>}
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">{due.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={due.status === 'paid' ? 'default' : 'destructive'} className={due.status === 'paid' ? 'bg-green-500/20 text-green-700 border-green-400' : 'bg-yellow-500/20 text-yellow-700 border-yellow-400'}>
                    {due.status === 'paid' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                    {due.status.charAt(0).toUpperCase() + due.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {due.status === 'unpaid' && (
                        <DropdownMenuItem onClick={() => handleMarkAsPaid(due)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(due)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDueToDelete(due)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!dueToDelete} onOpenChange={(isOpen) => !isOpen && setDueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the charge of ₱{dueToDelete?.amount.toFixed(2)} for {dueToDelete?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
