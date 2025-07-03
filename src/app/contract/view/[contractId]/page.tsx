
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

// Helper function to fetch an image and convert it to a data URI
const toDataURL = async (url: string): Promise<string> => {
    // This is a robust way to fetch images that might have CORS restrictions.
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


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
        toast({ title: 'Preparing PDF...', description: 'Embedding images. Please wait.' });
        
        // 1. Clone the element to avoid modifying the on-screen view
        const clonedElement = element.cloneNode(true) as HTMLDivElement;
        
        // 2. Find all images and convert their src to data URIs
        const images = Array.from(clonedElement.getElementsByTagName('img'));
        for (const img of images) {
            if (img.src && img.src.includes('firebasestorage.googleapis.com')) {
                try {
                    const dataUrl = await toDataURL(img.src);
                    img.src = dataUrl;
                } catch (error) {
                    console.error('Failed to embed image:', img.src, error);
                    // If an image fails, we'll let the process continue.
                }
            }
        }

        // 3. Temporarily append the modified clone to the body to render it for html2canvas
        clonedElement.style.position = 'absolute';
        clonedElement.style.left = '-9999px';
        clonedElement.style.width = element.offsetWidth + 'px'; // Use on-screen width as a base
        document.body.appendChild(clonedElement);

        try {
            const canvas = await html2canvas(clonedElement, {
                scale: 2,
                useCORS: false, // Not needed anymore since images are embedded
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / pdfWidth;
            const imgHeight = canvasHeight / ratio;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`contract-${contract.tenantId}.pdf`);

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'An unexpected error occurred while creating the PDF.' });
        } finally {
            // 4. Clean up by removing the cloned element from the DOM
            document.body.removeChild(clonedElement);
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
                    <div className="p-4 border rounded bg-white text-black">
                        {/* This is the element that will be rendered for PDF generation */}
                        <div ref={printRef}>
                             {client?.logoUrl && (
                                 <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                     <img 
                                         src={client.logoUrl} 
                                         alt={`${client.name} Logo`} 
                                         style={{ maxHeight: '80px', maxWidth: '250px', display: 'inline-block' }}
                                         crossOrigin="anonymous" // Keep for on-screen rendering
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
