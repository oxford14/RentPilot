
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Edit, Trash2, FileText } from 'lucide-react';
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
import { ContractTemplateForm } from '@/app/admin/contracts/ContractTemplateForm';
import type { ContractTemplate } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function ContractTemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  if (user?.isSuperAdmin) {
      router.push('/admin');
  }

  const { contractTemplates, deleteContractTemplate } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  const handleOpenForm = (template?: ContractTemplate) => {
    setEditingTemplate(template || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (templateToDelete) {
      deleteContractTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Contract Templates
          </h1>
          <p className="text-muted-foreground">Manage your digital contract templates.</p>
        </div>
        <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Template
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Your Templates</CardTitle>
          <CardDescription>
            These templates can be used to initiate digital contracts for your tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contractTemplates.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{format(new Date(template.createdAt), 'PPpp')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenForm(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setTemplateToDelete(template)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p>No contract templates found. Create one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <ContractTemplateForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          template={editingTemplate}
        />
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
