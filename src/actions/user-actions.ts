
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where, updateDoc, getDoc } from 'firebase/firestore';
import type { ManagedUser, SuperAdminUser, Tenant, User } from '@/lib/types';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
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
    });
}

export async function serverUpdateManagedUser(userId: string, userData: Partial<ManagedUser>): Promise<void> {
    const dataToUpdate: Partial<ManagedUser> = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        clientId: userData.clientId,
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
  const isMatch = await bcrypt.compare(currentPasswordInput, userData.password || '');

  if (!isMatch) {
    return { success: false, message: 'Incorrect current password.' };
  }

  const newHashedPassword = await hashPassword(newPasswordInput);
  await updateDoc(userDocRef, { password: newHashedPassword });

  return { success: true, message: 'Password changed successfully.' };
}


// Tenant Signup Action
export async function serverCompleteTenantSignup(token: string, password: string): Promise<{ success: boolean, message: string }> {
    const q = query(collection(db, 'tenants'), where('invitationToken', '==', token));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { success: false, message: 'Invalid or expired invitation link.' };
    }

    const tenantDoc = snapshot.docs[0];
    const tenant = tenantDoc.data() as Tenant;

    if (tenant.invitationTokenExpires && tenant.invitationTokenExpires < Date.now()) {
        return { success: false, message: 'This invitation link has expired. Please request a new one.' };
    }

    const hashedPassword = await hashPassword(password);
    await updateDoc(tenantDoc.ref, {
        password: hashedPassword,
        hasAccount: true,
        invitationToken: null,
        invitationTokenExpires: null,
    });
    
    return { success: true, message: 'Account created successfully! You can now log in.' };
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
        if (superAdminData.password && await bcrypt.compare(passwordInput, superAdminData.password)) {
            return { username: superAdminData.username, isSuperAdmin: true };
        }
    }
    
    // 3. Check managed client users by username
    const managedUserQuery = query(collection(db, 'managedUsers'), where('username', '==', usernameInput));
    const managedUserSnapshot = await getDocs(managedUserQuery);
    if (!managedUserSnapshot.empty) {
        const managedUserDoc = managedUserSnapshot.docs[0];
        const managedUserData = managedUserDoc.data() as ManagedUser;
        if (managedUserData.password && await bcrypt.compare(passwordInput, managedUserData.password)) {
            return {
                username: managedUserData.username,
                clientId: managedUserData.clientId,
                isSuperAdmin: false,
                role: managedUserData.role,
            };
        }
    }

    // 4. Check tenants by email
    const tenantQuery = query(collection(db, 'tenants'), where('email', '==', usernameInput));
    const tenantSnapshot = await getDocs(tenantQuery);
    if (!tenantSnapshot.empty) {
        const tenantDoc = tenantSnapshot.docs[0];
        const tenantData = tenantDoc.data() as Tenant;

        if (!tenantData.hasAccount) {
            return null; // Don't allow login if account not activated
        }
        
        if (tenantData.password && await bcrypt.compare(passwordInput, tenantData.password)) {
             return {
                username: tenantData.name,
                email: tenantData.email,
                tenantId: tenantDoc.id,
                isSuperAdmin: false,
                role: 'tenant',
                clientId: tenantData.clientId,
            };
        }
    }

    return null; // No user found or password incorrect
}
