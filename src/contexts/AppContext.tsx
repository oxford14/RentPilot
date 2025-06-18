
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
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_TIMEZONE_KEY = 'rentPilotSystemTimezone';
const DEFAULT_TIMEZONE = 'Etc/UTC';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();

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
    setIsDataLoading(true);
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
      }, (error) => {
        console.error(`Error fetching ${coll.name}: `, error);
      });
      listeners.push(unsubscribe);
    });
    
    // Simulate data loading finished after initial fetch setup
    // A more robust solution would track loading state for each collection
    const timer = setTimeout(() => setIsDataLoading(false), 1500); // Adjust timing as needed
    listeners.push(() => clearTimeout(timer));


    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, []);

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

  const managedUsers = useMemo(() => { // This list is for the current client context
    if (!authIsAuthenticated) return [];
    const currentContextClientId = authUser?.isSuperAdmin ? viewingAsClientId : authUser?.clientId;
    if (!currentContextClientId) return []; // Super admin global view, no specific client users here
    return rawManagedUsersState.filter(mu => mu.clientId === currentContextClientId);
  }, [rawManagedUsersState, viewingAsClientId, authUser, authIsAuthenticated]);


  // CRUD Operations
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
    await addDoc(collection(db, 'tenants'), newTenantData);
  };

  const updateTenant = async (updatedTenant: Tenant) => {
    const { id, ...dataToUpdate } = updatedTenant;
    await setDoc(doc(db, 'tenants', id), dataToUpdate, { merge: true });
  };

  const attemptDeleteTenant = async (tenantId: string): Promise<AttemptDeleteTenantResult> => {
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const tenantSnapshot = await getDocs(query(collection(db, 'tenants'), where('id', '==', tenantId))); // Firestore does not return doc on ref
     if (tenantSnapshot.empty) {
      return { success: false, message: 'Tenant not found.', action: 'not_found' };
    }
    const tenantData = {id: tenantSnapshot.docs[0].id, ...tenantSnapshot.docs[0].data()} as Tenant;


    const paymentsQuery = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
    const paymentDocs = await getDocs(paymentsQuery);
    const hasPaymentHistory = !paymentDocs.empty;

    if (hasPaymentHistory) {
      await updateDoc(tenantDocRef, { status: 'inactive' });
      return { success: true, message: `Tenant "${tenantData.name}" marked as inactive due to payment history.`, action: 'inactivated' };
    } else {
      await deleteDoc(tenantDocRef);
      return { success: true, message: `Tenant "${tenantData.name}" permanently deleted.`, action: 'deleted' };
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
    await addDoc(collection(db, 'payments'), newPaymentData);
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
    await addDoc(collection(db, 'expenses'), newExpenseData);
  };

  const updateExpense = async (updatedExpense: Expense) => {
    const { id, ...dataToUpdate } = updatedExpense;
    await setDoc(doc(db, 'expenses', id), dataToUpdate, { merge: true });
  };

  const deleteExpense = async (expenseId: string) => {
    await deleteDoc(doc(db, 'expenses', expenseId));
  };

  const addClient = async (clientData: Omit<Client, 'id'>) => {
    if (!authUser?.isSuperAdmin) return;
    await addDoc(collection(db, 'clients'), clientData);
  };

  const updateClient = async (updatedClient: Client) => {
    if (!authUser?.isSuperAdmin) return;
    const { id, ...dataToUpdate } = updatedClient;
    await setDoc(doc(db, 'clients', id), dataToUpdate, { merge: true });
  };

  const deleteClient = async (clientId: string) => {
    if (!authUser?.isSuperAdmin) return;
    // Note: This is a simplified delete. In production, you'd want a transaction
    // or a Cloud Function to delete associated tenants, payments, users, expenses.
    const batch = writeBatch(db);

    // Delete client
    batch.delete(doc(db, 'clients', clientId));

    // Query and delete associated data
    const collectionsToDelete = ['tenants', 'payments', 'managedUsers', 'expenses'];
    for (const collName of collectionsToDelete) {
      const q = query(collection(db, collName), where('clientId', '==', clientId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    await batch.commit();
  };
  
  const addManagedUser = async (userData: Omit<ManagedUser, 'id'>) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== userData.clientId) return;
    await addDoc(collection(db, 'managedUsers'), { ...userData, role: userData.role || 'user' });
  };

  const updateManagedUser = async (updatedUser: ManagedUser) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== updatedUser.clientId) return;
    const { id, ...dataToUpdate } = updatedUser;
    await setDoc(doc(db, 'managedUsers', id), { ...dataToUpdate, role: updatedUser.role || 'user' }, { merge: true });
  };

  const deleteManagedUser = async (userId: string) => {
    const userToDelete = rawManagedUsersState.find(u => u.id === userId);
    if (!userToDelete) return;
    if (!authUser?.isSuperAdmin && authUser?.clientId !== userToDelete.clientId) return;
    await deleteDoc(doc(db, 'managedUsers', userId));
  };

  const addSuperAdminUser = async (userData: Omit<SuperAdminUser, 'id'>) => {
    if (!authUser?.isSuperAdmin) return;
    await addDoc(collection(db, 'superAdminUsers'), userData);
  };

  const updateSuperAdminUser = async (updatedUser: SuperAdminUser) => {
    if (!authUser?.isSuperAdmin) return;
    const { id, ...dataToUpdate } = updatedUser;
    await setDoc(doc(db, 'superAdminUsers', id), dataToUpdate, { merge: true });
  };

  const deleteSuperAdminUser = async (userId: string) => {
    if (!authUser?.isSuperAdmin) return;
    await deleteDoc(doc(db, 'superAdminUsers', userId));
  };


  const contextValue: AppContextType = {
    tenants,
    payments,
    clients: rawClientsState, // SuperAdmins see all clients
    managedUsers, // Filtered for current client context or empty for SA global
    rawSuperAdminUsers: rawSuperAdminUsersState, // SA needs full list
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
    
    // For components that need all users (like SuperAdmin user management page)
    // or for login check where filtering is done by AuthContext.
    // If more "raw" lists are needed by components, they can be added here.
    rawManagedUsers: rawManagedUsersState,
  };

  if (isDataLoading) {
    return (
      <AppContext.Provider value={contextValue as AppContextType}> {/* Cast to avoid issues with potentially undefined fields during loading */}
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
