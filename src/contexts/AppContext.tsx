

"use client";

import type { Tenant, Payment, AppContextType, Client, ManagedUser, ClientUserRole, SuperAdminUser, Expense, ExpenseCategory, AttemptDeleteTenantResult, PaymentMethod, Business, WeeklyIncome, AdditionalDue, ChatSession, ChatMessage, DemoRequest, BackupScheduleSettings, Announcement, ContractTemplate, SignedContract } from '@/lib/types';
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
  Timestamp,
  runTransaction,
  limit,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from '@/hooks/use-toast'; 
import { addDays, startOfDay } from 'date-fns';
import { serverAddManagedUser, serverAddSuperAdminUser, serverUpdateManagedUser, serverUpdateSuperAdminUser, serverGenerateTenantAccount, serverForceChangeTenantPassword, serverResetTenantPassword } from '@/actions/user-actions';
import {
  startChatSession,
  sendChatMessage,
  markSessionAsRead,
  closeChatSession,
} from '@/actions/chat-actions';
import { serverAddDemoRequest, serverGetDemoRequests } from '@/actions/demo-actions';
import { calculateTenantBalance } from '@/lib/utils';
import { generateContract } from '@/ai/flows/generate-contract-flow';

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_TIMEZONE = 'Etc/UTC';

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
  const [rawAdditionalDuesState, setRawAdditionalDuesState] = useState<AdditionalDue[]>([]);
  const [rawBusinessesState, setRawBusinessesState] = useState<Business[]>([]);
  const [rawWeeklyIncomesState, setRawWeeklyIncomesState] = useState<WeeklyIncome[]>([]);
  const [rawChatSessionsState, setRawChatSessionsState] = useState<ChatSession[]>([]);
  const [rawDemoRequestsState, setRawDemoRequestsState] = useState<DemoRequest[]>([]);
  const [backupScheduleSettings, setBackupScheduleSettings] = useState<BackupScheduleSettings | null>(null);
  const [rawAnnouncementsState, setRawAnnouncementsState] = useState<Announcement[]>([]);
  const [rawContractTemplatesState, setRawContractTemplatesState] = useState<ContractTemplate[]>([]);
  const [rawSignedContractsState, setRawSignedContractsState] = useState<SignedContract[]>([]);

  const [viewingAsClientId, setViewingAsClientId] = useState<string | null>(null);
  const [systemTimezoneState, setSystemTimezoneState] = useState<string>(DEFAULT_TIMEZONE);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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
      setRawAdditionalDuesState([]);
      setRawBusinessesState([]);
      setRawWeeklyIncomesState([]);
      setRawChatSessionsState([]);
      setRawDemoRequestsState([]);
      setRawAnnouncementsState([]);
      setRawContractTemplatesState([]);
      setRawSignedContractsState([]);
      setBackupScheduleSettings(null);
      setSystemTimezoneState(DEFAULT_TIMEZONE);
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
      { name: 'additionalDues', setter: setRawAdditionalDuesState, label: 'additional dues'},
      { name: 'businesses', setter: setRawBusinessesState, label: 'businesses' },
      { name: 'weeklyIncomes', setter: setRawWeeklyIncomesState, label: 'weekly incomes' },
      { name: 'chatSessions', setter: setRawChatSessionsState, label: 'chat sessions'},
      { name: 'demoRequests', setter: setRawDemoRequestsState, label: 'demo requests'},
      { name: 'announcements', setter: setRawAnnouncementsState, label: 'announcements' },
      { name: 'contractTemplates', setter: setRawContractTemplatesState, label: 'contract templates' },
      { name: 'signedContracts', setter: setRawSignedContractsState, label: 'signed contracts' },
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

    // Listener for single system settings document
    const settingsDocRef = doc(db, 'systemSettings', 'main');
    const unsubSettings = onSnapshot(settingsDocRef, (doc) => {
      if (isMounted) {
        if (doc.exists()) {
          const settingsData = doc.data();
          setSystemTimezoneState(settingsData.timezone || DEFAULT_TIMEZONE);
          setBackupScheduleSettings(settingsData.backupSchedule || null);
        } else {
          setSystemTimezoneState(DEFAULT_TIMEZONE);
          setBackupScheduleSettings(null);
        }
      }
    }, (error) => {
      if (isMounted) console.error("Error fetching system settings:", error);
    });
    unsubs.push(unsubSettings);


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

  const updateSystemTimezone = async (timezone: string) => {
    if (!authUser?.isSuperAdmin) {
        toast({ variant: "destructive", title: "Unauthorized" });
        throw new Error("Unauthorized");
    }
    try {
        const settingsDocRef = doc(db, 'systemSettings', 'main');
        await setDoc(settingsDocRef, { timezone }, { merge: true });
    } catch (error: any) {
        console.error("Error updating system timezone:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to save timezone: ${error.message}` });
        throw error;
    }
  };

  const getScopedClientId = useCallback(() => {
    if (!authIsAuthenticated) return undefined;
    if (authUser?.isSuperAdmin) {
      return viewingAsClientId ? viewingAsClientId : undefined;
    }
    return authUser?.clientId;
  }, [authUser, authIsAuthenticated, viewingAsClientId]);


  // Filtered data based on auth user and view mode
  const tenants = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin && !viewingAsClientId) {
      return rawTenantsState.filter(t => !t.clientId);
    }
    const clientId = getScopedClientId();
    return rawTenantsState.filter(t => t.clientId === clientId);
  }, [rawTenantsState, getScopedClientId, authUser, authIsAuthenticated, viewingAsClientId]);

  const payments = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin && !viewingAsClientId) {
      return rawPaymentsState.filter(p => !p.clientId);
    }
    const clientId = getScopedClientId();
    return rawPaymentsState.filter(p => p.clientId === clientId);
  }, [rawPaymentsState, getScopedClientId, authUser, authIsAuthenticated, viewingAsClientId]);
  
  const expenses = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin && !viewingAsClientId) {
      return rawExpensesState.filter(e => !e.clientId);
    }
    const clientId = getScopedClientId();
    return rawExpensesState.filter(e => e.clientId === clientId);
  }, [rawExpensesState, getScopedClientId, authUser, authIsAuthenticated, viewingAsClientId]);

  const additionalDues = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin && !viewingAsClientId) {
      return rawAdditionalDuesState.filter(d => !d.clientId);
    }
    const clientId = getScopedClientId();
    return rawAdditionalDuesState.filter(d => d.clientId === clientId);
  }, [rawAdditionalDuesState, getScopedClientId, authUser, authIsAuthenticated, viewingAsClientId]);

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
        if (!viewingAsClientId) return rawBusinessesState.filter(b => !b.clientId); // Super admin global view
        return rawBusinessesState.filter(b => b.clientId === viewingAsClientId); // Super admin client view
    }
    return rawBusinessesState.filter(b => b.clientId === authUser?.clientId);
  }, [rawBusinessesState, viewingAsClientId, authUser, authIsAuthenticated]);

  const weeklyIncomes = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin) {
        if (!viewingAsClientId) return rawWeeklyIncomesState.filter(wi => !wi.clientId); // Super admin global view
        return rawWeeklyIncomesState.filter(wi => wi.clientId === viewingAsClientId); // Super admin client view
    }
    return rawWeeklyIncomesState.filter(wi => wi.clientId === authUser?.clientId);
  }, [rawWeeklyIncomesState, viewingAsClientId, authUser, authIsAuthenticated]);

  const announcements = useMemo(() => {
    if (!authIsAuthenticated) return [];
    return rawAnnouncementsState;
  }, [rawAnnouncementsState, authIsAuthenticated]);

  const contractTemplates = useMemo(() => {
    if (!authIsAuthenticated) return [];
    const clientId = getScopedClientId();
    if (authUser?.isSuperAdmin && !clientId) {
      return rawContractTemplatesState.filter(t => !t.clientId);
    }
    return rawContractTemplatesState.filter(t => t.clientId === clientId);
  }, [rawContractTemplatesState, getScopedClientId, authIsAuthenticated, authUser?.isSuperAdmin]);

  const signedContracts = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.role === 'tenant') {
        return rawSignedContractsState.filter(c => c.tenantId === authUser.tenantId);
    }
    const clientId = getScopedClientId();
     if (authUser?.isSuperAdmin && !clientId) {
      return rawSignedContractsState.filter(c => !c.clientId);
    }
    return rawSignedContractsState.filter(c => c.clientId === clientId);
  }, [rawSignedContractsState, getScopedClientId, authIsAuthenticated, authUser]);

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'clientId'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    const determinedClientId: string | undefined = getScopedClientId();
    
    try {
      const batch = writeBatch(db);
      const tenantRef = doc(collection(db, 'tenants'));

      const newTenantData: Omit<Tenant, 'id'> = {
        ...tenantData,
        hasAccount: false,
        ...(determinedClientId && { clientId: determinedClientId })
      };
      batch.set(tenantRef, newTenantData);

      if (tenantData.securityDeposit && tenantData.securityDeposit > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          tenantId: tenantRef.id,
          date: tenantData.joinDate,
          amount: tenantData.securityDeposit,
          paymentMethod: 'Security Deposit',
          clientId: determinedClientId,
        };
        batch.set(paymentRef, paymentData);
      }
      
      await batch.commit();

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
      const tenantRef = doc(db, 'tenants', id);
      const batch = writeBatch(db);

      const originalTenant = rawTenantsState.find(t => t.id === id);
      const oldDeposit = originalTenant?.securityDeposit || 0;
      const newDeposit = updatedTenant.securityDeposit || 0;

      batch.set(tenantRef, dataToUpdate, { merge: true });

      if (newDeposit > oldDeposit) {
        const depositIncrease = newDeposit - oldDeposit;
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          tenantId: id,
          date: new Date().toISOString(),
          amount: depositIncrease,
          paymentMethod: 'Security Deposit',
          clientId: updatedTenant.clientId,
        };
        batch.set(paymentRef, paymentData);
      }

      await batch.commit();

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
      
      const duesQuery = query(collection(db, 'additionalDues'), where('tenantId', '==', tenantId));
      const dueDocs = await getDocs(duesQuery);

      const hasHistory = !paymentDocs.empty || !dueDocs.empty;

      if (hasHistory) {
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

  const uploadContract = async (tenantId: string, file: File) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const tenant = rawTenantsState.find(t => t.id === tenantId);
    if (!tenant) {
      toast({ variant: "destructive", title: "Tenant not found" });
      return;
    }

    try {
      // If an old contract exists, delete it from storage
      if (tenant.contractUrl) {
        try {
          const oldStorageRef = ref(storage, tenant.contractUrl);
          await deleteObject(oldStorageRef);
        } catch (error: any) {
          // If the old file doesn't exist, that's fine, just log it.
          if (error.code !== 'storage/object-not-found') {
            console.warn("Could not delete old contract file:", error);
          }
        }
      }

      // Upload the new file
      const uniqueFileName = `${uuidv4()}-${file.name}`;
      const newStorageRef = ref(storage, `contracts/${tenantId}/${uniqueFileName}`);
      
      const uploadResult = await uploadBytes(newStorageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Update the tenant document
      const tenantDocRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantDocRef, { contractUrl: downloadUrl });

      toast({ title: "Contract Uploaded", description: "The new contract has been successfully uploaded." });
    } catch (error: any) {
      console.error("Error uploading contract:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      throw error;
    }
  };
  
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number; discountDescription?: string; paymentMethod?: PaymentMethod }) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    let determinedClientId: string | undefined = getScopedClientId();
     const newPaymentData: Omit<Payment, 'id'> = {
      tenantId: paymentData.tenantId,
      date: paymentData.date,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      checkNumber: paymentData.checkNumber,
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

  const updatePayment = async (updatedPayment: Payment) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    const { id, ...dataToUpdate } = updatedPayment;
    try {
      await setDoc(doc(db, 'payments', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating payment in Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update payment: ${error.message}` });
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (error: any) {
      console.error("Error deleting payment from Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete payment: ${error.message}` });
    }
  };

  const applySecurityDeposit = async (tenantId: string, amountToApply: number) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    const tenantRef = doc(db, "tenants", tenantId);

    try {
        await runTransaction(db, async (transaction) => {
            const tenantDoc = await transaction.get(tenantRef);
            if (!tenantDoc.exists()) {
                throw new Error("Tenant document does not exist!");
            }

            const currentDeposit = tenantDoc.data().securityDeposit || 0;
            if (amountToApply > currentDeposit) {
                throw new Error("Cannot apply more than the available security deposit.");
            }
            if (amountToApply <= 0) {
              throw new Error("Amount to apply must be positive.");
            }

            const newDepositAmount = currentDeposit - currentDeposit;
            transaction.update(tenantRef, { securityDeposit: newDepositAmount });

            const newPaymentRef = doc(collection(db, "payments"));
            const newPaymentData = {
                tenantId: tenantId,
                date: new Date().toISOString(),
                amount: amountToApply,
                paymentMethod: 'From Deposit' as PaymentMethod,
                clientId: tenantDoc.data().clientId, 
            };
            transaction.set(newPaymentRef, newPaymentData);
        });

        toast({
            title: "Success",
            description: `₱${amountToApply.toFixed(2)} from the security deposit has been applied as a payment.`,
        });

    } catch (error: any) {
        console.error("Error applying security deposit: ", error);
        toast({
            variant: "destructive",
            title: "Transaction Failed",
            description: error.message || "Could not apply the security deposit.",
        });
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'clientId'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    let determinedClientId: string | undefined = getScopedClientId();
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

  const addAdditionalDue = async (dueData: Omit<AdditionalDue, 'id' | 'clientId' | 'createdAt'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    const { tenantId, amount: newDueAmount, type } = dueData;
    const tenant = rawTenantsState.find(t => t.id === tenantId);
    if (!tenant) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant not found.' });
      return;
    }

    const today = startOfDay(new Date());
    const balanceBefore = calculateTenantBalance(tenant, rawPaymentsState, rawAdditionalDuesState, today);
    const determinedClientId: string | undefined = getScopedClientId();
    const batch = writeBatch(db);

    const newDueRef = doc(collection(db, 'additionalDues'));
    const fullDueData = {
      ...dueData,
      status: 'unpaid' as const,
      createdAt: new Date().toISOString(),
      ...(determinedClientId && { clientId: determinedClientId }),
    };
    batch.set(newDueRef, fullDueData);
    
    const creditAmount = balanceBefore < 0 ? Math.abs(balanceBefore) : 0;
    const amountToPayFromCredit = Math.min(creditAmount, newDueAmount);

    if (amountToPayFromCredit > 0) {
      const creditPaymentRef = doc(collection(db, 'payments'));
      const creditPaymentData: Omit<Payment, 'id'> = {
        tenantId: tenant.id,
        date: new Date().toISOString(),
        amount: amountToPayFromCredit,
        paymentMethod: 'From Credit',
        discountApplied: 0,
        discountDescription: `Auto-applied from ₱${creditAmount.toFixed(2)} credit towards new ${type} charge.`,
        clientId: determinedClientId,
      };
      batch.set(creditPaymentRef, creditPaymentData);
    }
    
    try {
      await batch.commit();
      
      let toastDescription = `A ${type} charge of ₱${newDueAmount.toFixed(2)} was added.`;
      if (amountToPayFromCredit > 0) {
        toastDescription += ` ₱${amountToPayFromCredit.toFixed(2)} of it was automatically paid from the tenant's credit.`;
      }
      toast({ title: 'Due Added', description: toastDescription });
    } catch (error: any) {
      console.error('Error in batch write:', error);
      toast({ variant: 'destructive', title: 'Firestore Error', description: `Failed to process due: ${error.message}` });
    }
  };
  
  const updateAdditionalDue = async (updatedDue: AdditionalDue) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    const { id, ...dataToUpdate } = updatedDue;
    try {
      await setDoc(doc(db, 'additionalDues', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating additional due:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update due: ${error.message}` });
    }
  };
  
  const deleteAdditionalDue = async (dueId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
      return;
    }
    try {
      await deleteDoc(doc(db, 'additionalDues', dueId));
    } catch (error: any) {
      console.error("Error deleting additional due:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete due: ${error.message}` });
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
        
        const uploadResult = await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(uploadResult.ref);
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
        
        const uploadResult = await uploadBytes(storageRef, logoFile);
        dataToUpdate.logoUrl = await getDownloadURL(uploadResult.ref);
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
      const collectionsToDelete = ['tenants', 'payments', 'managedUsers', 'expenses', 'additionalDues', 'businesses', 'weeklyIncomes'];
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
  
  const generateTenantAccount = async (tenantId: string): Promise<{success: boolean, username?: string, password?: string, message?: string}> => {
    if (!authIsAuthenticated) {
      return { success: false, message: "You must be logged in." };
    }
    try {
      const result = await serverGenerateTenantAccount(tenantId);
      return result;
    } catch (error: any) {
      console.error("Error generating tenant account:", error);
      return { success: false, message: `An unexpected server error occurred: ${error.message}` };
    }
  };
  
  const resetTenantPassword = async (tenantId: string): Promise<{success: boolean, password?: string, message?: string}> => {
    if (!authIsAuthenticated) {
      return { success: false, message: "You must be logged in." };
    }
    try {
      const result = await serverResetTenantPassword(tenantId);
      return result;
    } catch (error: any) {
      console.error("Error resetting tenant password:", error);
      return { success: false, message: `An unexpected server error occurred: ${error.message}` };
    }
  };

  const forceChangeTenantPassword = async (tenantId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
     try {
      return await serverForceChangeTenantPassword(tenantId, newPassword);
    } catch (error: any) {
        console.error("Error forcing tenant password change:", error);
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
        const collectionsToDelete = ['tenants', 'payments', 'expenses', 'additionalDues', 'businesses', 'weeklyIncomes'];
        
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
        collectionsToClear = ['clients', 'tenants', 'payments', 'expenses', 'managedUsers', 'superAdminUsers', 'businesses', 'weeklyIncomes', 'additionalDues'];
    } else if (backupType === 'All Client Data Backup') {
        collectionsToClear = ['clients', 'tenants', 'payments', 'expenses', 'managedUsers', 'businesses', 'weeklyIncomes', 'additionalDues'];
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
  
  const addDemoRequest = async (requestData: Omit<DemoRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
      await serverAddDemoRequest(requestData);
      toast({ title: "Demo Request Sent", description: "We've received your request and will be in touch shortly." });
    } catch (error: any) {
      console.error("Error adding demo request:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to send request: ${error.message}` });
      throw error;
    }
  };
  
  const updateDemoRequestStatus = async (requestId: string, status: DemoRequest['status']) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await updateDoc(doc(db, 'demoRequests', requestId), { status });
      toast({ title: "Status Updated", description: "The demo request status has been updated."});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to update status: ${error.message}` });
    }
  };

  const deleteDemoRequest = async (requestId: string) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'demoRequests', requestId));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to delete request: ${error.message}` });
    }
  };

  const updateBackupScheduleSettings = async (settings: BackupScheduleSettings) => {
    if (!authUser?.isSuperAdmin) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    try {
        const settingsDocRef = doc(db, 'systemSettings', 'main');
        await setDoc(settingsDocRef, { backupSchedule: settings }, { merge: true });
        toast({ title: "Schedule Saved", description: "Backup schedule has been saved successfully." });
    } catch (error: any) {
        console.error("Error updating backup schedule:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to save schedule: ${error.message}` });
    }
  };

  const addAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const newAnnouncement = {
      ...announcementData,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    try {
      await addDoc(collection(db, 'announcements'), newAnnouncement);
      toast({ title: "Announcement Posted", description: "Your announcement has been sent." });
    } catch (error: any) {
      console.error("Error posting announcement:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to post announcement: ${error.message}` });
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!authIsAuthenticated || !authUser || (!authUser.isSuperAdmin && authUser.role !== 'admin')) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      toast({ title: "Announcement Deleted" });
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to delete announcement: ${error.message}` });
    }
  };

  const markAnnouncementAsRead = async (announcementId: string, userId: string) => {
    const announcementRef = doc(db, 'announcements', announcementId);
    try {
      await runTransaction(db, async (transaction) => {
        const announcementDoc = await transaction.get(announcementRef);
        if (!announcementDoc.exists()) {
          throw "Announcement not found.";
        }
        const currentReadBy = announcementDoc.data().readBy || [];
        if (!currentReadBy.includes(userId)) {
          transaction.update(announcementRef, {
            readBy: [...currentReadBy, userId]
          });
        }
      });
    } catch (error) {
      console.error("Failed to mark announcement as read:", error);
      // No toast here to avoid bothering user
    }
  };

  const addContractTemplate = useCallback(async (templateData: Omit<ContractTemplate, 'id' | 'clientId' | 'createdAt'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const determinedClientId = getScopedClientId();
    if (!determinedClientId) {
      toast({ variant: "destructive", title: "Client scope not determined." });
      return;
    }
    try {
      await addDoc(collection(db, 'contractTemplates'), {
        ...templateData,
        clientId: determinedClientId,
        createdAt: new Date().toISOString(),
      });
      toast({ title: 'Template Added', description: 'The new contract template has been saved.' });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error saving template", description: e.message });
    }
  }, [getScopedClientId, authIsAuthenticated, toast]);

  const updateContractTemplate = useCallback(async (template: ContractTemplate) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const { id, ...dataToUpdate } = template;
    try {
      await setDoc(doc(db, 'contractTemplates', id), dataToUpdate, { merge: true });
      toast({ title: 'Template Updated', description: 'The contract template has been updated.' });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error updating template", description: e.message });
    }
  }, [authIsAuthenticated, toast]);

  const deleteContractTemplate = useCallback(async (templateId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'contractTemplates', templateId));
      toast({ title: 'Template Deleted', description: 'The contract template has been deleted.' });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error deleting template", description: e.message });
    }
  }, [authIsAuthenticated, toast]);

  const initiateContract = useCallback(async (tenantId: string, templateId: string) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    const tenant = rawTenantsState.find(t => t.id === tenantId);
    const template = rawContractTemplatesState.find(t => t.id === templateId);

    if (!tenant || !template) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant or template not found.' });
      return;
    }
    if (!tenant.clientId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant is not associated with a client.' });
      return;
    }
    if (!tenant.hasAccount || !tenant.username) {
      toast({ variant: 'destructive', title: 'Error', description: 'This tenant does not have an active portal account to receive a contract.' });
      return;
    }

    const client = tenant.clientId ? rawClientsState.find(c => c.id === tenant.clientId) : null;
    const clientLogoUrl = client?.logoUrl;

    try {
      const { finalContract } = await generateContract({
        templateBody: template.body,
        tenant_name: tenant.name,
        monthly_rate: tenant.monthlyRentalRate,
        security_deposit: tenant.securityDeposit || 0,
        join_date: new Date(tenant.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        landlord_name: authUser.username,
        client_logo_url: clientLogoUrl || undefined,
      });
      
      const newContractData: Omit<SignedContract, 'id'> = {
        clientId: tenant.clientId,
        tenantId: tenant.id,
        templateId: template.id,
        contractBody: finalContract,
        status: 'pending',
        initiatedAt: new Date().toISOString(),
      };
      
      const contractRef = await addDoc(collection(db, 'signedContracts'), newContractData);

      const tenantRef = doc(db, 'tenants', tenant.id);
      await updateDoc(tenantRef, { activeContractId: contractRef.id });
      
      await addAnnouncement({
        title: "Action Required: New Contract",
        content: `You have a new contract from ${authUser.username} to sign. Please go to your dashboard to review and sign.`,
        scope: tenant.clientId,
        audience: 'tenant',
        senderId: authUser.username,
        senderName: authUser.username,
        recipientId: tenant.id,
        recipientUsername: tenant.username,
      });

      toast({ title: 'Contract Initiated', description: `A new contract has been sent to ${tenant.name}.` });
    } catch (e: any) {
      console.error("Error initiating contract:", e);
      toast({ variant: 'destructive', title: 'Contract Initiation Failed', description: e.message });
    }
  }, [authIsAuthenticated, toast, rawTenantsState, rawContractTemplatesState, authUser, addAnnouncement, rawClientsState]);

  const signContract = useCallback(async (contractId: string, manualInputs?: string[]) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    const contractRef = doc(db, 'signedContracts', contractId);
    try {
      await runTransaction(db, async (transaction) => {
        const contractDoc = await transaction.get(contractRef);
        if (!contractDoc.exists()) {
            throw new Error("Contract could not be found.");
        }
        let body = contractDoc.data().contractBody as string;
        const tenantId = contractDoc.data().tenantId as string;
        const tenant = rawTenantsState.find(t => t.id === tenantId);
        
        if (!tenant) {
            throw new Error("Associated tenant could not be found.");
        }

        const signedDate = new Date();
        
        // Replace manual inputs
        if (manualInputs && manualInputs.length > 0) {
            let inputIndex = 0;
            body = body.replace(/\{\{\{tenant_manual_input\}\}\}/g, () => {
                const value = manualInputs[inputIndex] || '[NOT FILLED]';
                inputIndex++;
                return `\n\n--- Tenant Input ---\n${value}\n--------------------\n\n`;
            });
        }
        
        const signatureBlock = `\n// Electronically Signed by ${tenant.name} on ${signedDate.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} //\n`;
        body = body.replace(/\{\{\{tenant_signature_block\}\}\}/g, signatureBlock);
        
        transaction.update(contractRef, {
          contractBody: body,
          status: 'signed',
          signedAt: signedDate.toISOString(),
          signedByIp: 'X.X.X.X', // Placeholder
        });
      });

      toast({ title: 'Contract Signed!', description: 'Your agreement has been recorded.' });
    } catch (e: any) {
      console.error("Error signing contract:", e);
      toast({ variant: 'destructive', title: 'Signing Failed', description: e.message });
    }
  }, [authIsAuthenticated, authUser, toast, rawTenantsState]);


  const contextValue: AppContextType = {
    tenants,
    payments,
    clients: rawClientsState,
    managedUsers,
    rawSuperAdminUsers: rawSuperAdminUsersState,
    expenses,
    expenseCategories: definedExpenseCategories,
    additionalDues,
    viewingAsClientId,
    systemTimezone: systemTimezoneState,
    businesses,
    weeklyIncomes,
    backupScheduleSettings,
    announcements,
    contractTemplates,
    signedContracts,
    
    // Chat
    chatSessions: rawChatSessionsState,
    startChatSession,
    sendChatMessage,
    markSessionAsRead,
    closeChatSession,

    setViewMode,
    updateSystemTimezone,
    updateBackupScheduleSettings,

    addTenant,
    updateTenant,
    attemptDeleteTenant,
    uploadContract,
    generateTenantAccount,
    forceChangeTenantPassword,
    resetTenantPassword,

    addPayment,
    updatePayment,
    deletePayment,
    applySecurityDeposit,
    
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
    
    addAdditionalDue,
    updateAdditionalDue,
    deleteAdditionalDue,

    addBusiness,
    updateBusiness,
    deleteBusiness,
    addWeeklyIncome,
    deleteWeeklyIncome,

    addAnnouncement,
    deleteAnnouncement,
    markAnnouncementAsRead,

    addContractTemplate,
    updateContractTemplate,
    deleteContractTemplate,
    initiateContract,
    signContract,

    rawManagedUsers: rawManagedUsersState,
    rawTenants: rawTenantsState,
    rawPayments: rawPaymentsState,
    rawExpenses: rawExpensesState,
    rawAdditionalDues: rawAdditionalDuesState,
    rawDemoRequests: rawDemoRequestsState,
    
    rawBusinesses: rawBusinessesState,
    rawWeeklyIncomes: rawWeeklyIncomesState,
    
    addDemoRequest,
    updateDemoRequestStatus,
    deleteDemoRequest,

    // Tenant Portal
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
