
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { Car, PlusCircle, Edit, Trash2, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
  formatShortDate,
  getVehicleAvailability,
  isBookingCompleted,
  vehicleDisplayStatusColors,
} from '@/lib/vehicle-booking-status';
import type { Vehicle } from '@/lib/types';

export default function VehiclesPage() {
  const { vehicles, deleteVehicle, tenants, vehicleBookings, vehicleCategories, activeClient } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const handleOpenForm = (vehicle?: Vehicle) => {
    setEditingVehicle(vehicle || null);
    setIsFormOpen(true);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    return vehicleCategories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';
  };

  const getActiveBookingInfo = (vehicleId: string) => {
    const openBookings = vehicleBookings
      .filter((b) => b.vehicleId === vehicleId && b.status !== 'cancelled' && !isBookingCompleted(b))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const booking = openBookings[0];
    if (!booking) return null;
    const renter = tenants.find((t) => t.id === booking.renterId);
    return { booking, renter };
  };

  if (activeClient && activeClient.businessType !== 'Vehicle_Rental') {
    return (
        <div className="container mx-auto py-12 text-center">
            <Card className="max-w-md mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle>Feature Unavailable</CardTitle>
                    <CardDescription>
                        This feature is exclusive to Vehicle Rental businesses. Your current business type is {activeClient?.businessType?.replace('_', ' ') || 'Standard'}.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center">
            <Car className="mr-3 h-8 w-8 text-primary shrink-0" />
            Fleet Management
          </h1>
          <p className="text-muted-foreground">Manage your vehicles and their rental status.</p>
        </div>
        <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto h-12">
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
              className="pl-10 h-11"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border shadow-sm overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="hidden sm:table-cell">Plate Number</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Current Renter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => {
                  const availability = getVehicleAvailability(vehicle, vehicleBookings);
                  const bookingInfo = getActiveBookingInfo(vehicle.id);
                  return (
                    <TableRow key={vehicle.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                          <p className="text-xs text-muted-foreground sm:hidden">{vehicle.plateNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{vehicle.plateNumber}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {getCategoryName(vehicle.categoryId)}
                        </Badge>
                      </TableCell>
                      <TableCell>₱{vehicle.dailyRate.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", vehicleDisplayStatusColors[availability.displayStatus])}>
                          {availability.displayStatus}
                        </Badge>
                        {availability.subtitle && (
                          <p className="text-[10px] text-muted-foreground mt-1 max-w-[140px] leading-tight">{availability.subtitle}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {bookingInfo?.renter ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{bookingInfo.renter.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatShortDate(bookingInfo.booking.startDate)} – {formatShortDate(bookingInfo.booking.endDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(vehicle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setVehicleToDelete(vehicle)} disabled={!!bookingInfo}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <Car className="mx-auto h-12 w-12 opacity-20 mb-2" />
                      <p>No vehicles found in your fleet.</p>
                      <Button variant="link" onClick={() => handleOpenForm()}>Add your first vehicle</Button>
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
            <AlertDialogCancel onClick={() => setVehicleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(vehicleToDelete) deleteVehicle(vehicleToDelete.id); setVehicleToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
