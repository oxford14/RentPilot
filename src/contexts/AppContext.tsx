
"use client";

import type { Tenant, Payment, AppContextType, Client, ManagedUser, ClientUserRole, SuperAdminUser, Expense, ExpenseCategory, AttemptDeleteTenantResult, PaymentMethod } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { expenseCategories as definedExpenseCategories } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
  DocumentReference,
  DocumentData,
  getDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast'; // Ensure useToast is imported

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_TIMEZONE_KEY = 'rentPilotSystemTimezone';
const DEFAULT_TIMEZONE = 'Etc/UTC';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();
  const { toast } = useToast(); // Initialize toast

  // Raw data states from Firestore
  const [rawClientsState, setRawClientsState] = useState<Client[]>([]);
  const [rawTenantsState, setRawTenantsState] = useState<Tenant[]>([]);
  const [rawPaymentsState, setRawPaymentsState] = useState<Payment[]>([]);
  const [rawManagedUsersState, setRawManagedUsersState] = useState<ManagedUser[]>([]);
  const [rawSuperAdminUsersState, setRawSuperAdminUsersState] = useState<SuperAdminUser[]>([]);
  const [rawExpensesState, setRawExpensesState] = useState<Expense[]>([]);

  const [viewingAsClientId, setViewingAsClientId] = useState<string | null>(null);
  const [systemTimezoneState, setSystemTimezoneState] = useState<string>(DEFAULT_TIMEZONE);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);


  // Load systemTimezone from localStorage
  useEffect(() => {
    const storedTimezone = localStorage.getItem(LOCAL_STORAGE_TIMEZONE_KEY);
    setSystemTimezoneState(storedTimezone || DEFAULT_TIMEZONE);
  }, []);

  // Save systemTimezone to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TIMEZONE_KEY, systemTimezoneState);
  }, [systemTimezoneState]);


  // Firestore listeners
  useEffect(() => {
    if (!authIsAuthenticated) {
      // Clear data if user is not authenticated
      setRawClientsState([]);
      setRawTenantsState([]);
      setRawPaymentsState([]);
      setRawManagedUsersState([]);
      // setRawSuperAdminUsersState([]); // Keep super admin users if needed for some views, or clear if strict
      setRawExpensesState([]);
      setIsDataLoading(false);
      setInitialLoadComplete(false); // Reset load complete flag
      return;
    }

    setIsDataLoading(true);
    setInitialLoadComplete(false);
    let loadedCollectionsCount = 0;
    const totalCollectionsToLoad = 6; // Update this if you add/remove collections

    const listeners: Array<() => void> = [];

    const collectionsToListen = [
      { name: 'clients', setter: setRawClientsState },
      { name: 'tenants', setter: setRawTenantsState },
      { name: 'payments', setter: setRawPaymentsState },
      { name: 'managedUsers', setter: setRawManagedUsersState },
      { name: 'superAdminUsers', setter: setRawSuperAdminUsersState },
      { name: 'expenses', setter: setRawExpensesState },
    ];

    collectionsToListen.forEach(coll => {
      const q = query(collection(db, coll.name));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        coll.setter(items);
        if (!initialLoadComplete) {
          loadedCollectionsCount++;
          if (loadedCollectionsCount >= totalCollectionsToLoad) {
            setIsDataLoading(false);
            setInitialLoadComplete(true);
          }
        }
      }, (error) => {
        console.error(`Error fetching ${coll.name}: `, error);
        toast({ variant: "destructive", title: `Error loading ${coll.name}`, description: error.message });
        setIsDataLoading(false); // Stop loading on error for this collection
      });
      listeners.push(unsubscribe);
    });
    
    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [authIsAuthenticated, toast, initialLoadComplete]);

  const setViewMode = (clientId: string | null) => {
    setViewingAsClientId(clientId);
  };

  const updateSystemTimezone = (timezone: string) => {
    setSystemTimezoneState(timezone);
  };

  // Filtered data based on auth user and view mode
  const tenants = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      return viewingAsClientId === null
        ? rawTenantsState.filter(t => !t.clientId) // Global tenants
        : rawTenantsState.filter(t => t.clientId === viewingAsClientId);
    }
    return rawTenantsState.filter(t => t.clientId === authUser?.clientId);
  }, [rawTenantsState, viewingAsClientId, authUser, authIsAuthenticated]);

  const payments = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      return viewingAsClientId === null
        ? rawPaymentsState.filter(p => !p.clientId) // Global payments
        : rawPaymentsState.filter(p => p.clientId === viewingAsClientId);
    }
    return rawPaymentsState.filter(p => p.clientId === authUser?.clientId);
  }, [rawPaymentsState, viewingAsClientId, authUser, authIsAuthenticated]);
  
  const expenses = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      return viewingAsClientId === null
        ? rawExpensesState.filter(e => !e.clientId) // Global expenses
        : rawExpensesState.filter(e => e.clientId === viewingAsClientId);
    }
    return rawExpensesState.filter(e => e.clientId === authUser?.clientId);
  }, [rawExpensesState, viewingAsClientId, authUser, authIsAuthenticated]);

  const managedUsers = useMemo(() => {
    if (!authIsAuthenticated) return [];
    const currentContextClientId = authUser?.isSuperAdmin ? viewingAsClientId : authUser?.clientId;
    if (!currentContextClientId && authUser?.isSuperAdmin) return []; // Super admin global view for "All Client Users" lists from raw.
    if (!currentContextClientId) return [];
    return rawManagedUsersState.filter(mu => mu.clientId === currentContextClientId);
  }, [rawManagedUsersState, viewingAsClientId, authUser, authIsAuthenticated]);


  // CRUD Operations with error handling
  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'clientId'>) => {
    let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }
    const newTenantData: Omit<Tenant, 'id'> = {
      ...tenantData,
      ...(determinedClientId && { clientId: determinedClientId })
    };
    try {
      await addDoc(collection(db, 'tenants'), newTenantData);
    } catch (error: any) {
      console.error("Error adding tenant to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add tenant: ${error.message}` });
    }
  };

  const updateTenant = async (updatedTenant: Tenant) => {
    const { id, ...dataToUpdate } = updatedTenant;
    try {
      await setDoc(doc(db, 'tenants', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating tenant in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update tenant: ${error.message}` });
    }
  };

  const attemptDeleteTenant = async (tenantId: string): Promise<AttemptDeleteTenantResult> => {
    const tenantDocRef = doc(db, 'tenants', tenantId);
    try {
      const tenantSnapshot = await getDoc(tenantDocRef);
      if (!tenantSnapshot.exists()) {
        toast({ variant: "destructive", title: "Not Found", description: "Tenant not found." });
        return { success: false, message: 'Tenant not found.', action: 'not_found' };
      }
      const tenantData = {id: tenantSnapshot.id, ...tenantSnapshot.data()} as Tenant;

      const paymentsQuery = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
      const paymentDocs = await getDocs(paymentsQuery);
      const hasPaymentHistory = !paymentDocs.empty;

      if (hasPaymentHistory) {
        await updateDoc(tenantDocRef, { status: 'inactive' });
        return { success: true, message: `Tenant "${tenantData.name}" marked as inactive.`, action: 'inactivated' };
      } else {
        await deleteDoc(tenantDocRef);
        return { success: true, message: `Tenant "${tenantData.name}" permanently deleted.`, action: 'deleted' };
      }
    } catch (error: any) {
      console.error("Error attempting to delete tenant:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete/inactivate tenant: ${error.message}` });
      return { success: false, message: `Operation failed: ${error.message}`, action: 'error' };
    }
  };
  
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number; discountDescription?: string; paymentMethod?: PaymentMethod }) => {
    let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }
     const newPaymentData: Omit<Payment, 'id'> = {
      tenantId: paymentData.tenantId,
      date: paymentData.date,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      discountApplied: paymentData.discountApplied || 0,
      discountDescription: paymentData.discountDescription || '',
      ...(determinedClientId && { clientId: determinedClientId })
     };
    try {
      await addDoc(collection(db, 'payments'), newPaymentData);
    } catch (error: any) {
      console.error("Error adding payment to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add payment: ${error.message}` });
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'clientId'>) => {
    let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }
    const newExpenseData: Omit<Expense, 'id'> = {
      ...expenseData,
      ...(determinedClientId && { clientId: determinedClientId })
    };
    try {
      await addDoc(collection(db, 'expenses'), newExpenseData);
    } catch (error: any) {
      console.error("Error adding expense to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add expense: ${error.message}` });
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    const { id, ...dataToUpdate } = updatedExpense;
    try {
      await setDoc(doc(db, 'expenses', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating expense in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update expense: ${error.message}` });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (error: any) {
      console.error("Error deleting expense from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete expense: ${error.message}` });
    }
  };

  const addClient = async (clientData: Omit<Client, 'id'>) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to add clients." });
      return;
    }
    try {
      await addDoc(collection(db, 'clients'), clientData);
    } catch (error: any) {
      console.error("Error adding client to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add client: ${error.message}` });
    }
  };

  const updateClient = async (updatedClient: Client) => {
    if (!authUser?.isSuperAdmin) {
       toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to update clients." });
       return;
    }
    const { id, ...dataToUpdate } = updatedClient;
    try {
      await setDoc(doc(db, 'clients', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating client in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update client: ${error.message}` });
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to delete clients." });
      return;
    }
    const batch = writeBatch(db);
    try {
      batch.delete(doc(db, 'clients', clientId));
      const collectionsToDelete = ['tenants', 'payments', 'managedUsers', 'expenses'];
      for (const collName of collectionsToDelete) {
        const q = query(collection(db, collName), where('clientId', '==', clientId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
      }
      await batch.commit();
    } catch (error: any) {
      console.error("Error deleting client and associated data from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete client: ${error.message}` });
    }
  };
  
  const addManagedUser = async (userData: Omit<ManagedUser, 'id'>) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== userData.clientId) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
      return;
    }
    try {
      await addDoc(collection(db, 'managedUsers'), { ...userData, role: userData.role || 'user' });
    } catch (error: any) {
      console.error("Error adding managed user to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add user: ${error.message}` });
    }
  };

  const updateManagedUser = async (updatedUser: ManagedUser) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== updatedUser.clientId && authUser?.username !== updatedUser.username) { // Allow self-update
        toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
        return;
    }
    const { id, ...dataToUpdate } = updatedUser;
    try {
      await setDoc(doc(db, 'managedUsers', id), { ...dataToUpdate, role: updatedUser.role || 'user' }, { merge: true });
    } catch (error: any) {
      console.error("Error updating managed user in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update user: ${error.message}` });
    }
  };

  const deleteManagedUser = async (userId: string) => {
    const userToDelete = rawManagedUsersState.find(u => u.id === userId);
    if (!userToDelete) {
        toast({ variant: "destructive", title: "Not Found", description: "User to delete not found." });
        return;
    }
    if (!authUser?.isSuperAdmin && authUser?.clientId !== userToDelete.clientId) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
      return;
    }
    try {
      await deleteDoc(doc(db, 'managedUsers', userId));
    } catch (error: any) {
      console.error("Error deleting managed user from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete user: ${error.message}` });
    }
  };

  const addSuperAdminUser = async (userData: Omit<SuperAdminUser, 'id'>) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
      return;
    }
    try {
      await addDoc(collection(db, 'superAdminUsers'), userData);
    } catch (error: any) {
      console.error("Error adding super admin user to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add super admin: ${error.message}` });
    }
  };

  const updateSuperAdminUser = async (updatedUser: SuperAdminUser) => {
    if (!authUser?.isSuperAdmin) {
       toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
       return;
    }
    const { id, ...dataToUpdate } = updatedUser;
    try {
      await setDoc(doc(db, 'superAdminUsers', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating super admin user in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update super admin: ${error.message}` });
    }
  };

  const deleteSuperAdminUser = async (userId: string) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
      return;
    }
    try {
      await deleteDoc(doc(db, 'superAdminUsers', userId));
    } catch (error: any) {
      console.error("Error deleting super admin user from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete super admin: ${error.message}` });
    }
  };


  const contextValue: AppContextType = {
    tenants,
    payments,
    clients: rawClientsState,
    managedUsers,
    rawSuperAdminUsers: rawSuperAdminUsersState,
    expenses,
    expenseCategories: definedExpenseCategories,
    viewingAsClientId,
    systemTimezone: systemTimezoneState,

    setViewMode,
    updateSystemTimezone,

    addTenant,
    updateTenant,
    attemptDeleteTenant,
    addPayment,
    addClient,
    updateClient,
    deleteClient,
    addManagedUser,
    updateManagedUser,
    deleteManagedUser,
    addSuperAdminUser,
    updateSuperAdminUser,
    deleteSuperAdminUser,
    addExpense,
    updateExpense,
    deleteExpense,
    rawManagedUsers: rawManagedUsersState,
  };

  if (isDataLoading && authIsAuthenticated) { // Only show app-wide loader if authenticated and loading
    return (
      <AppContext.Provider value={contextValue as AppContextType}>
        <div className="flex h-screen w-full items-center justify-center">
          Loading application data...
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

