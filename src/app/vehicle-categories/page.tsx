"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import type { VehicleCategory } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Tags } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function VehicleCategoriesPage() {
  const {
    activeClient,
    vehicleCategories,
    addVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
  } = useAppContext();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<VehicleCategory | null>(null);

  if (activeClient && activeClient.businessType !== 'Vehicle_Rental') {
    return (
      <div className="container mx-auto py-12 text-center">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>Feature Unavailable</CardTitle>
            <CardDescription>
              Vehicle categories are exclusive to Vehicle Rental businesses.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (category: VehicleCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = editingCategory
        ? await updateVehicleCategory({ ...editingCategory, name })
        : await addVehicleCategory(name);
      if (result.success) {
        setDialogOpen(false);
        setName('');
        setEditingCategory(null);
      } else if (result.message) {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const result = await deleteVehicleCategory(categoryToDelete.id);
    if (!result.success && result.message) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setCategoryToDelete(null);
  };

  return (
    <div className="container mx-auto py-2 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary shrink-0" />
            Vehicle Categories
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage fleet types like Sedan, SUV, and 7-Seater. Each vehicle must belong to a category.
          </p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto h-11">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Category
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-headline">Categories</CardTitle>
          <CardDescription>
            Common types are created automatically. Add custom categories for your fleet as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vehicleCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <Tags className="mx-auto h-12 w-12 opacity-20" />
              <p>No categories yet. They will appear shortly, or add one manually.</p>
              <Button variant="outline" onClick={openAdd}>
                Add Category
              </Button>
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {vehicleCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <span className="font-medium">{category.name}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(category)} aria-label="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCategoryToDelete(category)}
                      aria-label="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Assign categories when adding vehicles in{' '}
            <Link href="/vehicles" className="text-primary underline">
              Fleet Management
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="e.g. Compact SUV"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{categoryToDelete?.name}&quot;? This cannot be undone if no vehicles use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
