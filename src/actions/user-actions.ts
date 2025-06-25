
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where, updateDoc, getDoc, DocumentReference } from 'firebase/firestore';
import type { ManagedUser, SuperAdminUser, Tenant, User } from '@/lib/types';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Helper for verifying password and migrating plaintext to hash if needed
async function verifyPasswordAndMigrate(
  docRef: DocumentReference,
  passwordInput: string,
  storedPassword?: string
): Promise<boolean> {
  if (!storedPassword) {
    return false;
  }
  
  let isMatch = false;
  try {
    isMatch = await bcrypt.compare(passwordInput, storedPassword);
  } catch (e) {
    console.warn("bcrypt comparison failed, attempting plaintext check for migration. This is expected for users with legacy passwords.");
  }
  
  if (!isMatch && passwordInput === storedPassword) {
    isMatch = true;
    try {
      const newHashedPassword = await hashPassword(passwordInput);
      await updateDoc(docRef, { password: newHashedPassword });
      console.log(`Password for document ${docRef.id} has been migrated to a hash.`);
    } catch(updateError) {
      console.error(`Failed to migrate password for document ${docRef.id}:`, updateError);
    }
  }
  
  return isMatch;
}

// Super Admin Actions
export async function serverAddSuperAdminUser(userData: Omit<SuperAdminUser, 'id'>): Promise<void> {
  if (!userData.password) throw new Error("Password is required for new super admins.");
  const hashedPassword = await hashPassword(userData.password);
  await addDoc(collection(db, 'superAdminUsers'), {
    username: userData.username,
    password: hashedPassword,
  });
}

export async function serverUpdateSuperAdminUser(userId: string, userData: Partial<SuperAdminUser>): Promise<void> {
  const dataToUpdate: Partial<SuperAdminUser> = { username: userData.username };
  if (userData.password) {
    dataToUpdate.password = await hashPassword(userData.password);
  }
  await setDoc(doc(db, 'superAdminUsers', userId), dataToUpdate, { merge: true });
}

// Managed User Actions
export async function serverAddManagedUser(userData: Omit<ManagedUser, 'id'>): Promise<void> {
    if (!userData.password) throw new Error("Password is required for new users.");
    const hashedPassword = await hashPassword(userData.password);
    await addDoc(collection(db, 'managedUsers'), {
        username: userData.username,
        email: userData.email,
        clientId: userData.clientId,
        role: userData.role,
        password: hashedPassword,
        canApplyDiscount: userData.canApplyDiscount || false,
    });
}

export async function serverUpdateManagedUser(userId: string, userData: Partial<ManagedUser>): Promise<void> {
    const dataToUpdate: Partial<ManagedUser> = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        clientId: userData.clientId,
        canApplyDiscount: userData.canApplyDiscount,
    };
    if (userData.password) {
        dataToUpdate.password = await hashPassword(userData.password);
    }
    await setDoc(doc(db, 'managedUsers', userId), dataToUpdate, { merge: true });
}

export async function serverChangeManagedUserPassword(
  userId: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const userDocRef = doc(db, 'managedUsers', userId);
  const userSnapshot = await getDoc(userDocRef);

  if (!userSnapshot.exists()) {
    return { success: false, message: 'User not found.' };
  }

  const userData = userSnapshot.data() as ManagedUser;
  
  const isMatch = await verifyPasswordAndMigrate(userDocRef, currentPasswordInput, userData.password);

  if (!isMatch) {
    return { success: false, message: 'Incorrect current password.' };
  }

  const newHashedPassword = await hashPassword(newPasswordInput);
  await updateDoc(userDocRef, { password: newHashedPassword });

  return { success: true, message: 'Password changed successfully.' };
}

