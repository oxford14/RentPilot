
"use client";

import type { Tenant, Payment, AppContextType, Client, ManagedUser, ClientUserRole, SuperAdminUser, Expense, ExpenseCategory, AttemptDeleteTenantResult, PaymentMethod, Business, WeeklyIncome } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { expenseCategories as definedExpenseCategories } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast'; 
import { addDays } from 'date-fns';
import { serverAddManagedUser, serverAddSuperAdminUser, serverCompleteTenantSignup, serverUpdateManagedUser, serverUpdateSuperAdminUser } from '@/actions/user-actions';

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_TIMEZONE_KEY = 'rentPilotSystemTimezone';
const DEFAULT_TIMEZONE = 'Etc/UTC';

/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap.
 * @param ms The timeout in milliseconds.
 * @param timeoutError The error to reject with on timeout.
 * @returns A new promise that resolves/rejects with the original promise, or rejects on timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error('Operation timed out')): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(timeoutError);
    }, ms);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();
  const { toast } = useToast(); 

  // Raw data states from Firestore
  const [rawClientsState, setRawClientsState] = useState<Client[]>([]);
  const [rawTenantsState, setRawTenantsState] = useState<Tenant[]>([]);
  const [rawPaymentsState, setRawPaymentsState] = useState<Payment[]>([]);
  const [rawManagedUsersState, setRawManagedUsersState] = useState<ManagedUser[]>([]);
  const [rawSuperAdminUsersState, setRawSuperAdminUsersState] = useState<SuperAdminUser[]>([]);
  const [rawExpensesState, setRawExpensesState] = useState<Expense[]>([]);
  const [rawBusinessesState, setRawBusinessesState] = useState<Business[]>([]);
  const [rawWeeklyIncomesState, setRawWeeklyIncomesState] = useState<WeeklyIncome[]>([]);

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
      setRawSuperAdminUsersState([]);
      setRawExpensesState([]);
      setRawBusinessesState([]);
      setRawWeeklyIncomesState([]);
      setIsDataLoading(false);
      setInitialLoadComplete(false); // Reset load complete flag
      return;
    }

    setIsDataLoading(true);
    let isMounted = true;
    
    const collectionsToListen = [
      { name: 'clients', setter: setRawClientsState, label: 'clients' },
      { name: 'tenants', setter: setRawTenantsState, label: 'tenants' },
      { name: 'payments', setter: setRawPaymentsState, label: 'payments' },
      { name: 'managedUsers', setter: setRawManagedUsersState, label: 'managed users' },
      { name: 'superAdminUsers', setter: setRawSuperAdminUsersState, label: 'super admin users' },
      { name: 'expenses', setter: setRawExpensesState, label: 'expenses' },
      { name: 'businesses', setter: setRawBusinessesState, label: 'businesses' },
      { name: 'weeklyIncomes', setter: setRawWeeklyIncomesState, label: 'weekly incomes' },
    ];
    
    const unsubs = collectionsToListen.map(coll => 
      onSnapshot(query(collection(db, coll.name)), 
        (snapshot) => {
          if (!isMounted) return;
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          coll.setter(items);
        }, 
        (error) => {
          if (!isMounted) return;
          console.error(`Error fetching ${coll.label}: `, error);
          toast({ variant: "destructive", title: `Error loading ${coll.label}`, description: error.message });
        }
      )
    );

    Promise.all(collectionsToListen.map(c => getDocs(query(collection(db, c.name))))).then(() => {
        if (isMounted) {
            setInitialLoadComplete(true);
            setIsDataLoading(false);
        }
    }).catch(error => {
        if (isMounted) {
            console.error("Error during initial data fetch:", error);
            setIsDataLoading(false);
        }
    });

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [authIsAuthenticated, toast]);

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
    if (!currentContextClientId && authUser?.isSuperAdmin) return []; 
    if (!currentContextClientId) return [];
    return rawManagedUsersState.filter(mu => mu.clientId === currentContextClientId);
  }, [rawManagedUsersState, viewingAsClientId, authUser, authIsAuthenticated]);

  const businesses = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
      return viewingAsClientId ? rawBusinessesState.filter(b => b.clientId === viewingAsClientId) : [];
    }
    return rawBusinessesState.filter(b => b.clientId === authUser?.clientId);
  }, [rawBusinessesState, viewingAsClientId, authUser, authIsAuthenticated]);

  const weeklyIncomes = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
        return viewingAsClientId ? rawWeeklyIncomesState.filter(wi => wi.clientId === viewingAsClientId) : [];
    }
    return rawWeeklyIncomesState.filter(wi => wi.clientId === authUser?.clientId);
  }, [rawWeeklyIncomesState, viewingAsClientId, authUser, authIsAuthenticated]);


  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'clientId'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    let determinedClientId: string | undefined = undefined;
    if (authUser?.isSuperAdmin && viewingAsClientId) {
      determinedClientId = viewingAsClientId;
    } else if (!authUser?.isSuperAdmin && authUser?.clientId) {
      determinedClientId = authUser.clientId;
    }
    const newTenantData: Omit<Tenant, 'id'> = {
      ...tenantData,
      hasAccount: false, // Initialize tenant-specific fields
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
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    const { id, ...dataToUpdate } = updatedTenant;
    try {
      await setDoc(doc(db, 'tenants', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating tenant in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update tenant: ${error.message}` });
    }
  };

  const attemptDeleteTenant = async (tenantId: string): Promise<AttemptDeleteTenantResult> => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return { success: false, message: 'Unauthorized.', action: 'error' };
    }
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
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
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
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
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
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    const { id, ...dataToUpdate } = updatedExpense;
    try {
      await setDoc(doc(db, 'expenses', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating expense in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update expense: ${error.message}` });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (error: any) {
      console.error("Error deleting expense from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete expense: ${error.message}` });
    }
  };

  const addClient = async (clientData: Partial<Omit<Client, 'id'>>, logoFile?: File | Blob | null) => {
    if (!authUser?.isSuperAdmin) {
      throw new Error("You do not have permission to add clients.");
    }
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        const fileName = logoFile instanceof File ? logoFile.name : 'cropped.png';
        const uniqueFileName = `${uuidv4()}-${fileName}`;
        const storageRef = ref(storage, `client_logos/${uniqueFileName}`);
        
        const uploadPromise = uploadBytes(storageRef, logoFile);
        const uploadResult = await withTimeout(uploadPromise, 60000, new Error('File upload timed out. Please check your Firebase Storage setup in the console.'));

        const downloadURLPromise = getDownloadURL(uploadResult.ref);
        logoUrl = await withTimeout(downloadURLPromise, 10000, new Error('Could not get download URL. Please check your Storage Rules.'));
      }

      const dataToSave: Partial<Client> = {
        name: clientData.name,
        logoUrl: logoUrl,
        subscriptionStatus: clientData.subscriptionStatus || 'active',
        subscriptionEndDate: clientData.subscriptionEndDate || addDays(new Date(), 30).toISOString(),
      };

      await addDoc(collection(db, 'clients'), dataToSave);
    } catch (error: any) {
      console.error("Error adding client:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add client: ${error.message}` });
      throw error;
    }
  };

  const updateClient = async (client: Client, logoFile?: File | Blob | null) => {
    if (!authUser?.isSuperAdmin) {
       throw new Error("You do not have permission to update clients.");
    }
    const { id, ...clientData } = client;
    try {
      const dataToUpdate: Partial<Client> = { ...clientData };

      if (logoFile) {
        const fileName = logoFile instanceof File ? logoFile.name : 'cropped.png';
        const uniqueFileName = `${uuidv4()}-${fileName}`;
        const storageRef = ref(storage, `client_logos/${uniqueFileName}`);
        
        const uploadPromise = uploadBytes(storageRef, logoFile);
        const uploadResult = await withTimeout(uploadPromise, 60000, new Error('File upload timed out. Please check your Firebase Storage setup in the console.'));

        const downloadURLPromise = getDownloadURL(uploadResult.ref);
        dataToUpdate.logoUrl = await withTimeout(downloadURLPromise, 10000, new Error('Could not get download URL. Please check your Storage Rules.'));
      }
      
      await setDoc(doc(db, 'clients', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update client: ${error.message}` });
      throw error;
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
      const collectionsToDelete = ['tenants', 'payments', 'managedUsers', 'expenses', 'businesses', 'weeklyIncomes'];
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
      await serverAddManagedUser(userData);
    } catch (error: any) {
      console.error("Error adding managed user:", error);
      toast({ variant: "destructive", title: "Server Error", description: `Failed to add user: ${error.message}` });
    }
  };

  const updateManagedUser = async (updatedUser: ManagedUser) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== updatedUser.clientId && authUser?.username !== updatedUser.username) { 
        toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
        return;
    }
    const { id, ...dataToUpdate } = updatedUser;
    try {
      await serverUpdateManagedUser(id, dataToUpdate);
    } catch (error: any) {
      console.error("Error updating managed user:", error);
      toast({ variant: "destructive", title: "Server Error", description: `Failed to update user: ${error.message}` });
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
      await serverAddSuperAdminUser(userData);
    } catch (error: any) {
      console.error("Error adding super admin user:", error);
      toast({ variant: "destructive", title: "Server Error", description: `Failed to add super admin: ${error.message}` });
    }
  };

  const updateSuperAdminUser = async (updatedUser: SuperAdminUser) => {
    if (!authUser?.isSuperAdmin) {
       toast({ variant: "destructive", title: "Unauthorized", description: "Permission denied." });
       return;
    }
    const { id, ...dataToUpdate } = updatedUser;
    try {
      await serverUpdateSuperAdminUser(id, dataToUpdate);
    } catch (error: any) {
      console.error("Error updating super admin user:", error);
      toast({ variant: "destructive", title: "Server Error", description: `Failed to update super admin: ${error.message}` });
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
  
  const generateTenantInvitation = async (tenantId: string): Promise<string> => {
    if (!authIsAuthenticated) {
      throw new Error("You must be logged in to generate an invitation.");
    }

    const token = uuidv4();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      invitationToken: token,
      invitationTokenExpires: expires,
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/tenant-signup?token=${token}`;
  };

  const completeTenantSignup = async (token: string, password: string): Promise<{ success: boolean, message: string }> => {
    try {
      return await serverCompleteTenantSignup(token, password);
    } catch(error: any) {
        console.error("Error completing tenant signup:", error);
        return { success: false, message: `An unexpected server error occurred: ${error.message}` };
    }
  };

  const cleanClientData = async (clientId: string): Promise<{ success: boolean; message: string; }> => {
    if (!authUser?.isSuperAdmin) {
      const msg = "You do not have permission to clean client data.";
      toast({ variant: "destructive", title: "Unauthorized", description: msg });
      return { success: false, message: msg };
    }

    try {
        const batch = writeBatch(db);
        const collectionsToDelete = ['tenants', 'payments', 'expenses', 'businesses', 'weeklyIncomes'];
        
        for (const collName of collectionsToDelete) {
          const q = query(collection(db, collName), where('clientId', '==', clientId));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        
        const successMsg = "All tenants, payments, expenses, and tracking data for the client have been deleted.";
        toast({ title: "Cleanup Successful", description: successMsg });
        return { success: true, message: successMsg };

    } catch (error: any) {
        console.error("Error cleaning client data:", error);
        toast({ variant: "destructive", title: "Cleanup Failed", description: error.message });
        return { success: false, message: `Cleanup failed: ${error.message}` };
    }
  };

  const restoreDataFromBackup = async (backupFileContent: any): Promise<{ success: boolean; message: string; }> => {
    if (!authUser?.isSuperAdmin) {
      const msg = "You do not have permission to restore data.";
      toast({ variant: "destructive", title: "Unauthorized", description: msg });
      return { success: false, message: msg };
    }
  
    if (!backupFileContent || typeof backupFileContent !== 'object' || !backupFileContent.data || !backupFileContent.backupType) {
      return { success: false, message: "Invalid backup file format. Missing 'data' or 'backupType' property." };
    }
  
    const { backupType, data } = backupFileContent;
    let collectionsToClear: string[];
    
    if (backupType === 'Full System Backup') {
        collectionsToClear = ['clients', 'tenants', 'payments', 'expenses', 'managedUsers', 'superAdminUsers', 'businesses', 'weeklyIncomes'];
    } else if (backupType === 'All Client Data Backup') {
        collectionsToClear = ['clients', 'tenants', 'payments', 'expenses', 'managedUsers', 'businesses', 'weeklyIncomes'];
    } else {
        return { success: false, message: `Unknown backup type: "${backupType}". Restore aborted.` };
    }

    const collectionsToRestore = collectionsToClear.filter(
        collName => data[collName] && Array.isArray(data[collName])
    ).map(collName => ({
        name: collName,
        data: data[collName],
    }));

    if (collectionsToRestore.length === 0) {
      return { success: false, message: "No valid data arrays matching the backup type were found in the file." };
    }
  
    try {
      let batch = writeBatch(db);
      let operationCount = 0;
      const commitLimit = 490;
  
      for (const collName of collectionsToClear) {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(query(collRef));
        for (const docSnapshot of snapshot.docs) {
          batch.delete(docSnapshot.ref);
          operationCount++;
          if (operationCount >= commitLimit) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }
      if (operationCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
  
      for (const { name: collName, data: collData } of collectionsToRestore) {
        for (const item of collData) {
          if (!item.id) continue;
          const { id, ...itemData } = item;
          const docRef = doc(db, collName, id);
          batch.set(docRef, itemData);
          operationCount++;
          if (operationCount >= commitLimit) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }
      if (operationCount > 0) {
        await batch.commit();
      }
      
      const successMsg = `Data successfully restored using '${backupType}'.`;
      toast({ title: "Restore Successful", description: successMsg });
      return { success: true, message: successMsg };
  
    } catch (error: any) {
      console.error("Error restoring data from backup:", error);
      toast({ variant: "destructive", title: "Restore Failed", description: error.message });
      return { success: false, message: `Restore failed: ${error.message}` };
    }
  };

  const addBusiness = async (businessName: string) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    const currentContextClientId = authUser?.isSuperAdmin ? viewingAsClientId : authUser?.clientId;
    if (!currentContextClientId) {
        toast({ variant: "destructive", title: "Client context not found."});
        return;
    }

    const newBusinessData = {
        name: businessName,
        clientId: currentContextClientId,
        breakdownConfig: [],
    };
    try {
        await addDoc(collection(db, 'businesses'), newBusinessData);
        toast({ title: "Business Added", description: `${businessName} has been added.`});
    } catch (error: any) {
        console.error("Error adding business:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to add business: ${error.message}` });
    }
  };

  const updateBusiness = async (updatedBusiness: Business) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    const { id, ...dataToUpdate } = updatedBusiness;
    try {
        await setDoc(doc(db, 'businesses', id), dataToUpdate, { merge: true });
        toast({ title: "Business Updated", description: `${updatedBusiness.name} has been updated.`});
    } catch (error: any) {
        console.error("Error updating business:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to update business: ${error.message}` });
    }
  };

  const deleteBusiness = async (businessId: string) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    try {
        const batch = writeBatch(db);
        
        // Delete the business document
        const businessRef = doc(db, 'businesses', businessId);
        batch.delete(businessRef);

        // Find and delete all associated weekly incomes
        const incomesQuery = query(collection(db, 'weeklyIncomes'), where('businessId', '==', businessId));
        const incomesSnapshot = await getDocs(incomesQuery);
        incomesSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        toast({ title: "Business Deleted", description: "The business and all its income history have been deleted."});
    } catch (error: any) {
        console.error("Error deleting business:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to delete business: ${error.message}` });
    }
  };

  const addWeeklyIncome = async (incomeEntry: Omit<WeeklyIncome, 'id' | 'clientId'>) => {
      if (!authIsAuthenticated) {
          toast({ variant: "destructive", title: "Unauthorized" });
          return;
      }
      const currentContextClientId = authUser?.isSuperAdmin ? viewingAsClientId : authUser?.clientId;
      if (!currentContextClientId) {
          toast({ variant: "destructive", title: "Client context not found."});
          return;
      }

      const newWeeklyIncomeData = {
          ...incomeEntry,
          clientId: currentContextClientId,
      };

      try {
          await addDoc(collection(db, 'weeklyIncomes'), newWeeklyIncomeData);
          toast({ title: "Income Recorded", description: "Weekly income and breakdown have been saved." });
      } catch (error: any) {
          console.error("Error adding weekly income:", error);
          toast({ variant: "destructive", title: "Error", description: `Failed to save income: ${error.message}` });
      }
  };
  
  const deleteWeeklyIncome = async (weeklyIncomeId: string) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    try {
        await deleteDoc(doc(db, 'weeklyIncomes', weeklyIncomeId));
        toast({ title: "Income Entry Deleted", description: "The weekly income entry has been successfully deleted."});
    } catch (error: any) {
        console.error("Error deleting weekly income:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to delete income entry: ${error.message}` });
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
    businesses,
    weeklyIncomes,

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
    
    addBusiness,
    updateBusiness,
    deleteBusiness,
    addWeeklyIncome,
    deleteWeeklyIncome,

    rawManagedUsers: rawManagedUsersState,
    rawTenants: rawTenantsState,
    rawPayments: rawPaymentsState,
    rawExpenses: rawExpensesState,
    
    rawBusinesses: rawBusinessesState,
    rawWeeklyIncomes: rawWeeklyIncomesState,
    
    // Tenant Portal
    generateTenantInvitation,
    completeTenantSignup,
    cleanClientData,
    restoreDataFromBackup,
  };

  if (isDataLoading && authIsAuthenticated && !initialLoadComplete) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="loader"></div>
      </div>
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
