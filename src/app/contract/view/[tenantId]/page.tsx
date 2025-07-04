
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileDown, ShieldAlert } from 'lucide-react';
import type { Tenant, Client, SignedContract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getUploadedContractAsBase64 } from '@/actions/contract-actions';

export default function ViewContractPage() {
    const params = useParams();
    const { tenants, signedContracts, clients } = useAppContext();
    const { toast } = useToast();
    
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [signedContract, setSignedContract] = useState<SignedContract | null>(null);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tenantId = params.tenantId as string;
        if (!tenantId || !tenants.length || !clients.length) return;

        const foundTenant = tenants.find(t => t.id === tenantId);
        if (!foundTenant) {
            setError("Tenant not found.");
            setIsLoading(false);
            return;
        }
        setTenant(foundTenant);
        
        const foundClient = clients.find(c => c.id === foundTenant.clientId);
        setClient(foundClient || null);

        const loadContract = async () => {
            if (foundTenant.activeContractId) {
                const foundContract = signedContracts.find(c => c.id === foundTenant.activeContractId);
                if (foundContract) {
                    setSignedContract(foundContract);
                } else {
                    setError("Digitally signed contract record not found.");
                }
            } else if (foundTenant.contractUrl) {
                try {
                    const base64 = await getUploadedContractAsBase64(tenantId);
                    if(base64) {
                        setPdfBase64(base64);
                    } else {
                        setError("No uploaded contract file found for this tenant.");
                    }
                } catch (e: any) {
                    setError(`Failed to load uploaded contract: ${e.message}`);
                    toast({ variant: 'destructive', title: 'Error Loading PDF', description: e.message });
                }
            } else {
                setError("No contract is associated with this tenant.");
            }
            setIsLoading(false);
        };

        loadContract();
    }, [params.tenantId, tenants, signedContracts, clients, toast]);
    
    const handleDownload = async () => {
        if (pdfBase64) {
            const byteCharacters = atob(pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            const fileName = tenant?.name ? `contract-${tenant.name.replace(/\s/g, '_')}.pdf` : 'contract.pdf';
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
            toast({ title: 'PDF Downloaded', description: 'Your contract has been downloaded.' });
        } else if (signedContract && printRef.current) {
            const input = printRef.current;
            setIsExporting(true);
            toast({ title: 'Generating PDF...', description: 'Please wait.' });
            
            const originalPadding = input.style.padding;
            const originalBg = input.style.backgroundColor;
            const originalColor = input.style.color;
            
            input.style.padding = '0';
            input.style.backgroundColor = 'white';
            input.style.color = 'black';

            try {
                const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
                await pdf.html(input, {
                    callback: function (doc) {
                        doc.save(`contract-${tenant?.name || 'download'}.pdf`);
                        toast({ title: 'PDF Exported', description: 'Your contract has been downloaded.' });
                    },
                    margin: [72, 72, 72, 72],
                    autoPaging: 'text',
                    html2canvas: { useCORS: true, allowTaint: true, letterRendering: true, scale: 0.75 },
                    width: 595 - (72 * 2),
                    windowWidth: input.scrollWidth,
                });
            } catch (error: any) {
                console.error("PDF generation failed:", error);
                toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not create the PDF.' });
            } finally {
                input.style.padding = originalPadding;
                input.style.backgroundColor = originalBg;
                input.style.color = originalColor;
                setIsExporting(false);
            }
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4">Error Loading Contract</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <CardTitle>Contract for {tenant?.name}</CardTitle>
                            {signedContract?.signedAt && (
                                <CardDescription>Digitally Signed on {new Date(signedContract.signedAt).toLocaleString()}</CardDescription>
                            )}
                            {pdfBase64 && (
                                <CardDescription>Uploaded PDF Contract</CardDescription>
                            )}
                        </div>
                        <Button onClick={handleDownload} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                     {signedContract && (
                         <div ref={printRef} className="p-6 border rounded bg-white text-black">
                             {client?.logoUrl && (
                                 <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                     <img 
                                         src={client.logoUrl} 
                                         alt={`${client.name} Logo`} 
                                         style={{ maxHeight: '80px', maxWidth: '250px', display: 'inline-block' }}
                                         crossOrigin="anonymous"
                                     />
                                 </div>
                             )}
                             <div dangerouslySetInnerHTML={{ __html: signedContract.contractBody.replace(/(\r\n|\n|\r)/gm, '<br />') }} />
                         </div>
                     )}
                     {pdfBase64 && (
                        <div className="h-[80vh] w-full">
                            <iframe 
                                src={`data:application/pdf;base64,${pdfBase64}`}
                                className="w-full h-full border rounded-md"
                                title="Contract PDF"
                            ></iframe>
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
