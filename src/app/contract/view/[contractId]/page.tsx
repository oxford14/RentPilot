
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
        const element = printRef.current;
        if (!element || !contract) return;

        setIsExporting(true);
        toast({ title: 'Preparing PDF...', description: 'Embedding images...' });
        
        // Create a clone of the element to avoid modifying the displayed content
        const clone = element.cloneNode(true) as HTMLDivElement;
        // The clone needs to be in the DOM to be processed, but can be off-screen
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '-9999px';
        document.body.appendChild(clone);
        
        try {
            // Find and replace image URLs with data URIs
            const images = Array.from(clone.getElementsByTagName('img'));
            for (const img of images) {
                if (img.src && img.src.startsWith('https://firebasestorage.googleapis.com')) {
                    try {
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        img.src = dataUrl;
                    } catch (error) {
                        console.error('Failed to embed image:', img.src, error);
                        // Don't stop the whole PDF generation, just leave the broken image
                    }
                }
            }
            
            toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });

            const canvas = await html2canvas(clone, { scale: 2, useCORS: false }); // useCORS is now false
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'legal',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth(); // 612
            const pdfHeight = pdf.internal.pageSize.getHeight(); // 1008
            const margin = 72; // 1 inch

            const contentWidth = pdfWidth - (margin * 2); // 468
            const contentHeight = pdfHeight - (margin * 2); // 864

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasRatio = canvasHeight / canvasWidth;

            const imgHeight = contentWidth * canvasRatio;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
            heightLeft -= contentHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position + margin, contentWidth, imgHeight);
                heightLeft -= contentHeight;
            }
            
            pdf.save(`contract-${contract.tenantId}.pdf`);
            toast({ title: 'PDF Downloaded' });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'An error occurred while creating the PDF.' });
        } finally {
            setIsExporting(false);
            document.body.removeChild(clone); // Clean up the cloned element
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
                    <div className="p-4 border rounded bg-white text-black">
                        {/* The printable area. The styles here are for on-screen viewing. */}
                        <div ref={printRef} className="p-12 bg-white" style={{ width: '816px', margin: 'auto' }}>
                             {client?.logoUrl && (
                                 <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                     <img 
                                         src={client.logoUrl} 
                                         alt={`${client.name} Logo`} 
                                         style={{ maxHeight: '80px', maxWidth: '250px', display: 'inline-block' }}
                                         crossOrigin="anonymous" // Keep this for the initial on-screen load
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
