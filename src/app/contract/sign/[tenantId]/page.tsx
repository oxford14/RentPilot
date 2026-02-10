
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CalendarClock, ArrowRight, Signature, Trash2, Check, AlertTriangle } from 'lucide-react';
import { addMonths, addYears, format } from 'date-fns';
import jsPDF from 'jspdf';

const DEFAULT_CONTRACT_TEXT = `LEASE AGREEMENT

This Lease Agreement ("Agreement") is made and entered into this day, [DATE], by and between:

LANDLORD:
[LANDLORD_NAME]

and

TENANT:
[TENANT_NAME]

1. PROPERTY. Landlord agrees to lease to Tenant the property located at [PROPERTY_ADDRESS].

2. TERM. The term of this lease shall be for a period of [CONTRACT_TERM], beginning on [START_DATE] and ending on [END_DATE].

3. RENT. Tenant agrees to pay Landlord as rent for the Property the sum of [RENT_AMOUNT] per month, due on the [DUE_DAY] day of each month.

4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of [SECURITY_DEPOSIT] as security for the performance of Tenant's obligations under this Agreement.

5. USE OF PROPERTY. The property shall be used and occupied by Tenant exclusively as a private single-family residence.

6. SIGNATURES. The parties agree to the terms of this Lease Agreement, as evidenced by their signatures below.
`;

