
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
import html2canvas from 'html2canvas';

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
        toast({ title: 'Preparing PDF...', description: 'Please wait.' });

        try {
            // Wait for all images inside the printable area to load
            const images = Array.from(input.getElementsByTagName('img'));
            const promises = images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise<void>(resolve => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Don't let a failed image block the whole process
                });
            });
            await Promise.all(promises);

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'legal', // 8.5 x 14 inches
            });
            
            // Use the html method for better layout and page breaks
            await pdf.html(input, {
                callback: function (doc) {
                    doc.save(`contract-${contract?.tenantId || 'download'}.pdf`);
                },
                margin: [72, 72, 72, 72], // 1-inch margins
                autoPaging: 'text',
                width: 612 - 144, // 8.5 inches (612pt) - 2 inches of margin
                windowWidth: 612 - 144,
                html2canvas: {
                    useCORS: true, // Important for external images from Firebase
                    scale: 2
                }
            });

            toast({ title: 'PDF Exported', description: 'Your contract has been downloaded.' });
        } catch (error: any) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: error.message || 'Could not create PDF.' });
        } finally {
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
                     {/* The outer div provides the on-screen card appearance */}
                    <div className="p-6 border rounded bg-white text-black">
                         {/* This inner div is what gets printed, without the extra padding */}
                         <div ref={printRef}>
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
