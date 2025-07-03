
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileDown } from 'lucide-react';
import type { SignedContract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ViewContractPage() {
    const params = useParams();
    const { signedContracts } = useAppContext();
    const { toast } = useToast();
    const [contract, setContract] = useState<SignedContract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const contractId = params.contractId as string;
        if (signedContracts && contractId) {
            const foundContract = signedContracts.find(c => c.id === contractId);
            setContract(foundContract || null);
        }
        setIsLoading(false);
    }, [params.contractId, signedContracts]);

    const handleDownload = async () => {
        const element = printRef.current;
        if (!element || !contract) return;

        setIsExporting(true);
        toast({ title: 'Generating PDF...' });
        
        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                logging: true,
                allowTaint: true
            });
            const data = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'px', 'a4');
            const imgProperties = pdf.getImageProperties(data);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
            
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            
            pdf.save(`contract-${contract.tenantId}.pdf`);
            toast({ title: 'PDF Downloaded' });

        } catch (e) {
            console.error("Error generating PDF:", e);
            toast({ variant: 'destructive', title: 'PDF Generation Failed' });
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
                    <div className="p-4 border rounded bg-white text-black">
                        <div ref={printRef} className="p-8">
                             <div dangerouslySetInnerHTML={{ __html: contract.contractBody.replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
