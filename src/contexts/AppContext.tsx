

"use client";

import type { Tenant, Payment, AppContextType, AppState, Client, ManagedUser } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialClients: Client[] = [
  { id: uuidv4(), name: 'Main Street Properties' },
  { id: uuidv4(), name: 'Oak View Rentals' },
];

const initialTenantsRaw: Tenant[] = [
  { id: uuidv4(), name: 'Alice Wonderland', email: 'alice@example.com', phone: '123-456-7890', monthlyRentalRate: 1200, status: 'active', joinDate: new Date(2023, 0, 15).toISOString(), clientId: initialClients[0].id },
  { id: uuidv4(), name: 'Bob The Builder', email: 'bob@example.com', phone: '987-654-3210', monthlyRentalRate: 950, status: 'active', joinDate: new Date(2022, 5, 1).toISOString(), clientId: initialClients[1].id },
  { id: uuidv4(), name: 'Charlie Brown', email: 'charlie@example.com', phone: '555-555-5555', monthlyRentalRate: 1500, status: 'inactive', joinDate: new Date(2023, 2, 10).toISOString(), clientId: initialClients[0].id },
  { id: uuidv4(), name: 'Diana Prince', email: 'diana@example.com', phone: '111-222-3333', monthlyRentalRate: 1100, status: 'active', joinDate: new Date(2023, 4, 20).toISOString() }, // No client ID
];

const initialPaymentsRaw: Payment[] = [
  { id: uuidv4(), tenantId: initialTenantsRaw[0].id, date: new Date(2024, 0, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer', clientId: initialTenantsRaw[0].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[0].id, date: new Date(2024, 1, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer', clientId: initialTenantsRaw[0].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[1].id, date: new Date(2024, 0, 1).toISOString(), amount: 950, paymentMethod: 'Credit Card', clientId: initialTenantsRaw[1].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[1].id, date: new Date(2024, 1, 3).toISOString(), amount: 500, paymentMethod: 'Credit Card', clientId: initialTenantsRaw[1].clientId },
  { id: uuidv4(), tenantId: initialTenantsRaw[3].id, date: new Date(2024, 0, 20).toISOString(), amount: 1100, paymentMethod: 'Cash' }, // No client ID
];

const initialManagedUsers: ManagedUser[] = [
    { id: uuidv4(), username: 'clientAdminMain', email: 'main.admin@msp.com', clientId: initialClients[0].id },
    { id: uuidv4(), username: 'clientStaffMain', email: 'main.staff@msp.com', clientId: initialClients[0].id },
    { id: uuidv4(), username: 'clientAdminOak', email: 'oak.admin@ovr.com', clientId: initialClients[1].id },
];

const LOCAL_STORAGE_KEY = 'tenantTrackerData';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [rawTenants, setRawTenants] = useState<Tenant[]>([]);
  const [rawPayments, setRawPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rawManagedUsers, setRawManagedUsers] = useState<ManagedUser[]>([]); // Added
  const [viewingAsClientId, setViewingAsClientId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      try {
        const parsedData: AppState = JSON.parse(storedData);
        setRawTenants(parsedData.rawTenants || initialTenantsRaw);
        setRawPayments(parsedData.rawPayments || initialPaymentsRaw);
        setClients(parsedData.clients || initialClients);
        setRawManagedUsers(parsedData.rawManagedUsers || initialManagedUsers); // Added
        setViewingAsClientId(parsedData.viewingAsClientId || null);
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setRawTenants(initialTenantsRaw);
        setRawPayments(initialPaymentsRaw);
        setClients(initialClients);
        setRawManagedUsers(initialManagedUsers); // Added
        setViewingAsClientId(null);
      }
    } else {
      setRawTenants(initialTenantsRaw);
      setRawPayments(initialPaymentsRaw);
      setClients(initialClients);
      setRawManagedUsers(initialManagedUsers); // Added
      setViewingAsClientId(null);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ rawTenants, rawPayments, clients, rawManagedUsers, viewingAsClientId }));
    }
  }, [rawTenants, rawPayments, clients, rawManagedUsers, viewingAsClientId, isLoaded]);

  const setViewMode = (clientId: string | null) => {
    setViewingAsClientId(clientId);
  };

  const tenants = useMemo(() => {
    if (!isLoaded) return [];
    // For super admin global view (viewingAsClientId is null), show all tenants without explicit client ID or those explicitly unassigned
    if (viewingAsClientId === null) {
        return rawTenants; 
    }
    // For client-specific view, filter by clientId
    return rawTenants.filter(t => t.clientId === viewingAsClientId);
  }, [rawTenants, viewingAsClientId, isLoaded]);

  const payments = useMemo(() => {
    if (!isLoaded) return [];
     if (viewingAsClientId === null) {
        return rawPayments;
    }
    return rawPayments.filter(p => p.clientId === viewingAsClientId);
  }, [rawPayments, viewingAsClientId, isLoaded]);

  const managedUsers = useMemo(() => { // For now, admin user management page will handle its own filtering if needed. This provides all.
    if(!isLoaded) return [];
    return rawManagedUsers;
  }, [rawManagedUsers, isLoaded]);


  const addTenant = (tenantData: Omit<Tenant, 'id' | 'clientId'>) => {
    const newTenant: Tenant = { 
      ...tenantData, 
      id: uuidv4(),
      // Assign clientId if admin is viewing as a specific client, otherwise it's unassigned (global)
      ...(viewingAsClientId && { clientId: viewingAsClientId }) 
    };
    setRawTenants(prev => [...prev, newTenant]);
  };

  const updateTenant = (updatedTenant: Tenant) => {
    setRawTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
  };

  const addPayment = (paymentData: Omit<Payment, 'id' | 'clientId'>) => {
    const newPayment: Payment = { 
      ...paymentData, 
      id: uuidv4(),
      ...(viewingAsClientId && { clientId: viewingAsClientId })
     };
    setRawPayments(prev => [...prev, newPayment]);
  };

  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newClient = { ...clientData, id: uuidv4() };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const deleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    // Optionally, also remove associated tenants, payments, and users, or reassign them.
    // For now, leaving them as potentially "orphaned" or to be handled by more specific logic later.
  };

  const addManagedUser = (userData: Omit<ManagedUser, 'id'>) => {
    const newUser = { ...userData, id: uuidv4() };
    setRawManagedUsers(prev => [...prev, newUser]);
  };

  const updateManagedUser = (updatedUser: ManagedUser) => {
    setRawManagedUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const deleteManagedUser = (userId: string) => {
    setRawManagedUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <AppContext.Provider value={{ 
      tenants, 
      payments, 
      clients, 
      managedUsers, // Added
      viewingAsClientId,
      setViewMode,
      addTenant, 
      updateTenant, 
      addPayment, 
      addClient, 
      updateClient, 
      deleteClient,
      addManagedUser, // Added
      updateManagedUser, // Added
      deleteManagedUser // Added
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

