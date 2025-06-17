
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant, Payment } from '@/lib/types';
import { predictDelinquency, type DelinquencyPredictionOutput, type DelinquencyPredictionInput } from '@/ai/flows/delinquency-prediction';
import { useToast } from '@/hooks/use-toast';

interface DelinquencyPredictionResult extends DelinquencyPredictionOutput {
  predictedAt: Date;
}

export function DelinquencyCard() {
  const { tenants, payments } = useAppContext();
  const { toast } = useToast();
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<DelinquencyPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);

  const handlePredict = async () => {
    if (!selectedTenantId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a tenant." });
      return;
    }

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) {
      toast({ variant: "destructive", title: "Error", description: "Selected tenant not found." });
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Prepare payment history string
      const tenantPayments = payments
        .filter(p => p.tenantId === tenant.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let paymentHistoryString = tenantPayments.map(p => 
        `Paid $${p.amount} on ${new Date(p.date).toLocaleDateString()} via ${p.paymentMethod}.`
      ).join('\n');
      if (tenantPayments.length === 0) {
        paymentHistoryString = "No payment history found.";
      }

      // Calculate current balance (simplified)
      // This is a very basic calculation. A real system would track due dates and amounts precisely.
      const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
      const joinDate = new Date(tenant.joinDate);
      const today = new Date();
      const monthsActive = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth()) + 1;
      const totalExpected = monthsActive * tenant.monthlyRentalRate;
      const currentBalance = Math.max(0, totalExpected - totalPaid); // Ensure balance is not negative for this simple model

      const input: DelinquencyPredictionInput = {
        tenantName: tenant.name,
        paymentHistory: paymentHistoryString,
        rentalRate: tenant.monthlyRentalRate,
        currentBalance: currentBalance,
      };
      
      const result = await predictDelinquency(input);
      setPrediction({ ...result, predictedAt: new Date() });
      toast({ title: "Prediction Complete", description: `Delinquency risk for ${tenant.name} assessed.` });

    } catch (e: any) {
      console.error("Delinquency prediction error:", e);
      setError(e.message || "Failed to predict delinquency.");
      toast({ variant: "destructive", title: "Prediction Failed", description: e.message || "An unknown error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskIcon = (riskLevel?: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card className="shadow-xl w-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Delinquency Prediction (AI)</CardTitle>
        <CardDescription>Analyze tenant payment patterns to predict potential overdue accounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
            <Select onValueChange={setSelectedTenantId} value={selectedTenantId}>
              <SelectTrigger id="tenant-select" className="w-full">
                <SelectValue placeholder="Choose a tenant..." />
              </SelectTrigger>
              <SelectContent>
                {activeTenants.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePredict} disabled={isLoading || !selectedTenantId} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Predict Risk
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {prediction && (
          <Card className="mt-4 bg-muted/30">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getRiskIcon(prediction.delinquencyRisk)}
                    Risk Level: {prediction.delinquencyRisk}
                  </CardTitle>
                  <CardDescription>
                    Prediction for {tenants.find(t=>t.id === selectedTenantId)?.name} as of {prediction.predictedAt.toLocaleTimeString()} on {prediction.predictedAt.toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold">Risk Factors:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{prediction.riskFactors}</p>
              </div>
              <div>
                <h4 className="font-semibold">Recommendations:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{prediction.recommendations}</p>
              </div>
            </CardContent>
          </Card>
        )}
         {!prediction && !isLoading && !error && (
            <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>Select a tenant and click "Predict Risk" to see AI-powered insights.</p>
            </div>
        )}
        {isLoading && (
             <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-2" />
                <p>Analyzing data and generating prediction...</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
