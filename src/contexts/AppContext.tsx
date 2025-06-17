
"use client";

import type { Tenant, Payment, AppContextType, AppState, Client, ManagedUser } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } 
from '@/contexts/AuthContext';

// Correct AppContextType for export
export interface AppContextTypeWithRawData extends AppContextType {
  rawManagedUsers: ManagedUser[];
  // If needed, rawClients, rawTenants, rawPayments could also be exposed
  // but rawManagedUsers is the primary one needed by AuthContext login via LoginPage
}


const AppContext = createContext<AppContextTypeWithRawData | undefined>(undefined);


const initialClients: Client[] = [
  { id: 'client-main-street', name: 'Main Street Properties' },
  { id: 'client-oak-view', name: 'Oak View Rentals' },
];

const initialManagedUsers: ManagedUser[] = [
    { id: uuidv4(), username: 'clientAdminMain', email: 'main.admin@msp.com', clientId: initialClients[0].id, password: 'password123' },
    { id: uuidv4(), username: 'clientStaffMain', email: 'main.staff@msp.com', clientId: initialClients[0].id, password: 'password123' },
    { id: uuidv4(), username: 'clientAdminOak', email: 'oak.admin@ovr.com', clientId: initialClients[1].id, password: 'password123' },
];

const initialTenantsRaw: Tenant[] = [
  { id: uuidv4(), name: 'Alice Wonderland', email: 'alice@example.com', phone: '123-456-7890', monthlyRentalRate: 1200, status: 'active', joinDate: new Date(2023, 0, 15).toISOString(), clientId: initialClients[0].id },
  { id: uuidv4(), name: 'Bob The Builder', email: 'bob@example.com', phone: '987-654-3210', monthlyRentalRate: 950, status: 'active', joinDate: new Date(2022, 5, 1).toISOString(), clientId: initialClients[1].id },
  { id: uuidv4(), name: 'Charlie Brown', email: 'charlie@example.com', phone: '555-555-5555', monthlyRentalRate: 1500, status: 'inactive', joinDate: new Date(2023, 2, 10).toISOString(), clientId: initialClients[0].id },
  { id: uuidv4(), name: 'Diana Prince (Global)', email: 'diana@example.com', phone: '111-222-3333', monthlyRentalRate: 1100, status: 'active', joinDate: new Date(2023, 4, 20).toISOString() }, 
];

