
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { useAppContext } from '@/contexts/AppContext';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { Button } from '@/components/ui/button';
import { FileDown, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function PaymentLogPage() {
  const { payments } = useAppContext();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const filteredPayments = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return [];
    }
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    return payments.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate >= fromDate && paymentDate <= toDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, dateRange]);

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const handleExportPDF = async () => {
    const input = reportContentRef.current;
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Report content not found.' });
      return;
    }
    setIsExporting(true);
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('payment-log-report.pdf');
      toast({ title: 'PDF Exported', description: 'Your report has been downloaded.' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ variant: 'destructive', title: 'PDF Export Failed', description: 'An unexpected error occurred.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 flex items-center">
            <CreditCard className="mr-3 h-8 w-8 text-primary" />
            Payment Log Report
          </h1>
          <p className="text-muted-foreground">A detailed log of all payments received in a given period.</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="shadow-md">
          <FileDown className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export to PDF'}
        </Button>
      </div>

      <div ref={reportContentRef} className="space-y-8 bg-background p-4 rounded-lg">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline">Date Range</CardTitle>
            <CardDescription>Select a date range to view the payment log.</CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangeSelector onDateChange={setDateRange} />
          </CardContent>
        </Card>

        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="font-headline flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-primary"/>
                    Payments Received
                </CardTitle>
                 <CardDescription>
                    Displaying {filteredPayments.length} payment(s) totaling ₱{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for the selected period.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PaymentsTable payments={filteredPayments} showTenantNames={true} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// A slightly modified PaymentsTable to fit this report's needs
const PaymentsTable = ({ payments, showTenantNames }: { payments: any[], showTenantNames?: boolean }) => {
    const { tenants: allTenants } = useAppContext();

    const getTenantName = (tenantId: string) => {
        return allTenants.find(t => t.id === tenantId)?.name || 'Unknown Tenant';
    };

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {showTenantNames && <TableHead>Tenant</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount Paid (₱)</TableHead>
            <TableHead className="text-center">Method</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length > 0 ? payments.map((payment) => (
            <TableRow key={payment.id}>
              {showTenantNames && <TableCell className="font-medium">{getTenantName(payment.tenantId)}</TableCell>}
              <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{payment.paymentMethod || 'N/A'}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{payment.checkNumber || payment.discountDescription || '-'}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
                <TableCell colSpan={showTenantNames ? 5 : 4} className="text-center h-24">
                    No payments recorded for this period.
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
