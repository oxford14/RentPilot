
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { Car, PlusCircle, Edit, Trash2, ShieldCheck, Wrench, Search, Info } from 'lucide-react';
import { VehicleForm } from '@/components/vehicles/VehicleForm';
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
import { Input } from '@/components/ui/input';

export default function VehiclesPage() {
  const { vehicles, deleteVehicle, tenants, activeClient } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const handleOpenForm = (vehicle?: any) => {
    setEditingVehicle(vehicle || null);
    setIsFormOpen(true);
  };

  const statusColors = {
    Available: 'bg-green-500/20 text-green-700 border-green-400',
    Rented: 'bg-blue-500/20 text-blue-700 border-blue-400',
    Maintenance: 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
  };

  const getAssignedRenter = (vehicleId: string) => {
    return tenants.find(t => t.vehicleId === vehicleId && t.status === 'active');
  };

  if (activeClient?.businessType !== 'Vehicle_Rental') {
    return <div className="p-8 text-center">This feature is exclusive to Vehicle Rental businesses.</div>;
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Car className="mr-3 h-8 w-8 text-primary" />
            Fleet Management
          </h1>
          <p className="text-muted-foreground">Manage your vehicles and their rental status.</p>
        </div>
        <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Vehicle
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by make, model, or plate number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Renter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => {
                  const renter = getAssignedRenter(vehicle.id);
                  return (
                    <TableRow key={vehicle.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </TableCell>
                      <TableCell>{vehicle.plateNumber}</TableCell>
                      <TableCell>₱{vehicle.dailyRate.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", statusColors[vehicle.status as keyof typeof statusColors])}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {renter ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{renter.name}</span>
                            <span className="text-xs text-muted-foreground">Ends: {renter.rentEndDate ? new Date(renter.rentEndDate).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(vehicle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setVehicleToDelete(vehicle)} disabled={!!renter}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No vehicles found in your fleet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isFormOpen && (
        <VehicleForm 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          vehicle={editingVehicle}
        />
      )}

      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {vehicleToDelete?.year} {vehicleToDelete?.make} {vehicleToDelete?.model} ({vehicleToDelete?.plateNumber}) from your fleet records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteVehicle(vehicleToDelete.id); setVehicleToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
