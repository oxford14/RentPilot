
"use client";

import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ViewContractPage() {
    const { tenants } = useAppContext();
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const tenantId = params.tenantId as string;
    
    const tenant = React.useMemo(() => tenants.find(t => t.id === tenantId), [tenants, tenantId]);
    
    const isAuthorized = React.useMemo(() => {
        if (!user || !tenant) return false;
        // Tenant can view their own contract
        if (user.role === 'tenant' && user.tenantId === tenant.id) return true;
        // Admin for that client can view
        if (user.role === 'admin' && user.clientId === tenant.clientId) return true;
        // Super admin can view
        if (user.isSuperAdmin) return true;
        return false;
    }, [user, tenant]);

    React.useEffect(() => {
        if (tenants.length > 0 && !tenant) {
            toast({ variant: 'destructive', title: 'Not Found', description: 'The requested tenant could not be found.' });
            router.push('/');
        }
        if (tenant && !isAuthorized) {
            toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to view this contract.' });
            router.push('/');
        }
    }, [tenant, isAuthorized, router, toast, tenants.length]);


    if (!tenant || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-lg text-muted-foreground">Loading contract...</p>
            </div>
        );
    }
    
    if (!tenant.signedContractUrl) {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-xl font-semibold">No Contract Found</h1>
                    <p className="text-muted-foreground">This tenant does not have a signed contract on file.</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    const proxiedUrl = `/api/contract-proxy?url=${encodeURIComponent(tenant.signedContractUrl)}`;

    return (
        <div className="w-full h-[calc(100vh-theme(spacing.16))] flex flex-col">
            <div className="flex-shrink-0 p-2 bg-background border-b text-center">
                 <p className="text-sm text-muted-foreground">Viewing signed contract for <span className="font-semibold text-foreground">{tenant.name}</span></p>
            </div>
            <iframe src={proxiedUrl} className="w-full h-full border-0" title={`Contract for ${tenant.name}`} />
        </div>
    );
}
