
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileWarning, AlertTriangle, FileText, FileDown } from 'lucide-react';
import type { Tenant, SignedContract } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ContractSource = 
  | { type: 'signed', data: SignedContract }
  | { type: 'uploaded', data: string } // data will be the direct firebase storage URL
  | null;

export default function ContractViewerPage() {
    const params = useParams();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { tenants, signedContracts } = useAppContext();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contractSource, setContractSource] = useState<ContractSource>(null);
    const [isExporting, setIsExporting] = useState(false);
    const contractContentRef = useRef<HTMLDivElement>(null);

    // The slug is now 'contractId' but it contains the tenant ID.
    const tenantId = params.contractId as string;

    useEffect(() => {
        if (isAuthLoading || !user) {
            return;
        }

        if (tenants.length === 0 && !isAuthLoading) {
            setIsLoading(false);
        }

        const tenant = tenants.find(t => t.id === tenantId);

        if (!tenant) {
            if (tenants.length > 0) {
                 setError("Tenant not found for the provided ID.");
            }
            setIsLoading(false);
            return;
        }

        setError(null);

        const isSuperAdmin = user.isSuperAdmin;
        const isOwnerOrAdmin = user.clientId === tenant.clientId;
        const isTheTenant = user.tenantId === tenant.id;

        if (!isSuperAdmin && !isOwnerOrAdmin && !isTheTenant) {
             setError("You are not authorized to view this contract.");
             setIsLoading(false);
             return;
        }

        if (tenant.activeContractId) {
            const contract = signedContracts.find(c => c.id === tenant.activeContractId);
            if (contract) {
                setContractSource({ type: 'signed', data: contract });
            } else if (signedContracts.length > 0) {
                setError("Digitally signed contract record could not be found.");
            }
        } else if (tenant.contractUrl) {
            setContractSource({ type: 'uploaded', data: tenant.contractUrl });
        } else {
            setContractSource(null);
        }

        setIsLoading(false);

    }, [isAuthLoading, user, tenantId, tenants, signedContracts]);

    const handleDownloadPdf = async () => {
        const input = contractContentRef.current;
        if (!input) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find contract content to export.' });
          return;
        }
    
        setIsExporting(true);
        toast({ title: 'Generating PDF...', description: 'Please wait, this may take a moment.' });
        
        try {
          const canvas = await html2canvas(input, { 
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff'
          });
    
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = canvas.width;
          const pdfHeight = canvas.height;
    
          const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [pdfWidth, pdfHeight]
          });
    
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const tenantName = tenantForTitle?.name.replace(/\s+/g, '_') || 'tenant';
          pdf.save(`contract_${tenantName}.pdf`);
          
        } catch (error) {
          console.error("PDF generation failed:", error);
          toast({ variant: 'destructive', title: 'PDF Export Failed', description: 'An error occurred while generating the PDF.' });
        } finally {
          setIsExporting(false);
        }
      };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading contract...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Alert variant="destructive" className="max-w-xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Contract</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!contractSource) {
         return (
            <div className="container mx-auto py-8 text-center">
                 <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>No Contract Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There is no contract on file for the selected tenant.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tenantForTitle = tenants.find(t => t.id === tenantId);

    return (
        <div className="container mx-auto py-2">
             <Card className="shadow-xl">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Contract for {tenantForTitle?.name || '...'}</CardTitle>
                            <CardDescription>
                                {contractSource?.type === 'signed' && contractSource.data.signedAt
                                    ? `Digitally signed on ${new Date(contractSource.data.signedAt).toLocaleDateString()}`
                                    : 'Uploaded PDF Document'}
                            </CardDescription>
                        </div>
                        {contractSource?.type === 'signed' ? (
                            <Button onClick={handleDownloadPdf} disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Download PDF
                            </Button>
                        ) : (
                             <Button asChild>
                                <Link href={contractSource.data} target="_blank" rel="noopener noreferrer">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Download / View PDF
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {contractSource?.type === 'signed' ? (
                        <ScrollArea className="h-[calc(100vh-20rem)] border rounded-md bg-muted/30">
                           <div ref={contractContentRef} className="p-6 bg-white text-black whitespace-pre-wrap prose prose-sm" dangerouslySetInnerHTML={{ __html: contractSource.data.contractBody.replace(/\n/g, '<br />') }} />
                        </ScrollArea>
                    ) : contractSource?.type === 'uploaded' ? (
                        <div className="h-[calc(100vh-20rem)] border rounded-md bg-muted/30 flex items-center justify-center">
                           <iframe src={`/api/contract-proxy?url=${encodeURIComponent(contractSource.data)}`} className="w-full h-full" title="Contract Preview"></iframe>
                        </div>
                    ) : null}
                </CardContent>
             </Card>
        </div>
    );
}
