"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileWarning, AlertTriangle, FileText } from 'lucide-react';
import type { Tenant, SignedContract } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getUploadedContractAsBase64 } from '@/actions/contract-actions';


type ContractSource = 
  | { type: 'signed', data: SignedContract }
  | { type: 'uploaded', data: string }
  | null;

export default function ContractViewerPage() {
    const params = useParams();
    const { user } = useAuth();
    const { tenants, signedContracts } = useAppContext();

    const [contractSource, setContractSource] = useState<ContractSource>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tenantId = params.tenantId as string;

    // This useMemo is for the UI and is fine.
    const tenant = useMemo(() => {
        if (!tenantId) return null;
        return tenants.find(t => t.id === tenantId);
    }, [tenantId, tenants]);

    useEffect(() => {
        const fetchContract = async () => {
            // Guard against running before necessary data is available.
            if (!user || !tenantId || tenants.length === 0) {
              setIsLoading(false); // Stop loading if we can't proceed.
              return;
            }
            
            setIsLoading(true);
            setError(null);
            setContractSource(null);

            const tenantForEffect = tenants.find(t => t.id === tenantId);

            if (!tenantForEffect) {
                setError("Tenant not found for the provided ID.");
                setIsLoading(false);
                return;
            }

            const isSuperAdmin = user.isSuperAdmin;
            const isOwnerOrAdmin = user.clientId === tenantForEffect.clientId;
            const isTheTenant = user.tenantId === tenantForEffect.id;

            if (!isSuperAdmin && !isOwnerOrAdmin && !isTheTenant) {
                 setError("You are not authorized to view this contract.");
                 setIsLoading(false);
                 return;
            }

            try {
                if (tenantForEffect.activeContractId) {
                    const contract = signedContracts.find(c => c.id === tenantForEffect.activeContractId);
                    if (contract) {
                        setContractSource({ type: 'signed', data: contract });
                    } else if (signedContracts.length > 0) {
                        setError("Digitally signed contract record could not be found.");
                    }
                } 
                else if (tenantForEffect.contractUrl) {
                    const base64string = await getUploadedContractAsBase64(tenantForEffect.contractUrl);
                    if (base64string) {
                        setContractSource({ type: 'uploaded', data: base64string });
                    } else {
                        setError("The uploaded contract file could not be loaded from storage. It may have been moved or deleted.");
                    }
                }
            } catch (e: any) {
                 setError(`Failed to load uploaded contract: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContract();

    // The key change is here: removing the memoized `tenant` object from the dependencies.
    // This prevents an infinite re-render loop if the `tenants` array reference changes.
    }, [tenantId, tenants, signedContracts, user]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading contract...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Alert variant="destructive" className="max-w-xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Contract</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    // Check for a "no contract found" scenario after loading is complete and there's no error
    if (!contractSource && tenantId && tenants.length > 0) {
         return (
            <div className="container mx-auto py-8 text-center">
                 <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>No Contract Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There is no contract on file for this tenant.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Add a check in case we are still loading initial data or tenantId is invalid
    if (!tenant) {
      return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading tenant data...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-2">
             <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>Contract for {tenant.name}</CardTitle>
                    <CardDescription>
                        {contractSource?.type === 'signed' && contractSource.data.signedAt
                            ? `Digitally signed on ${new Date(contractSource.data.signedAt).toLocaleDateString()}`
                            : 'Uploaded PDF Document'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {contractSource?.type === 'signed' ? (
                        <ScrollArea className="h-[calc(100vh-20rem)] border rounded-md p-4 bg-muted/30">
                           <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: contractSource.data.contractBody.replace(/\n/g, '<br />') }} />
                        </ScrollArea>
                    ) : contractSource?.type === 'uploaded' ? (
                        <div className="h-[calc(100vh-20rem)] border rounded-md bg-muted/30">
                            <iframe 
                                src={`data:application/pdf;base64,${contractSource.data}`}
                                title="Contract PDF Viewer"
                                className="w-full h-full"
                                style={{ border: 'none' }}
                            />
                        </div>
                    ) : null}
                </CardContent>
             </Card>
        </div>
    );
}
