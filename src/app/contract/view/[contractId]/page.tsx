
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
        toast({ title: 'Preparing PDF...', description: 'Please wait, this may take a moment.' });
        
        // Create a clone to manipulate without affecting the on-screen view
        const clone = element.cloneNode(true) as HTMLDivElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0px';
        clone.style.width = '816px'; // A standard width for rendering
        clone.style.padding = '0'; // Remove on-screen padding for canvas generation
        document.body.appendChild(clone);

        // Find all images within the clone and convert their src to data URIs
        const images = Array.from(clone.getElementsByTagName('img'));
        const promises = images.map(img => {
            if (img.src && img.src.startsWith('https://firebasestorage.googleapis.com')) {
                return new Promise((resolve, reject) => {
                    const newImg = new window.Image();
                    newImg.crossOrigin = 'Anonymous';
                    newImg.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = newImg.naturalWidth;
                        canvas.height = newImg.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(newImg, 0, 0);
                        img.src = canvas.toDataURL('image/png'); // Replace src with data URI
                        resolve(true);
                    };
                    newImg.onerror = reject; // Reject promise if image fails to load
                    newImg.src = img.src;
                });
            }
            return Promise.resolve(true);
        });

        try {
            await Promise.all(promises); // Wait for all images to be converted

            // Now generate the canvas from the clone which has data URI images
            const canvas = await html2canvas(clone, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'legal', // US Legal size (8.5 x 14 inches)
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 72; // 1 inch = 72 points

            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = pdfHeight - (margin * 2);

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasRatio = canvasWidth / contentWidth;
            const imgHeight = canvasHeight / canvasRatio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
            heightLeft -= contentHeight;

            while (heightLeft > 0) {
                position -= contentHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
                heightLeft -= contentHeight;
            }
            
            pdf.save(`contract-${contract.tenantId}.pdf`);
            toast({ title: 'PDF Downloaded' });

        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not load contract images. This might be a network or a browser security issue.' });
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
                        {/* This is the element that will be rendered on screen. Its padding creates the visual margins. */}
                        <div ref={printRef} className="p-12 bg-white" style={{ width: '816px', margin: 'auto' }}>
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
