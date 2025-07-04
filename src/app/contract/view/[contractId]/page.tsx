
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileDown } from 'lucide-react';
import type { SignedContract, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export default function ViewContractPage() {
    const params = useParams();
    const { signedContracts, clients } = useAppContext();
    const { toast } = useToast();
    const [contract, setContract] = useState<SignedContract | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const contractId = params.contractId as string;
        if (signedContracts && contractId && clients) {
            const foundContract = signedContracts.find(c => c.id === contractId);
            setContract(foundContract || null);
            if (foundContract) {
                const foundClient = clients.find(c => c.id === foundContract.clientId);
                setClient(foundClient || null);
            }
        }
        setIsLoading(false);
    }, [params.contractId, signedContracts, clients]);

    const handleDownload = async () => {
        const input = printRef.current;
        if (!input) {
            toast({ variant: 'destructive', title: 'Error', description: 'Report content not found.' });
            return;
        }

        setIsExporting(true);
        toast({ title: 'Generating PDF...', description: 'Please wait.' });

        // Temporarily modify styles for accurate rendering by the PDF library
        const originalPadding = input.style.padding;
        const originalBg = input.style.backgroundColor;
        const originalColor = input.style.color;
        
        input.style.padding = '0';
        input.style.backgroundColor = 'white'; // Ensure background is not transparent
        input.style.color = 'black';

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });

            await pdf.html(input, {
                callback: function (doc) {
                    doc.save(`contract-${contract?.tenantId || 'download'}.pdf`);
                    toast({ title: 'PDF Exported', description: 'Your contract has been downloaded.' });
                },
                margin: [72, 72, 72, 72], // 1-inch margins
                autoPaging: 'text',
                html2canvas: {
                    useCORS: true, // Important for external images
                    allowTaint: true,
                    letterRendering: true,
                },
                width: 595 - (72 * 2), // A4 width in points minus margins
                windowWidth: input.scrollWidth,
            });

        } catch (error: any) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not create the PDF. Please try again.' });
        } finally {
            // Restore original styles
            input.style.padding = originalPadding;
            input.style.backgroundColor = originalBg;
            input.style.color = originalColor;
            setIsExporting(false);
        }
    };


    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!contract) return <div className="flex justify-center items-center h-screen"><p>Contract not found.</p></div>;

    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <CardTitle>Signed Contract</CardTitle>
                            {contract.signedAt && (
                                <CardDescription>Signed on {new Date(contract.signedAt).toLocaleString()}</CardDescription>
                            )}
                        </div>
                        <Button onClick={handleDownload} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
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
                         <div dangerouslySetInnerHTML={{ __html: contract.contractBody.replace(/(\r\n|\n|\r)/gm, '<br />') }} />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
