
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, FileText } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { ContractTemplate } from '@/lib/types';
import { ContractTemplateForm } from '@/components/contracts/ContractTemplateForm';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ContractsPage() {
  const { contractTemplates, deleteContractTemplate } = useAppContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  useEffect(() => {
    if (user && !user.isSuperAdmin && user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
      router.push('/');
    }
  }, [user, router, toast]);

  const handleOpenForm = (template?: ContractTemplate) => {
    setEditingTemplate(template || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(false);
  };

  const confirmDeleteTemplate = (template: ContractTemplate) => {
    setTemplateToDelete(template);
  };

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      deleteContractTemplate(templateToDelete.id);
      toast({ title: "Template Deleted", description: `Template "${templateToDelete.name}" has been deleted.` });
      setTemplateToDelete(null);
    }
  };
  
  if (user && !user.isSuperAdmin && user.role !== 'admin') {
    return <div className="container mx-auto py-2"><p>Access Denied.</p></div>;
  }

  return (
    <>
      <div className="container mx-auto py-2 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center">
              <FileText className="mr-3 h-8 w-8 text-primary" />
              Contract Templates
            </h1>
            <p className="text-muted-foreground">Manage reusable contract templates for digital signing.</p>
          </div>
          <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Template
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Global Templates</CardTitle>
            <CardDescription>These templates are available to all clients when generating a digital contract.</CardDescription>
          </CardHeader>
          <CardContent>
            {contractTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contractTemplates.map((template) => (
                  <Card key={template.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenForm(template)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDeleteTemplate(template)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No contract templates found. Add one to get started.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isFormOpen && (
        <ContractTemplateForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          template={editingTemplate}
        />
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        {templateToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the template "{templateToDelete.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTemplate}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}
