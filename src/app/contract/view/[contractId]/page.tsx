
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
        if (!contract) return;

        setIsExporting(true);
        toast({ title: 'Preparing PDF...', description: 'Embedding images. Please wait.' });

        try {
            // 1. Collect all image URLs that need to be converted from the contract body and the client logo.
            const imageUrls = new Set<string>();
            if (client?.logoUrl) {
                imageUrls.add(client.logoUrl);
            }
            const bodyImageMatches = contract.contractBody.match(/<img[^>]+src="([^">]+)"/g) || [];
            bodyImageMatches.forEach(imgTag => {
                const srcMatch = imgTag.match(/src="([^"]+)"/);
                if (srcMatch && srcMatch[1] && srcMatch[1].includes('firebasestorage.googleapis.com')) {
                    imageUrls.add(srcMatch[1]);
                }
            });

            // 2. Fetch all unique images and convert them to data URIs in parallel.
            const dataUriMap = new Map<string, string>();
            await Promise.all(
                Array.from(imageUrls).map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                        const blob = await response.blob();
                        const dataUri = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        dataUriMap.set(url, dataUri);
                    } catch (error) {
                        console.error(`Could not embed image: ${url}`, error);
                    }
                })
            );

            // 3. Construct the final HTML string for the PDF.
            let finalHtmlBody = contract.contractBody;
            dataUriMap.forEach((dataUri, originalUrl) => {
                finalHtmlBody = finalHtmlBody.replace(new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), dataUri);
            });
            
            const logoDataUri = client?.logoUrl ? dataUriMap.get(client.logoUrl) : null;
            const logoHtml = logoDataUri
                ? `<div style="text-align: center; margin-bottom: 32px;"><img src="${logoDataUri}" alt="${client?.name} Logo" style="max-height: 80px; max-width: 250px; display: inline-block;" /></div>`
                : '';
            
            const fullHtmlString = `
                <div style="font-family: Times, serif; font-size: 12pt; line-height: 1.5;">
                    ${logoHtml}
                    ${finalHtmlBody.replace(/(\r\n|\n|\r)/gm, '<br />')}
                </div>
            `;

            // 4. Generate PDF using jsPDF.html() for better page breaking and margin control.
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'legal',
            });

            await pdf.html(fullHtmlString, {
                callback: function (doc) {
                    doc.save(`contract-${contract.tenantId}.pdf`);
                },
                margin: [72, 72, 72, 72],
                autoPaging: 'text',
                width: 612 - 144,
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