export default function SignContractPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { tenants, clients, uploadSignedContract, contractTemplates } = useAppContext();
    const { user } = useAuth();
    
    const signaturePadRef = useRef<SignatureCanvas | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'duration' | 'sign'>('duration');
    
    // Duration State
    const [duration, setDuration] = useState<number>(1);
    const [unit, setUnit] = useState<'years' | 'months'>('years');
    const [calculatedEndDate, setCalculatedEndDate] = useState<Date | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');

    // Signing State
    const [contractText, setContractText] = useState('');

    const tenantId = params.tenantId as string;
    
    const tenant = useMemo(() => tenants.find(t => t.id === tenantId), [tenants, tenantId]);
    const client = useMemo(() => {
        if (!tenant?.clientId) return null;
        return clients.find(c => c.id === tenant.clientId);
    }, [tenant, clients]);

    useEffect(() => {
        if (tenant?.joinDate) {
            const joinDate = new Date(tenant.joinDate);
            let endDate;
            if (unit === 'months') {
                endDate = addMonths(joinDate, duration || 0);
            } else {
                endDate = addYears(joinDate, duration || 0);
            }
            setCalculatedEndDate(endDate);
        }
    }, [duration, unit, tenant]);

    const handleProceedToSign = () => {
        if (!tenant || !client || !calculatedEndDate) return;
        
        let baseContractText = DEFAULT_CONTRACT_TEXT;
        if (selectedTemplateId !== 'default') {
            const selectedTemplate = contractTemplates.find(t => t.id === selectedTemplateId);
            if (selectedTemplate) {
                baseContractText = selectedTemplate.content;
            }
        }
        
        const termString = `${duration} ${unit.slice(0, -1)}${duration > 1 ? 's' : ''}`;
        const startDate = format(new Date(tenant.joinDate), 'MMMM dd, yyyy');
        const endDate = format(calculatedEndDate, 'MMMM dd, yyyy');
        const dueDay = tenant.monthlyDueDay || new Date(tenant.joinDate).getDate();

        const populatedText = baseContractText
            .replace(/\[DATE\]/g, format(new Date(), 'MMMM dd, yyyy'))
            .replace(/\[LANDLORD_NAME\]/g, client.name || 'The Landlord')
            .replace(/\[TENANT_NAME\]/g, tenant.name)
            .replace(/\[PROPERTY_ADDRESS\]/g, '_________________________') // Placeholder
            .replace(/\[CONTRACT_TERM\]/g, termString)
            .replace(/\[START_DATE\]/g, startDate)
            .replace(/\[END_DATE\]/g, endDate)
            .replace(/\[RENT_AMOUNT\]/g, `PHP ${tenant.monthlyRentalRate.toLocaleString()}`)
            .replace(/\[DUE_DAY\]/g, String(dueDay))
            .replace(/\[SECURITY_DEPOSIT\]/g, `PHP ${(tenant.securityDeposit || 0).toLocaleString()}`);
            
        setContractText(populatedText);
        setStep('sign');
    };

    const handleSign = async () => {
        if (signaturePadRef.current?.isEmpty()) {
            toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide your signature before submitting.' });
            return;
        }
        if (!tenant || !calculatedEndDate) return;

        setIsLoading(true);
        
        try {
            const doc = new jsPDF();
            const signatureDataUrl = signaturePadRef.current?.toDataURL('image/png') || '';

            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            let y = margin;
            
            doc.setFontSize(10);

            // New pagination logic with adjusted line height
            const textLines = doc.splitTextToSize(contractText, pageWidth - (margin * 2));
            const normalLineHeight = 12; // Standard line height for text
            const paragraphBreakHeight = 6; // Smaller gap for paragraph breaks

            for (const line of textLines) {
                const isParagraphBreak = line.trim() === "";
                const currentLineHeight = isParagraphBreak ? paragraphBreakHeight : normalLineHeight;

                if (y + currentLineHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin; 
                }

                if (!isParagraphBreak) {
                    doc.text(line, margin, y);
                }
                
                y += currentLineHeight;
            }

            y += 10; 
            
            if (y > pageHeight - 50) { 
                doc.addPage();
                y = margin;
            }

            doc.text('Tenant Signature:', margin, y);
            y += 5;
            doc.addImage(signatureDataUrl, 'PNG', margin, y, 60, 30);

            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `contract-${tenant.id}.pdf`, { type: 'application/pdf' });
            
            await uploadSignedContract(tenant.id, pdfFile, calculatedEndDate.toISOString());
            
            setIsLoading(false);
            router.push('/tenants');
        } catch (error) {
            setIsLoading(false);
            console.error("Error generating or uploading PDF:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save the signed contract." });
        }
    };
    
    if (!user) return <p>Loading...</p>;
    // Allow tenant to sign for themselves, or admin to facilitate
    const isAuthorized = user.role === 'tenant' ? user.tenantId === tenantId : (user.isSuperAdmin || user.role === 'admin');
    if (!isAuthorized) {
        toast({variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to view this page.'});
        router.push('/');
        return null;
    }
    if (!tenant) return <p>Tenant not found.</p>;

    return (
        <div className="container mx-auto py-2">
           {step === 'duration' ? (
                <Card className="max-w-xl mx-auto shadow-xl">
                    <CardHeader>
                        <CardTitle>Set Contract Details</CardTitle>
                        <CardDescription>
                            Specify the contract term and choose a template for {tenant?.name}. The term starts from their join date ({format(new Date(tenant.joinDate), 'PPP')}).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="duration-number">Contract Duration</Label>
                                <Input id="duration-number" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)} min="1" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration-unit">Unit</Label>
                                <Select value={unit} onValueChange={(value: 'years' | 'months') => setUnit(value)}>
                                    <SelectTrigger id="duration-unit"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="years">Years</SelectItem>
                                        <SelectItem value="months">Months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template-select">Contract Template</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger id="template-select"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Contract</SelectItem>
                                    {contractTemplates.map(template => (
                                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {calculatedEndDate && (
                            <Alert>
                                <CalendarClock className="h-4 w-4" />
                                <AlertTitle>New Contract End Date</AlertTitle>
                                <AlertDescription className="font-semibold text-lg">
                                    {format(calculatedEndDate, 'PPP')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleProceedToSign} disabled={!duration || duration <= 0} className="w-full">
                            Next: Review & Sign <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle>Review & Sign Contract</CardTitle>
                        <CardDescription>Review the details below and provide your signature.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="contract-text">Contract Content</Label>
                            <Textarea id="contract-text" value={contractText} onChange={(e) => setContractText(e.target.value)} rows={15} />
                        </div>
                        <div className="space-y-2">
                            <Label>Signature</Label>
                            <div className="border rounded-md bg-white">
                                <SignatureCanvas
                                    ref={signaturePadRef}
                                    penColor='black'
                                    canvasProps={{ className: 'w-full h-[200px]' }}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-between gap-2">
                        <Button variant="outline" onClick={() => signaturePadRef.current?.clear()}>
                            <Trash2 className="mr-2 h-4 w-4"/> Clear Signature
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setStep('duration')}>Back</Button>
                            <Button onClick={handleSign} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                                {isLoading ? 'Saving...' : 'Sign & Submit Contract'}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
