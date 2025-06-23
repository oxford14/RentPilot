
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { DelinquencyCard } from '@/components/reports/DelinquencyCard';
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant, Payment } from '@/lib/types';
import { DollarSign, Users, TrendingUp, TrendingDown, FileText, FileDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FinancialSummary {
  totalCollected: number;
  totalOutstanding: number;
  activeTenantsInRange: number;
  paymentsCount: number;
}

const initialFinancialSummary: FinancialSummary = {
  totalCollected: 0,
  totalOutstanding: 0,
  activeTenantsInRange: 0,
  paymentsCount: 0,
};

export default function FinancialSummaryReportsPage() { // Renamed component
  const { tenants, payments } = useAppContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [calculatedSummary, setCalculatedSummary] = useState<FinancialSummary>(initialFinancialSummary);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { filteredPayments: payments, relevantTenants: tenants };
    }
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999); 

    const filteredPayments = payments.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate >= fromDate && paymentDate <= toDate;
    });

    const relevantTenantIds = new Set<string>(filteredPayments.map(p => p.tenantId));
    tenants.forEach(t => {
        const joinDate = new Date(t.joinDate);
        if (joinDate <= toDate) { 
            relevantTenantIds.add(t.id);
        }
    });
    const relevantTenants = tenants.filter(t => relevantTenantIds.has(t.id));

    return { filteredPayments, relevantTenants };
  }, [payments, tenants, dateRange]);

  useEffect(() => {
    if (!clientNow) { 
      setCalculatedSummary(initialFinancialSummary); 
      return;
    }

    const { filteredPayments, relevantTenants } = filteredData;
    const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    
    let totalExpectedRentInPeriod = 0;
    relevantTenants.forEach(tenant => {
        if (tenant.status === 'active') { 
            const joinD = new Date(tenant.joinDate);
            
            const periodStartDate = dateRange?.from ? new Date(dateRange.from) : joinD;
            const periodEndDate = dateRange?.to ? new Date(dateRange.to) : clientNow;

            let monthsInPeriod = 0;
            let currentDateInLoop = new Date(Math.max(joinD.getTime(), periodStartDate.getTime()));
            
            while(currentDateInLoop <= periodEndDate) {
                monthsInPeriod++;
                currentDateInLoop.setMonth(currentDateInLoop.getMonth() + 1);
                currentDateInLoop.setDate(1); 
                 if(currentDateInLoop > periodEndDate && monthsInPeriod === 1 && (periodEndDate.getTime() - Math.max(joinD.getTime(), periodStartDate.getTime())) / (1000 * 3600 * 24) < 15) {
                     
                 }
            }
            if (monthsInPeriod > 0) totalExpectedRentInPeriod += tenant.monthlyRentalRate * monthsInPeriod;
        }
    });
    const totalOutstanding = Math.max(0, totalExpectedRentInPeriod - totalCollected);

    setCalculatedSummary({
      totalCollected,
      totalOutstanding,
      activeTenantsInRange: relevantTenants.filter(t => t.status === 'active').length,
      paymentsCount: filteredPayments.length,
    });
  }, [filteredData, dateRange, clientNow]);


  const tenantReportData = useMemo(() => {
    return filteredData.relevantTenants.map(tenant => {
        const tenantPayments = filteredData.filteredPayments.filter(p => p.tenantId === tenant.id);
        const totalPaidByTenant = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            totalPaid: totalPaidByTenant,
            numberOfPayments: tenantPayments.length,
        };
    }).sort((a,b) => b.totalPaid - a.totalPaid);
  }, [filteredData]);

  const displaySummary = clientNow ? calculatedSummary : initialFinancialSummary;

  const handleExportPDF = async () => {
    const input = reportContentRef.current;
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Report content not found.' });
      return;
    }

    setIsExporting(true);
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: null, // Use element's background
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('financial-summary-report.pdf');
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
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Financial Summary Report
          </h1>
          <p className="text-muted-foreground">Analyze financial performance and tenant payment behavior.</p>
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
            <CardDescription>Select a date range to filter the reports below.</CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangeSelector onDateChange={setDateRange} />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Total Collected</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{clientNow ? displaySummary.totalCollected.toLocaleString() : '...'}</div>
              <p className="text-xs text-muted-foreground">{clientNow ? displaySummary.paymentsCount : '...'} payments received</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Outstanding (Est.)</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{clientNow ? displaySummary.totalOutstanding.toLocaleString() : '...'}</div>
              <p className="text-xs text-muted-foreground">Estimated based on active tenants</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Active Tenants (Range)</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientNow ? displaySummary.activeTenantsInRange : '...'}</div>
              <p className="text-xs text-muted-foreground">Tenants active in selected period</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-headline">Payment Volume</CardTitle>
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientNow ? displaySummary.paymentsCount : '...'}</div>
              <p className="text-xs text-muted-foreground">Total payments in period</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-xl">
          <CardHeader>
              <CardTitle className="font-headline">Tenant Payment Summary</CardTitle>
              <CardDescription>Overview of payments by tenant for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
              <ScrollArea className="h-[400px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Tenant Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Total Paid (₱)</TableHead>
                              <TableHead className="text-center"># Payments</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {tenantReportData.length > 0 ? tenantReportData.map(item => (
                              <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell>{item.status === 'active' ? 'Active' : 'Inactive'}</TableCell>
                                  <TableCell className="text-right">{item.totalPaid.toLocaleString()}</TableCell>
                                  <TableCell className="text-center">{item.numberOfPayments}</TableCell>
                              </TableRow>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                      { clientNow ? 'No tenant payment data for the selected period.' : 'Loading report data...'}
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <DelinquencyCard />
    </div>
  );
}
