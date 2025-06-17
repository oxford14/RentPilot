
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { PlusCircle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenForm = () => setIsFormOpen(true);
  const handleCloseForm = () => setIsFormOpen(false);

  return (
    <div className="container mx-auto py-2 space-y-6">
       <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Payment Tracking</CardTitle>
              <CardDescription>Record and view tenant payment history. Search by tenant name.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
               <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search by tenant name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full shadow-sm"
                />
              </div>
              <Button onClick={handleOpenForm} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" /> Record New Payment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentsTable searchTerm={searchTerm} />
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
