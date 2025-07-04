
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
    
        // 1. Clone the node to avoid modifying the visible content and append it off-screen.
        const clonedNode = input.cloneNode(true) as HTMLDivElement;
        clonedNode.style.position = 'absolute';
        clonedNode.style.left = '-9999px';
        clonedNode.style.top = '0';
        document.body.appendChild(clonedNode);
    
        try {
            const images = Array.from(clonedNode.getElementsByTagName('img'));
    
            // 2. Asynchronously fetch and convert each image to a base64 data URI.
            const imagePromises = images.map(async (img) => {
                if (img.src && !img.src.startsWith('data:')) {
                    try {
                        const response = await fetch(img.src);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch image: ${response.statusText}`);
                        }
                        const blob = await response.blob();
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        img.src = dataUrl; // Replace the src with the base64 data.
                    } catch (error) {
                        console.error('Failed to embed image:', img.src, error);
                    }
                }
            });
    
            // 3. Wait for all images to be processed.
            await Promise.all(imagePromises);
    
            // 4. Now render the cloned, self-contained node to the canvas.
            const canvas = await html2canvas(clonedNode, {
                allowTaint: true,
                useCORS: false,
                scale: 2,
            });
    
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height],
            });
    
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`contract-${contract?.tenantId || 'download'}.pdf`);
    
            toast({ title: 'PDF Exported', description: 'Your contract has been downloaded.' });
        } catch (error: any) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not create PDF. There might be a network issue.' });
        } finally {
            // 5. Clean up by removing the cloned node.
            document.body.removeChild(clonedNode);
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