const initialPaymentsRaw: Payment[] = [
  { id: uuidv4(), tenantId: initialTenantsRaw[0].id, date: new Date(2024, 0, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer', clientId: initialTenantsRaw[0].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[0].id, date: new Date(2024, 1, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer', clientId: initialTenantsRaw[0].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[1].id, date: new Date(2024, 0, 1).toISOString(), amount: 950, paymentMethod: 'Credit Card', clientId: initialTenantsRaw[1].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[1].id, date: new Date(2024, 1, 3).toISOString(), amount: 500, paymentMethod: 'Credit Card', clientId: initialTenantsRaw[1].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[3].id, date: new Date(2024, 0, 20).toISOString(), amount: 1100, paymentMethod: 'Cash' }, 
];


const LOCAL_STORAGE_KEY = 'tenantTrackerData';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth(); 
  const [rawTenantsState, setRawTenantsState] = useState<Tenant[]>([]);
  const [rawPaymentsState, setRawPaymentsState] = useState<Payment[]>([]);
  const [clientsState, setClientsState] = useState<Client[]>([]);
  const [rawManagedUsersState, setRawManagedUsersState] = useState<ManagedUser[]>([]); 
  const [viewingAsClientId, setViewingAsClientId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      try {
        const parsedData: AppState = JSON.parse(storedData);
        setRawTenantsState(parsedData.rawTenants || initialTenantsRaw);
        setRawPaymentsState(parsedData.rawPayments || initialPaymentsRaw);
        setClientsState(parsedData.clients || initialClients);
        setRawManagedUsersState(parsedData.rawManagedUsers || initialManagedUsers); 
        setViewingAsClientId(parsedData.viewingAsClientId || null);
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setRawTenantsState(initialTenantsRaw);
        setRawPaymentsState(initialPaymentsRaw);
        setClientsState(initialClients);
        setRawManagedUsersState(initialManagedUsers); 
        setViewingAsClientId(null);
      }
    } else {
      setRawTenantsState(initialTenantsRaw);
      setRawPaymentsState(initialPaymentsRaw);
      setClientsState(initialClients);
      setRawManagedUsersState(initialManagedUsers); 
      setViewingAsClientId(null);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) { 
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ 
        rawTenants: rawTenantsState, 
        rawPayments: rawPaymentsState, 
        clients: clientsState, 
        rawManagedUsers: rawManagedUsersState, 
        viewingAsClientId 
      }));
    }
  }, [rawTenantsState, rawPaymentsState, clientsState, rawManagedUsersState, viewingAsClientId, isLoaded]);

  const setViewMode = (clientId: string | null) => {
    setViewingAsClientId(clientId);
  };

  const tenants = useMemo(() => {
    if (!isLoaded || !authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      if (viewingAsClientId === null) { 
        return rawTenantsState; 
      }
      return rawTenantsState.filter(t => t.clientId === viewingAsClientId);
    } else if (authUser?.clientId) { 
      return rawTenantsState.filter(t => t.clientId === authUser.clientId);
    }
    return []; 
  }, [rawTenantsState, viewingAsClientId, isLoaded, authUser, authIsAuthenticated]);

  const payments = useMemo(() => {
    if (!isLoaded || !authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      if (viewingAsClientId === null) {
        return rawPaymentsState;
      }
      return rawPaymentsState.filter(p => p.clientId === viewingAsClientId);
    } else if (authUser?.clientId) {
      return rawPaymentsState.filter(p => p.clientId === authUser.clientId);
    }
    return [];
  }, [rawPaymentsState, viewingAsClientId, isLoaded, authUser, authIsAuthenticated]);

  const managedUsers = useMemo(() => { 
    if (!isLoaded || !authIsAuthenticated) return [];
     if (authUser?.isSuperAdmin) {
        if (viewingAsClientId === null) { 
            return rawManagedUsersState;
        }
        return rawManagedUsersState.filter(mu => mu.clientId === viewingAsClientId);
     } else if (authUser?.clientId) { 
        return rawManagedUsersState.filter(mu => mu.clientId === authUser.clientId);
     }
    return [];
  }, [rawManagedUsersState, viewingAsClientId, isLoaded, authUser, authIsAuthenticated]);


  const addTenant = (tenantData: Omit<Tenant, 'id' | 'clientId'>) => {
    let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }
    
    const newTenant: Tenant = { 
      ...tenantData, 
      id: uuidv4(),
      ...(determinedClientId && { clientId: determinedClientId }) 
    };
    setRawTenantsState(prev => [...prev, newTenant]);
  };

  const updateTenant = (updatedTenant: Tenant) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId && updatedTenant.clientId !== authUser.clientId) {
      console.error("Permission denied: Client user cannot update tenants of other clients.");
      return; 
    }
    setRawTenantsState(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
  };

  const addPayment = (paymentData: Omit<Payment, 'id' | 'clientId'>) => {
     let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }

    const newPayment: Payment = { 
      ...paymentData, 
      id: uuidv4(),
      ...(determinedClientId && { clientId: determinedClientId })
     };
    setRawPaymentsState(prev => [...prev, newPayment]);
  };

  const addClient = (clientData: Omit<Client, 'id'>) => {
    if (!authUser?.isSuperAdmin) return; 
    const newClient = { ...clientData, id: uuidv4() };
    setClientsState(prev => [...prev, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    if (!authUser?.isSuperAdmin) return;
    setClientsState(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const deleteClient = (clientId: string) => {
    if (!authUser?.isSuperAdmin) return;
    setClientsState(prev => prev.filter(c => c.id !== clientId));
    setRawTenantsState(prev => prev.filter(t => t.clientId !== clientId));
    setRawPaymentsState(prev => prev.filter(p => p.clientId !== clientId));
    setRawManagedUsersState(prev => prev.filter(u => u.clientId !== clientId));
  };

  const addManagedUser = (userData: Omit<ManagedUser, 'id'>) => {
    if (!userData.clientId) {
        console.error("Cannot add managed user: clientId is missing from userData.");
        return; 
    }
    if (!authUser?.isSuperAdmin && authUser?.clientId && userData.clientId !== authUser.clientId) {
      console.error("Permission denied: Client user cannot add users to other clients.");
      return;
    }
    const newUserWithId = { ...userData, id: uuidv4() };
    setRawManagedUsersState(prev => [...prev, newUserWithId]);
  };

  const updateManagedUser = (updatedUser: ManagedUser) => {
     if (!updatedUser.clientId) {
        console.error("Cannot update managed user: clientId is missing.");
        return;
    }
    if (!authUser?.isSuperAdmin && authUser?.clientId && updatedUser.clientId !== authUser.clientId) {
      console.error("Permission denied: Client user cannot update users of other clients.");
      return;
    }
    setRawManagedUsersState(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
  };

  const deleteManagedUser = (userId: string) => {
    const userToDelete = rawManagedUsersState.find(u => u.id === userId);
    if (!userToDelete) return;

    if (!authUser?.isSuperAdmin && authUser?.clientId && userToDelete.clientId !== authUser.clientId) {
      console.error("Permission denied: Client user cannot delete users of other clients.");
      return;
    }
    setRawManagedUsersState(prev => prev.filter(u => u.id !== userId));
  };

  const contextValue: AppContextTypeWithRawData = {
    tenants,
    payments,
    clients: clientsState, // Use clientsState directly as it's not filtered by authUser
    managedUsers,
    viewingAsClientId,
    setViewMode,
    addTenant,
    updateTenant,
    addPayment,
    addClient,
    updateClient,
    deleteClient,
    addManagedUser,
    updateManagedUser,
    deleteManagedUser,
    rawManagedUsers: rawManagedUsersState, // Expose raw state for login page
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextTypeWithRawData => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context; 
};
