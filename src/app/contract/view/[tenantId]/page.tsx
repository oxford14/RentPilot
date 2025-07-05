
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileWarning, AlertTriangle, FileText } from 'lucide-react';
import type { Tenant, SignedContract } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type ContractSource = 
  | { type: 'signed', data: SignedContract }
  | { type: 'uploaded', data: string } // data will be the proxy URL
  | null;

export default function ContractViewerPage() {
    const params = useParams();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { tenants, signedContracts } = useAppContext();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contractSource, setContractSource] = useState<ContractSource>(null);

    const tenantId = params.tenantId as string;

    useEffect(() => {
        // Guard against running before essential data is loaded.
        if (isAuthLoading || !user) {
            return;
        }

        // The context provides filtered tenants. If it's empty, we either
        // have no tenants for this user, or they haven't loaded yet.
        // We set loading to false to show either the content or the "not found" message.
        if (tenants.length === 0 && !isAuthLoading) {
            setIsLoading(false);
        }

        const tenant = tenants.find(t => t.id === tenantId);

        if (!tenant) {
            // Only set an error if tenants are loaded but the specific one isn't found.
            if (tenants.length > 0) {
                 setError("Tenant not found for the provided ID.");
            }
            setIsLoading(false);
            return;
        }

        // Reset error if tenant is found on a subsequent run
        setError(null);

        // Authorization Check
        const isSuperAdmin = user.isSuperAdmin;
        const isOwnerOrAdmin = user.clientId === tenant.clientId;
        const isTheTenant = user.tenantId === tenant.id;

        if (!isSuperAdmin && !isOwnerOrAdmin && !isTheTenant) {
             setError("You are not authorized to view this contract.");
             setIsLoading(false);
             return;
        }

        // Determine contract source
        if (tenant.activeContractId) {
            const contract = signedContracts.find(c => c.id === tenant.activeContractId);
            if (contract) {
                setContractSource({ type: 'signed', data: contract });
            } else if (signedContracts.length > 0) { // Only show error if contracts are loaded but not found
                setError("Digitally signed contract record could not be found.");
            }
        } else if (tenant.contractUrl) {
            const proxyUrl = `/api/contract-proxy?url=${encodeURIComponent(tenant.contractUrl)}`;
            setContractSource({ type: 'uploaded', data: proxyUrl });
        } else {
            setContractSource(null);
        }

        setIsLoading(false);

    }, [isAuthLoading, user, tenantId, tenants, signedContracts]);

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
    
    if (!contractSource) {
         return (
            <div className="container mx-auto py-8 text-center">
                 <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>No Contract Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There is no contract on file for the selected tenant.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tenantForTitle = tenants.find(t => t.id === tenantId);

    return (
        <div className="container mx-auto py-2">
             <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>Contract for {tenantForTitle?.name || '...'}</CardTitle>
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
                                src={contractSource.data}
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
