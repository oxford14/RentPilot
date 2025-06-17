
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleOpenForm = () => setIsFormOpen(true);
  const handleCloseForm = () => setIsFormOpen(false);

  return (
    <div className="container mx-auto py-2 space-y-6">
       <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold font-headline">Payment Tracking</CardTitle>
            <CardDescription>Record and view tenant payment history.</CardDescription>
          </div>
          <Button onClick={handleOpenForm} variant="default" className="shadow-md hover:shadow-lg transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" /> Record New Payment
          </Button>
        </CardHeader>
        <CardContent>
          <PaymentsTable />
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <PaymentForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