// New Tenant Account Generation Action
export async function serverGenerateTenantAccount(tenantId: string): Promise<{success: boolean, username?: string, password?: string, message?: string}> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnapshot = await getDoc(tenantRef);

    if (!tenantSnapshot.exists()) {
        return { success: false, message: 'Tenant not found.' };
    }
    if (tenantSnapshot.data().hasAccount) {
        return { success: false, message: 'This tenant already has an account.' };
    }

    const username = `tenant${Math.floor(100000 + Math.random() * 900000)}`;
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(temporaryPassword);

    await updateDoc(tenantRef, {
        username: username,
        password: hashedPassword,
        hasAccount: true,
        temporaryPassword: true,
        invitationToken: null, 
        invitationTokenExpires: null,
    });
    
    return { success: true, username: username, password: temporaryPassword };
}

// Reset Tenant Password Action
export async function serverResetTenantPassword(tenantId: string): Promise<{success: boolean, password?: string, message?: string}> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnapshot = await getDoc(tenantRef);

    if (!tenantSnapshot.exists()) {
        return { success: false, message: 'Tenant not found.' };
    }
    if (!tenantSnapshot.data().hasAccount) {
        return { success: false, message: 'This tenant does not have an account yet. Please generate one first.' };
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(temporaryPassword);

    await updateDoc(tenantRef, {
        password: hashedPassword,
        temporaryPassword: true,
    });
    
    return { success: true, password: temporaryPassword };
}


// New Tenant Force Password Change Action
export async function serverForceChangeTenantPassword(tenantId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const tenantRef = doc(db, 'tenants', tenantId);
    
    const newHashedPassword = await hashPassword(newPassword);
    
    await updateDoc(tenantRef, {
        password: newHashedPassword,
        temporaryPassword: false,
    });
    
    return { success: true, message: 'Password changed successfully! You can now log in with your new password.' };
}


// Login Verification Action
export async function serverVerifyCredentials(usernameInput: string, passwordInput: string): Promise<User | null> {
    // 1. Check primary hardcoded super admin
    if (usernameInput === 'admin' && passwordInput === 'password123') {
        return { username: usernameInput, isSuperAdmin: true };
    }

    // 2. Check additional super admin users by username
    const superAdminQuery = query(collection(db, 'superAdminUsers'), where('username', '==', usernameInput));
    const superAdminSnapshot = await getDocs(superAdminQuery);

    if (!superAdminSnapshot.empty) {
        const superAdminDoc = superAdminSnapshot.docs[0];
        const superAdminData = superAdminDoc.data() as SuperAdminUser;
        if (await verifyPasswordAndMigrate(superAdminDoc.ref, passwordInput, superAdminData.password)) {
            return { username: superAdminData.username, isSuperAdmin: true };
        }
    }
    
    // 3. Check managed client users by username
    const managedUserQuery = query(collection(db, 'managedUsers'), where('username', '==', usernameInput));
    const managedUserSnapshot = await getDocs(managedUserQuery);
    if (!managedUserSnapshot.empty) {
        const managedUserDoc = managedUserSnapshot.docs[0];
        const managedUserData = managedUserDoc.data() as ManagedUser;
        if (await verifyPasswordAndMigrate(managedUserDoc.ref, passwordInput, managedUserData.password)) {
            return {
                username: managedUserData.username,
                email: managedUserData.email,
                clientId: managedUserData.clientId,
                isSuperAdmin: false,
                role: managedUserData.role,
                canApplyDiscount: managedUserData.canApplyDiscount,
            };
        }
    }

    // 4. Check tenants by username
    const tenantQuery = query(collection(db, 'tenants'), where('username', '==', usernameInput));
    const tenantSnapshot = await getDocs(tenantQuery);
    if (!tenantSnapshot.empty) {
        const tenantDoc = tenantSnapshot.docs[0];
        const tenantData = tenantDoc.data() as Tenant;

        if (!tenantData.hasAccount) {
            return null; // Don't allow login if account not activated
        }
        
        if (await verifyPasswordAndMigrate(tenantDoc.ref, passwordInput, tenantData.password)) {
             return {
                username: tenantData.username!,
                email: tenantData.email,
                tenantId: tenantDoc.id,
                isSuperAdmin: false,
                role: 'tenant',
                clientId: tenantData.clientId,
                temporaryPassword: tenantData.temporaryPassword || false,
            };
        }
    }

    return null; // No user found or password incorrect
}
