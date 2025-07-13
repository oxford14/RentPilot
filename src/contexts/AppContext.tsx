

"use client";

import type { Tenant, Payment, AppContextType, Client, ManagedUser, ClientUserRole, SuperAdminUser, Expense, ExpenseCategory, AttemptDeleteTenantResult, PaymentMethod, Business, WeeklyIncome, AdditionalDue, ChatSession, ChatMessage, DemoRequest, BackupScheduleSettings, Announcement, PaymentAllocation, AllocatedRentPayment, AllocatedDuePayment, CompanyFundsExpense, DeletedClientBackup, PcIssue, NotificationSettings, TechSupportRequest } from '@/lib/types';
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
  deleteField,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadString } from "firebase/storage";
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
import { calculateTenantBalance, calculateTenantBalanceBreakdown } from '@/lib/utils';


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
  const [rawCompanyFundsExpenses, setRawCompanyFundsExpenses] = useState<CompanyFundsExpense[]>([]);
  const [rawAdditionalDuesState, setRawAdditionalDuesState] = useState<AdditionalDue[]>([]);
  const [rawBusinessesState, setRawBusinessesState] = useState<Business[]>([]);
  const [rawWeeklyIncomesState, setRawWeeklyIncomesState] = useState<WeeklyIncome[]>([]);
  const [rawChatSessionsState, setRawChatSessionsState] = useState<ChatSession[]>([]);
  const [rawDemoRequestsState, setRawDemoRequestsState] = useState<DemoRequest[]>([]);
  const [backupScheduleSettings, setBackupScheduleSettings] = useState<BackupScheduleSettings | null>(null);
  const [rawAnnouncementsState, setRawAnnouncementsState] = useState<Announcement[]>([]);
  const [rawDeletedClientsState, setRawDeletedClientsState] = useState<DeletedClientBackup[]>([]);
  const [rawTechSupportRequests, setRawTechSupportRequests] = useState<TechSupportRequest[]>([]);


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
      setRawCompanyFundsExpenses([]);
      setRawBusinessesState([]);
      setRawWeeklyIncomesState([]);
      setRawChatSessionsState([]);
      setRawDemoRequestsState([]);
      setRawAnnouncementsState([]);
      setRawDeletedClientsState([]);
      setRawTechSupportRequests([]);
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
      { name: 'companyFundsExpenses', setter: setRawCompanyFundsExpenses, label: 'company funds expenses' },
      { name: 'additionalDues', setter: setRawAdditionalDuesState, label: 'additional dues'},
      { name: 'businesses', setter: setRawBusinessesState, label: 'businesses' },
      { name: 'weeklyIncomes', setter: setRawWeeklyIncomesState, label: 'weekly incomes' },
      { name: 'chatSessions', setter: setRawChatSessionsState, label: 'chat sessions'},
      { name: 'demoRequests', setter: setRawDemoRequestsState, label: 'demo requests'},
      { name: 'announcements', setter: setRawAnnouncementsState, label: 'announcements' },
      { name: 'deletedClients', setter: setRawDeletedClientsState, label: 'deleted clients' },
      { name: 'techSupportRequests', setter: setRawTechSupportRequests, label: 'tech support requests' },
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

  const activeClient = useMemo(() => {
    const clientId = getScopedClientId();
    if (!clientId) return null;
    return rawClientsState.find(c => c.id === clientId) || null;
  }, [getScopedClientId, rawClientsState]);

  const terminology = useMemo(() => {
    const businessType = activeClient?.businessType;
    switch (businessType) {
      case 'ISP_Subscription':
        return { single: 'Subscriber', plural: 'Subscribers' };
      case 'Vehicle_Rental':
        return { single: 'Renter', plural: 'Renters' };
      default:
        return { single: 'Tenant', plural: 'Tenants' };
    }
  }, [activeClient]);


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

  const companyFundsExpenses = useMemo(() => {
    if (!authIsAuthenticated) return [];
    if (authUser?.isSuperAdmin && !viewingAsClientId) {
      return rawCompanyFundsExpenses.filter(e => !e.clientId);
    }
    const clientId = getScopedClientId();
    return rawCompanyFundsExpenses.filter(e => e.clientId === clientId);
  }, [rawCompanyFundsExpenses, getScopedClientId, authUser, authIsAuthenticated, viewingAsClientId]);

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

  const techSupportRequests = useMemo(() => {
    if (!authIsAuthenticated || !authUser) return [];
    if (authUser.isSuperAdmin) {
        const clientId = getScopedClientId();
        return clientId ? rawTechSupportRequests.filter(t => t.clientId === clientId) : rawTechSupportRequests;
    }
    if (authUser.role === 'tenant') {
        return rawTechSupportRequests.filter(t => t.subscriberId === authUser.tenantId);
    }
    // For client-side users (admin, user, technician)
    if (authUser.clientId) {
        return rawTechSupportRequests.filter(t => t.clientId === authUser.clientId);
    }
    return [];
  }, [rawTechSupportRequests, authIsAuthenticated, authUser, getScopedClientId]);

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'clientId' | 'rent_history'>) => {
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
        rent_history: [
            {
                rate: tenantData.monthlyRentalRate,
                startDate: tenantData.joinDate,
                endDate: null,
            }
        ],
        ...(determinedClientId && { clientId: determinedClientId })
      };
      batch.set(tenantRef, newTenantData);

      if (tenantData.securityDeposit && tenantData.securityDeposit > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          tenantId: tenantRef.id,
          date: new Date().toISOString(),
          amount: tenantData.securityDeposit,
          paymentMethod: 'Security Deposit',
          clientId: determinedClientId,
        };
        batch.set(paymentRef, paymentData);
      }
      
      await batch.commit();

    } catch (error: any) {
      console.error("Error adding tenant to Firestore:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add ${terminology.single}: ${error.message}` });
    }
  };

  const updateTenant = async (updatedTenant: Tenant, rentAdjustmentDate?: string) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized", description: "You must be logged in." });
        return;
    }
    const { id, ...dataToUpdate } = updatedTenant;

    try {
        const tenantRef = doc(db, 'tenants', id);
        const batch = writeBatch(db);

        const originalTenant = rawTenantsState.find(t => t.id === id);
        let newHistory = JSON.parse(JSON.stringify(updatedTenant.rent_history || []));
        let historyWasModified = false;
        
        // Unassign from PC if status changes to inactive
        if (originalTenant?.status === 'active' && updatedTenant.status === 'inactive' && originalTenant?.pcNumber) {
            dataToUpdate.pcNumber = deleteField() as any;
            toast({title: "PC Unassigned", description: `${updatedTenant.name} has been unassigned from their PC.`});
        }
        
        if (originalTenant && originalTenant.joinDate !== updatedTenant.joinDate) {
            newHistory = [{
                rate: updatedTenant.monthlyRentalRate,
                startDate: updatedTenant.joinDate,
                endDate: null,
            }];
            historyWasModified = true;

        } else if (rentAdjustmentDate && originalTenant && originalTenant.monthlyRentalRate !== updatedTenant.monthlyRentalRate) {
            const adjustmentStart = new Date(rentAdjustmentDate);
            const oldEntryEnd = addDays(adjustmentStart, -1);
            
            const previousEntryIndex = newHistory.findIndex((entry: any) => {
                const entryStart = new Date(entry.startDate);
                const entryEnd = entry.endDate ? new Date(entry.endDate) : null;
                return oldEntryEnd >= entryStart && (!entryEnd || oldEntryEnd <= entryEnd);
            });
            
            if (previousEntryIndex !== -1) {
                newHistory[previousEntryIndex].endDate = oldEntryEnd.toISOString();
            }
            
            newHistory.push({
                rate: updatedTenant.monthlyRentalRate,
                startDate: adjustmentStart.toISOString(),
                endDate: null,
            });
            historyWasModified = true;
        }

        if (historyWasModified) {
            (dataToUpdate as any).rent_history = newHistory;
        }
        
        const oldDeposit = originalTenant?.securityDeposit || 0;
        const newDeposit = updatedTenant.securityDeposit || 0;
        const depositDifference = newDeposit - oldDeposit;

        batch.set(tenantRef, dataToUpdate, { merge: true });
        
        if (depositDifference !== 0) {
            const paymentRef = doc(collection(db, 'payments'));
            const paymentData: Omit<Payment, 'id'> = {
                tenantId: id,
                date: new Date().toISOString(),
                amount: depositDifference,
                paymentMethod: 'Security Deposit',
                clientId: updatedTenant.clientId,
            };
            batch.set(paymentRef, paymentData);
        }

        await batch.commit();

    } catch (error: any) {
        console.error("Error updating tenant in Firestore:", error);
        toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update ${terminology.single}: ${error.message}` });
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
        toast({ variant: "destructive", title: "Not Found", description: `${terminology.single} not found.` });
        return { success: false, message: `${terminology.single} not found.`, action: 'not_found' };
      }
      const tenantData = {id: tenantSnapshot.id, ...tenantSnapshot.data()} as Tenant;

      const paymentsQuery = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
      const paymentDocs = await getDocs(paymentsQuery);
      
      const duesQuery = query(collection(db, 'additionalDues'), where('tenantId', '==', tenantId));
      const dueDocs = await getDocs(duesQuery);

      const hasHistory = !paymentDocs.empty || !dueDocs.empty;

      if (hasHistory) {
        await updateDoc(tenantDocRef, { status: 'inactive' });
        return { success: true, message: `${terminology.single} "${tenantData.name}" marked as inactive.`, action: 'inactivated' };
      } else {
        await deleteDoc(tenantDocRef);
        return { success: true, message: `${terminology.single} "${tenantData.name}" permanently deleted.`, action: 'deleted' };
      }
    } catch (error: any) {
      console.error("Error attempting to delete tenant:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete/inactivate ${terminology.single}: ${error.message}` });
      return { success: false, message: `Operation failed: ${error.message}`, action: 'error' };
    }
  };
  
  const addAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Create the in-app announcement
        const newAnnouncement = {
            ...announcementData,
            createdAt: new Date().toISOString(),
            readBy: [],
        };
        const announcementRef = doc(collection(db, 'announcements'));
        batch.set(announcementRef, newAnnouncement);

        // 2. Handle email sending
        let emailRecipients: string[] = [];
        let emailContent = `<p>${announcementData.content}</p>`;

        // Case 1: Direct message to a single tenant
        if (announcementData.recipientId && announcementData.audience === 'tenant') {
            const tenant = rawTenantsState.find(t => t.id === announcementData.recipientId);
            if (tenant?.email) {
                emailRecipients.push(tenant.email);
            }
        // Case 2: Broadcast to all tenants of a client
        } else if (announcementData.scope !== 'global' && announcementData.audience === 'tenant' && !announcementData.recipientId) {
            const tenantsForClient = rawTenantsState.filter(t => t.clientId === announcementData.scope && t.email);
            emailRecipients = tenantsForClient.map(t => t.email);
        }

        // Add email to the batch if there are recipients
        if (emailRecipients.length > 0) {
            const client = rawClientsState.find(c => c.id === announcementData.scope);
            const fromName = client?.name || announcementData.senderName;
            
            const mailRef = doc(collection(db, 'mail'));
            batch.set(mailRef, {
                to: emailRecipients,
                message: {
                    subject: `${fromName}: ${announcementData.title}`,
                    html: emailContent,
                },
            });
        }

        await batch.commit();
        toast({ title: "Announcement Posted", description: "Your announcement has been sent." });

    } catch (error: any) {
      console.error("Error posting announcement:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to post announcement: ${error.message}` });
    }
  };

  const uploadSignedContract = async (tenantId: string, file: File, contractEndDate: string) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    if (!file) {
      toast({ variant: "destructive", title: "No File Selected" });
      return;
    }

    const storageRef = ref(storage, `signed_contracts/${tenantId}/${file.name}`);
    
    try {
      toast({ title: "Uploading...", description: "Your contract is being uploaded." });
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        signedContractUrl: downloadURL,
        contractEndDate: contractEndDate,
      });
      
      toast({ title: "Upload Complete", description: "The signed contract has been saved." });

      // Send notification to tenant if they have an account
      const tenant = rawTenantsState.find(t => t.id === tenantId);
      if (tenant && tenant.hasAccount && tenant.username && tenant.clientId) {
        await addAnnouncement({
          title: "Your Contract is Available",
          content: "Your signed lease agreement is now available for viewing. You can access it anytime from your profile menu.",
          scope: tenant.clientId,
          audience: 'tenant',
          senderId: authUser.username,
          senderName: authUser.username,
          recipientId: tenant.id,
          recipientUsername: tenant.username,
        });
        toast({ title: "Notification Sent", description: "Tenant was also notified about their available contract." });
      }

    } catch (error: any) {
      console.error("Error uploading contract:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    }
  };

  const renewSignedContract = async (tenantId: string, file: File, newContractEndDate: string) => {
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }

    const tenant = rawTenantsState.find(t => t.id === tenantId);
    if (!tenant) {
      toast({ variant: "destructive", title: "Error", description: "Tenant not found." });
      return;
    }
    
    // Delete old file if it exists
    if (tenant.signedContractUrl) {
        try {
            const oldStorageRef = ref(storage, tenant.signedContractUrl);
            await deleteObject(oldStorageRef);
        } catch (error: any) {
            // If the old file doesn't exist, that's okay. We just log a warning and continue.
            if (error.code !== 'storage/object-not-found') {
                console.error("Could not delete old contract file, proceeding with upload anyway:", error);
            }
        }
    }
    
    // Upload new file and update tenant doc
    await uploadSignedContract(tenantId, file, newContractEndDate);
    toast({ title: "Contract Renewed", description: "The contract has been successfully renewed and updated." });
  };


  const deleteSignedContract = async (tenantId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }

    const tenant = rawTenantsState.find(t => t.id === tenantId);
    if (!tenant || !tenant.signedContractUrl) {
        toast({ variant: "destructive", title: "Error", description: "No contract found for this tenant." });
        return;
    }

    try {
        const storageRef = ref(storage, tenant.signedContractUrl);
        await deleteObject(storageRef);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting contract file from Storage:", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: `Could not delete file from storage: ${error.message}` });
            return; // Stop if storage deletion fails for reasons other than not found
        }
        console.warn("File not found in storage, but proceeding to remove link from Firestore.");
    }
    
    try {
        const tenantRef = doc(db, 'tenants', tenantId);
        await updateDoc(tenantRef, {
            signedContractUrl: deleteField(),
            contractEndDate: deleteField()
        });
        toast({ title: "Contract Deleted", description: "The signed contract has been successfully deleted." });
    } catch (error: any) {
        console.error("Error removing contract URL from Firestore:", error);
        toast({ variant: "destructive", title: "Update Failed", description: `Could not remove contract link from database: ${error.message}` });
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

            const newDepositAmount = currentDeposit - amountToApply;
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
  
  const addCompanyFundsExpense = async (expenseData: Omit<CompanyFundsExpense, 'id' | 'clientId'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const determinedClientId: string | undefined = getScopedClientId();
    if (!determinedClientId) {
      toast({ variant: "destructive", title: "Client context not found."});
      return;
    }
    const newExpenseData: Omit<CompanyFundsExpense, 'id'> = {
      ...expenseData,
      clientId: determinedClientId,
    };
    try {
      await addDoc(collection(db, 'companyFundsExpenses'), newExpenseData);
    } catch (error: any) {
      console.error("Error adding company funds expense:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to add expense: ${error.message}` });
    }
  };
  
  const updateCompanyFundsExpense = async (updatedExpense: CompanyFundsExpense) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    const { id, ...dataToUpdate } = updatedExpense;
    try {
      await setDoc(doc(db, 'companyFundsExpenses', id), dataToUpdate, { merge: true });
    } catch (error: any) {
      console.error("Error updating company funds expense:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to update expense: ${error.message}` });
    }
  };

  const deleteCompanyFundsExpense = async (expenseId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'companyFundsExpenses', expenseId));
    } catch (error: any) {
      console.error("Error deleting company funds expense:", error);
      toast({ variant: "destructive", title: "Firestore Error", description: `Failed to delete expense: ${error.message}` });
    }
  };


  const addAdditionalDue = async (dueData: Omit<AdditionalDue, 'id' | 'clientId' | 'createdAt' | 'creditApplied'>) => {
    if (!authIsAuthenticated) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }
    const { tenantId, amount: newDueAmount, type } = dueData;
    const tenant = rawTenantsState.find(t => t.id === tenantId);
    if (!tenant) {
      toast({ variant: 'destructive', title: 'Error', description: `${terminology.single} not found.` });
      return;
    }

    const today = startOfDay(new Date());
    const balanceBefore = calculateTenantBalance(tenant, rawPaymentsState, rawAdditionalDuesState, today);
    const determinedClientId: string | undefined = getScopedClientId();

    const creditAmount = balanceBefore < 0 ? Math.abs(balanceBefore) : 0;
    const creditToApply = Math.min(creditAmount, newDueAmount);
    
    const newDueData: Omit<AdditionalDue, 'id'> = {
      ...dueData,
      status: (newDueAmount - creditToApply) <= 0 ? 'paid' : 'unpaid',
      createdAt: new Date().toISOString(),
      creditApplied: creditToApply > 0 ? creditToApply : 0,
      ...(determinedClientId && { clientId: determinedClientId }),
    };

    try {
      const batch = writeBatch(db);
      
      // Add the new due to the batch
      const dueRef = doc(collection(db, 'additionalDues'));
      batch.set(dueRef, newDueData);
      
      // If credit was applied, add a corresponding payment to the batch
      if (creditToApply > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const paymentData: Omit<Payment, 'id'> = {
          tenantId: tenantId,
          date: newDueData.dueDate, // Match the due date for clarity
          amount: creditToApply,
          paymentMethod: 'From Credit',
          discountDescription: `Auto-applied from credit towards new ${type} charge.`,
          discountApplied: 0,
          clientId: determinedClientId,
        };
        batch.set(paymentRef, paymentData);
      }
      
      await batch.commit();
      
      let toastDescription = `A ${type} charge of ₱${newDueAmount.toFixed(2)} was added.`;
      if (creditToApply > 0) {
        toastDescription += ` ₱${creditToApply.toFixed(2)} of it was automatically paid from the tenant's credit.`;
      }
      toast({ title: 'Due Added', description: toastDescription });
    } catch (error: any) {
      console.error('Error adding due:', error);
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
        businessType: clientData.businessType,
        logoUrl: logoUrl,
        subscriptionStatus: clientData.subscriptionStatus || 'active',
        subscriptionEndDate: clientData.subscriptionEndDate || addDays(new Date(), 30).toISOString(),
        subscriptionPlanName: clientData.subscriptionPlanName,
        subscriptionRate: clientData.subscriptionRate,
        timezone: clientData.timezone,
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

  const updateClientNotificationSettings = async (settings: NotificationSettings) => {
    if (!authIsAuthenticated || !authUser) {
      throw new Error("You must be logged in.");
    }

    const clientId = getScopedClientId();
    const canUpdate = authUser.isSuperAdmin || 
                      (authUser.role === 'admin' && authUser.clientId === clientId) ||
                      (authUser.role === 'hub-admin' && activeClient?.name === 'i-VirtuaTech' && authUser.clientId === clientId);
    
    if (!canUpdate) {
        throw new Error("You do not have permission to update these settings.");
    }
    if (!clientId) {
      throw new Error("No client context found.");
    }

    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        notificationSettings: settings
      });
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      throw new Error(`Failed to save notification settings: ${error.message}`);
    }
  };

  const runNotificationTrigger = async (): Promise<{success: boolean, message: string}> => {
    const functionUrl = "https://asia-east1-tenanttracker-u4wuw.cloudfunctions.net/notificationRunner";
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to trigger notifications: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      return { success: true, message: result.message };
    } catch(error: any) {
      console.error("Error triggering notifications:", error);
      return { success: false, message: error.message };
    }
  }

  const deleteClient = async (clientId: string) => {
    if (!authUser?.isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }

    try {
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (!clientDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Client not found.' });
            return;
        }
        const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

        const subcollectionsToBackup = ['tenants', 'payments', 'managedUsers', 'expenses', 'additionalDues', 'businesses', 'weeklyIncomes', 'companyFundsExpenses'];
        const backupData: Record<string, any[]> = {};

        for (const collName of subcollectionsToBackup) {
            const q = query(collection(db, collName), where('clientId', '==', clientId));
            const snapshot = await getDocs(q);
            backupData[collName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const fullBackup: DeletedClientBackup = {
            clientData: clientData,
            backupData: backupData,
            deletedAt: new Date().toISOString(),
        };

        const batch = writeBatch(db);

        // Save to deletedClients collection
        batch.set(doc(db, 'deletedClients', clientId), fullBackup);
        
        // Delete original client and subcollections
        batch.delete(doc(db, 'clients', clientId));
        for (const collName of subcollectionsToBackup) {
          backupData[collName].forEach(item => {
            batch.delete(doc(db, collName, item.id));
          });
        }
        
        await batch.commit();
        toast({ title: 'Client Moved to Recycle Bin', description: `${clientData.name} has been deleted. You can restore them from the maintenance menu.` });
    } catch (error: any) {
        console.error('Error soft-deleting client:', error);
        toast({ variant: 'destructive', title: 'Error Deleting Client', description: error.message });
    }
  };

  const restoreClient = async (backupId: string) => {
    if (!authUser?.isSuperAdmin) {
        toast({ variant: 'destructive', title: 'Unauthorized' });
        return;
    }

    try {
        const backupDocRef = doc(db, 'deletedClients', backupId);
        const backupDoc = await getDoc(backupDocRef);

        if (!backupDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Backup not found.' });
            return;
        }

        const backup = backupDoc.data() as DeletedClientBackup;
        const batch = writeBatch(db);

        // Restore the client document
        const { id: clientId, ...clientData } = backup.clientData;
        batch.set(doc(db, 'clients', clientId), clientData);

        // Restore all subcollection documents
        for (const collName in backup.backupData) {
            backup.backupData[collName].forEach(item => {
                const { id: docId, ...itemData } = item;
                batch.set(doc(db, collName, docId), itemData);
            });
        }
        
        // Delete the backup document
        batch.delete(backupDocRef);

        await batch.commit();
        toast({ title: 'Client Restored', description: `${backup.clientData.name} and all their data have been restored.` });

    } catch (error: any) {
        console.error('Error restoring client:', error);
        toast({ variant: 'destructive', title: 'Restore Failed', description: error.message });
    }
  };

  const permanentlyDeleteClientBackup = async (backupId: string) => {
    if (!authUser?.isSuperAdmin) {
        toast({ variant: 'destructive', title: 'Unauthorized' });
        return;
    }
    try {
        await deleteDoc(doc(db, 'deletedClients', backupId));
        toast({ title: 'Client Permanently Deleted', description: 'The client backup has been permanently removed.' });
    } catch (error: any) {
        console.error('Error permanently deleting client:', error);
        toast({ variant: 'destructive', title: 'Permanent Deletion Failed', description: error.message });
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
    if (!authIsAuthenticated || !authUser) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return { success: false, message: "You must be logged in." };
    }
    try {
      const result = await serverGenerateTenantAccount(tenantId);

      if (result.success) {
        const tenant = rawTenantsState.find(t => t.id === tenantId);
        if (tenant && tenant.signedContractUrl && tenant.clientId && result.username) {
            await addAnnouncement({
              title: "Your Contract is Available",
              content: "Your signed lease agreement is now available for viewing. You can access it anytime from your profile menu.",
              scope: tenant.clientId,
              audience: 'tenant',
              senderId: authUser.username,
              senderName: authUser.username,
              recipientId: tenant.id,
              recipientUsername: result.username,
            });
            toast({ title: "Notification Sent", description: "Tenant was also notified about their available contract." });
        }
      }
      
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
        const collectionsToDelete = ['tenants', 'payments', 'expenses', 'additionalDues', 'businesses', 'weeklyIncomes', 'companyFundsExpenses'];
        
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
        toast({ variant: 'destructive', title: 'Cleanup Failed', description: `Cleanup failed: ${error.message}` });
        return { success: false, message: `Cleanup failed: ${error.message}` };
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
        toast({ variant: "destructive", title: "Error", description: `Failed to add business: ${error.message}` });
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
      toast({ variant: "destructive", title: "Error", description: `Failed to send request: ${error instanceof Error ? error.message : 'An unknown error occurred.'}` });
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
          throw new Error("Announcement not found.");
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
  
  const restoreFromBackup = async (backupData: any): Promise<{ success: boolean; message: string; }> => {
    if (!authUser?.isSuperAdmin) {
      const msg = "You do not have permission to restore data.";
      toast({ variant: "destructive", title: "Unauthorized", description: msg });
      return { success: false, message: msg };
    }
    
    if (!backupData || !backupData.data || typeof backupData.data !== 'object') {
        const msg = "Invalid backup file format. Missing 'data' object.";
        toast({ variant: 'destructive', title: 'Restore Failed', description: msg });
        return { success: false, message: msg };
    }

    toast({ title: "Restore In Progress", description: "This may take a moment. Please wait..." });

    const collectionsInBackup = Object.keys(backupData.data);
    const allKnownCollections = ['clients', 'tenants', 'payments', 'managedUsers', 'superAdminUsers', 'expenses', 'additionalDues', 'businesses', 'weeklyIncomes', 'announcements', 'companyFundsExpenses'];

    try {
        const allCurrentDocs: { [key: string]: string[] } = {};
        for (const collName of allKnownCollections) {
          const querySnapshot = await getDocs(collection(db, collName));
          allCurrentDocs[collName] = querySnapshot.docs.map(d => d.id);
        }
        
        const batch = writeBatch(db);

        // Delete any doc that is not in the backup
        for (const collName of allKnownCollections) {
          const backupIds = new Set((backupData.data[collName] || []).map((item: any) => item.id));
          for (const docId of allCurrentDocs[collName]) {
            if (!backupIds.has(docId)) {
              batch.delete(doc(db, collName, docId));
            }
          }
        }

        // Set/overwrite documents from the backup
        for (const collName of collectionsInBackup) {
            const collectionData = backupData.data[collName];
            if (Array.isArray(collectionData)) {
                for (const item of collectionData) {
                    if (item.id) {
                        const { id, ...itemData } = item;
                        Object.keys(itemData).forEach(key => {
                            if (itemData[key] === undefined) {
                                delete itemData[key];
                            }
                        });
                        const docRef = doc(db, collName, id);
                        batch.set(docRef, itemData);
                    }
                }
            }
        }
        
        await batch.commit();

        return { success: true, message: "Restore successful." };

    } catch (error: any) {
        console.error("Error restoring from backup:", error);
        toast({ variant: 'destructive', title: 'Restore Failed', description: `An error occurred during the restore process: ${error.message}` });
        return { success: false, message: `Restore failed: ${error.message}` };
    }
  };

  const calculatePaymentAllocation = useCallback(async (paymentId: string): Promise<PaymentAllocation | null> => {
      const payment = rawPaymentsState.find(p => p.id === paymentId);
      if (!payment) return null;

      const tenant = rawTenantsState.find(t => t.id === payment.tenantId);
      if (!tenant) return null;

      // We want the state of dues *just before* this payment was made.
      const paymentDate = new Date(payment.date);
      const boundaryDate = new Date(paymentDate.getTime() - 1); // A moment before payment

      // Get all payments for this tenant strictly *before* the current one.
      const paymentsBefore = rawPaymentsState.filter(p =>
          p.tenantId === tenant.id && new Date(p.date).getTime() < paymentDate.getTime()
      );

      // Get all dues for this tenant. We will filter them inside the balance calculation.
      const allTenantDues = rawAdditionalDuesState.filter(d => d.tenantId === tenant.id);
      
      const breakdownBefore = calculateTenantBalanceBreakdown(tenant, paymentsBefore, allTenantDues, boundaryDate);
      
      let outstandingCharges = [
          ...breakdownBefore.rentDueDetails.map(r => ({
              type: 'Rent' as const,
              amount: r.rate,
              date: new Date(r.month),
              original: r
          })),
          ...breakdownBefore.unpaidDues.map(d => ({
              type: 'Due' as const,
              amount: d.amount,
              date: new Date(d.dueDate),
              original: d
          }))
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      let amountToAllocate = payment.amount;
      const paidRent: AllocatedRentPayment[] = [];
      const paidDues: AllocatedDuePayment[] = [];

      for (const charge of outstandingCharges) {
          if (amountToAllocate <= 0) break;
          
          const amountPaid = Math.min(amountToAllocate, charge.amount);
          
          if (charge.type === 'Rent') {
              paidRent.push({ month: charge.original.month, amount: amountPaid });
          } else if (charge.type === 'Due') {
              paidDues.push({
                  due: charge.original,
                  amountPaid: amountPaid,
                  status: amountPaid >= charge.original.amount ? 'Paid' : 'Partially Paid'
              });
          }
          
          amountToAllocate -= amountPaid;
      }

      return {
          payment,
          paidRent,
          paidDues,
          unallocatedAmount: amountToAllocate,
      };
  }, [rawPaymentsState, rawTenantsState, rawAdditionalDuesState]);

  const updateClientPcCount = async (clientId: string, count: number) => {
    if (!authUser?.isSuperAdmin && authUser?.clientId !== clientId) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await updateDoc(doc(db, 'clients', clientId), { pcCount: count });
      toast({ title: "Success", description: "Number of PCs has been updated." });
    } catch (e: any) {
      console.error("Error updating PC count:", e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const assignTenantToPc = async (tenantId: string, pcNumber: number) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      const batch = writeBatch(db);
      
      // Unassign any tenant currently at that PC number
      const currentOccupant = rawTenantsState.find(t => t.pcNumber === pcNumber);
      if (currentOccupant) {
        batch.update(doc(db, 'tenants', currentOccupant.id), { pcNumber: deleteField() });
      }

      // Assign the new tenant
      batch.update(doc(db, 'tenants', tenantId), { pcNumber: pcNumber });
      
      await batch.commit();

      toast({ title: "Success", description: `Tenant assigned to PC ${pcNumber}.` });
    } catch (e: any) {
      console.error("Error assigning tenant to PC:", e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const unassignTenantFromPc = async (tenantId: string) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      await updateDoc(doc(db, 'tenants', tenantId), { pcNumber: deleteField() });
      toast({ title: "Success", description: "Tenant has been unassigned." });
    } catch (e: any) {
      console.error("Error unassigning tenant from PC:", e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };
  
  const updateClientPcIssue = async (clientId: string, pcNumber: number, newIssues: PcIssue) => {
    if (!authIsAuthenticated) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
    }
    const clientRef = doc(db, 'clients', clientId);
    try {
        const clientDoc = await getDoc(clientRef);
        const currentIssues = clientDoc.data()?.pcIssues || {};

        if (Object.keys(newIssues).length > 0) {
            currentIssues[pcNumber] = newIssues;
        } else {
            delete currentIssues[pcNumber];
        }

        await updateDoc(clientRef, { pcIssues: currentIssues });
        toast({ title: "Success", description: `Issue for PC ${pcNumber} has been updated.` });

    } catch (e: any) {
        console.error("Error updating PC issue:", e);
        toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const addTechSupportRequest = async (requestData: Omit<TechSupportRequest, 'id' | 'clientId' | 'subscriberId' | 'subscriberName' | 'createdAt' | 'status' | 'attachments'>, files: File[]) => {
    if (!authIsAuthenticated || !authUser || !authUser.tenantId || !authUser.clientId) {
        throw new Error("User is not properly authenticated or lacks tenant/client information.");
    }
    const tenant = rawTenantsState.find(t => t.id === authUser.tenantId);
    if (!tenant) {
        throw new Error("Could not find the current subscriber's details.");
    }

    const attachmentUrls: string[] = [];
    if (files.length > 0) {
        for (const file of files) {
            const fileId = uuidv4();
            const storageRef = ref(storage, `ticket_attachments/${authUser.clientId}/${fileId}-${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            attachmentUrls.push(downloadURL);
        }
    }

    const newTicket: Omit<TechSupportRequest, 'id'> = {
        ...requestData,
        attachments: attachmentUrls,
        clientId: authUser.clientId,
        subscriberId: authUser.tenantId,
        subscriberName: tenant.name,
        status: 'Pending',
        createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'techSupportRequests'), newTicket);
  };
  
  const updateTechSupportRequest = async (ticketId: string, updates: Partial<TechSupportRequest>) => {
    if (!authIsAuthenticated) {
      toast({ variant: "destructive", title: "Unauthorized" });
      return;
    }
    try {
      const ticketRef = doc(db, 'techSupportRequests', ticketId);
      await updateDoc(ticketRef, updates);
      toast({ title: "Ticket Updated", description: "The support ticket has been updated successfully." });
    } catch (e: any) {
      console.error("Error updating ticket:", e);
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
      throw e;
    }
  };

  const contextValue: AppContextType = {
    tenants,
    payments,
    clients: rawClientsState,
    managedUsers,
    rawSuperAdminUsers: rawSuperAdminUsersState,
    expenses,
    companyFundsExpenses,
    expenseCategories: definedExpenseCategories,
    additionalDues,
    viewingAsClientId,
    systemTimezone: systemTimezoneState,
    businesses,
    weeklyIncomes,
    backupScheduleSettings,
    announcements,
    terminology,
    techSupportRequests,
    
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
    generateTenantAccount,
    resetTenantPassword,
    forceChangeTenantPassword,
    uploadSignedContract,
    renewSignedContract,
    deleteSignedContract,
    updateClientPcCount,
    assignTenantToPc,
    unassignTenantFromPc,
    updateClientPcIssue,

    addPayment,
    updatePayment,
    deletePayment,
    applySecurityDeposit,
    calculatePaymentAllocation,
    
    addClient,
    updateClient,
    updateClientNotificationSettings,
    runNotificationTrigger,

    addManagedUser,
    updateManagedUser,
    deleteManagedUser,

    addSuperAdminUser,
    updateSuperAdminUser,
    deleteSuperAdminUser,

    addExpense,
    updateExpense,
    deleteExpense,
    
    addCompanyFundsExpense,
    updateCompanyFundsExpense,
    deleteCompanyFundsExpense,
    
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
    
    rawManagedUsers: rawManagedUsersState,
    rawTenants: rawTenantsState,
    rawPayments: rawPaymentsState,
    rawExpenses: rawExpensesState,
    rawAdditionalDues: rawAdditionalDuesState,
    rawDemoRequests: rawDemoRequestsState,
    rawDeletedClients: rawDeletedClientsState,
    
    rawBusinesses: rawBusinessesState,
    rawWeeklyIncomes: rawWeeklyIncomesState,
    
    addDemoRequest,
    updateDemoRequestStatus,
    deleteDemoRequest,
    
    restoreFromBackup,

    // Tenant Portal
    deleteClient,
    restoreClient,
    permanentlyDeleteClientBackup,
    cleanClientData,
    addTechSupportRequest,
    updateTechSupportRequest,
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


    





