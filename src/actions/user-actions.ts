
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where, updateDoc, getDoc, DocumentReference, writeBatch } from 'firebase/firestore';
import type { ManagedUser, SuperAdminUser, Tenant, User, Client } from '@/lib/types';
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

  const isLikelyHashed = storedPassword.length > 50 && storedPassword.startsWith('$2');
  
  if (isLikelyHashed) {
    try {
      const isMatch = await bcrypt.compare(passwordInput, storedPassword);
      if (isMatch) return true;
    } catch (e) {
      // Not a valid hash, proceed to plaintext check
    }
  } 
  
  // If not hashed, or if bcrypt compare failed/returned false, try plaintext
  if (passwordInput === storedPassword) {
      try {
        const newHashedPassword = await hashPassword(passwordInput);
        await updateDoc(docRef, { password: newHashedPassword });
        console.log(`Password for document ${docRef.id} has been migrated to a hash.`);
      } catch (updateError) {
        console.error(`Failed to migrate password for document ${docRef.id}:`, updateError);
      }
      return true; // Login is successful even if migration fails.
  }

  return false;
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
    const tenantData = tenantSnapshot.data() as Tenant;

    if (tenantData.hasAccount) {
        return { success: false, message: 'This tenant already has an account.' };
    }
    if (!tenantData.email) {
        return { success: false, message: 'Tenant does not have an email address on file. Cannot send credentials.' };
    }

    const username = `tenant${Math.floor(100000 + Math.random() * 900000)}`;
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(temporaryPassword);

    const batch = writeBatch(db);

    batch.update(tenantRef, {
        username: username,
        password: hashedPassword,
        hasAccount: true,
        temporaryPassword: true,
    });

    const clientName = tenantData.clientId ? (await getDoc(doc(db, 'clients', tenantData.clientId))).data()?.name || 'your landlord' : 'your landlord';

    const emailBody = `
        <p>Hello ${tenantData.name},</p>
        <p>An account has been created for you on the RentPilot portal by ${clientName}.</p>
        <p>You can use these credentials to log in. You will be required to change your password on your first login.</p>
        <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Thank you!</p>
    `;

    const mailRef = doc(collection(db, 'mail'));
    batch.set(mailRef, {
        to: [tenantData.email],
        message: {
            subject: `Your Tenant Portal Account Details from ${clientName}`,
            html: emailBody,
        },
    });

    await batch.commit();
    
    return { success: true, username: username, password: temporaryPassword };
}

// Reset Tenant Password Action
export async function serverResetTenantPassword(tenantId: string): Promise<{success: boolean, password?: string, message?: string}> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnapshot = await getDoc(tenantRef);

    if (!tenantSnapshot.exists()) {
        return { success: false, message: 'Tenant not found.' };
    }
    const tenantData = tenantSnapshot.data() as Tenant;

    if (!tenantData.hasAccount) {
        return { success: false, message: 'This tenant does not have an account yet. Please generate one first.' };
    }
    if (!tenantData.email) {
        return { success: false, message: 'Tenant does not have an email address on file. Cannot send new password.' };
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(temporaryPassword);

    const batch = writeBatch(db);

    batch.update(tenantRef, {
        password: hashedPassword,
        temporaryPassword: true,
    });

    const clientName = tenantData.clientId ? (await getDoc(doc(db, 'clients', tenantData.clientId))).data()?.name || 'your landlord' : 'your landlord';
    
    const emailBody = `
        <p>Hello ${tenantData.name},</p>
        <p>Your password for the RentPilot portal has been reset by ${clientName}.</p>
        <p>Please use the following temporary password to log in. You will be required to create a new password after logging in.</p>
        <ul>
            <li><strong>Username:</strong> ${tenantData.username}</li>
            <li><strong>New Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Thank you!</p>
    `;

    const mailRef = doc(collection(db, 'mail'));
    batch.set(mailRef, {
        to: [tenantData.email],
        message: {
            subject: `Your Password has been Reset - ${clientName}`,
            html: emailBody,
        },
    });
    
    await batch.commit();
    
    return { success: true, password: temporaryPassword };
}


// New Tenant Force Password Change Action
export async function serverForceChangeTenantPassword(tenantId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnapshot = await getDoc(tenantRef);

    if (!tenantSnapshot.exists()) {
        return { success: false, message: 'Tenant not found.' };
    }
    const currentTenant = tenantSnapshot.data() as Tenant;

    if (currentTenant.email) {
        const q = query(
            collection(db, 'tenants'),
            where('email', '==', currentTenant.email)
        );
        const querySnapshot = await getDocs(q);

        for (const tenantDoc of querySnapshot.docs) {
            if (tenantDoc.id === tenantId) continue; // Skip self

            const otherTenant = tenantDoc.data() as Tenant;
            const isMatch = await verifyPasswordAndMigrate(tenantDoc.ref, newPassword, otherTenant.password);

            if (isMatch) {
                return { success: false, message: 'Another user with the same email already uses this password. Please try a different password.' };
            }
        }
    }
    
    const newHashedPassword = await hashPassword(newPassword);
    
    await updateDoc(tenantRef, {
        password: newHashedPassword,
        temporaryPassword: false,
    });
    
    return { success: true, message: 'Password changed successfully! You can now log in with your new password.' };
}


// Tenant self-service password change
export async function serverChangeTenantPassword(
  tenantId: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const tenantDocRef = doc(db, 'tenants', tenantId);
  const tenantSnapshot = await getDoc(tenantDocRef);

  if (!tenantSnapshot.exists()) {
    return { success: false, message: 'Tenant not found.' };
  }

  const tenantData = tenantSnapshot.data() as Tenant;

  if (!tenantData.hasAccount) {
    return { success: false, message: 'Account not active.' };
  }
  
  const isMatch = await verifyPasswordAndMigrate(tenantDocRef, currentPasswordInput, tenantData.password);

  if (!isMatch) {
    return { success: false, message: 'Incorrect current password.' };
  }

  const newHashedPassword = await hashPassword(newPasswordInput);
  await updateDoc(tenantDocRef, { password: newHashedPassword, temporaryPassword: false });

  return { success: true, message: 'Password changed successfully.' };
}


// Login Verification Action
export async function serverVerifyCredentials(usernameInput: string, passwordInput: string): Promise<User | null> {
    
    // 1. Check super admin users
    const superAdminQuery = query(collection(db, 'superAdminUsers'), where('username', '==', usernameInput));
    const superAdminSnapshot = await getDocs(superAdminQuery);
    if (!superAdminSnapshot.empty) {
        for (const superAdminDoc of superAdminSnapshot.docs) {
            const superAdminData = superAdminDoc.data() as SuperAdminUser;
            if (await verifyPasswordAndMigrate(superAdminDoc.ref, passwordInput, superAdminData.password)) {
                return { username: superAdminData.username, isSuperAdmin: true };
            }
        }
    }
    
    // 2. Check managed client users
    const managedUserQueryByName = query(collection(db, 'managedUsers'), where('username', '==', usernameInput));
    const managedUserSnapshotByName = await getDocs(managedUserQueryByName);

    let managedUserDocs = managedUserSnapshotByName.docs;
    
    if (managedUserDocs.length === 0) {
        const managedUserQueryByEmail = query(collection(db, 'managedUsers'), where('email', '==', usernameInput));
        const managedUserSnapshotByEmail = await getDocs(managedUserQueryByEmail);
        managedUserDocs = managedUserSnapshotByEmail.docs;
    }

    if (managedUserDocs.length > 0) {
        for (const managedUserDoc of managedUserDocs) {
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
    }

    // 3. Check tenants
    const tenantQueryByUsername = query(collection(db, 'tenants'), where('username', '==', usernameInput));
    const tenantSnapshotByUsername = await getDocs(tenantQueryByUsername);
    let tenantDocs = tenantSnapshotByUsername.docs;

    if (tenantDocs.length === 0 && usernameInput.includes('@')) {
        const tenantQueryByEmail = query(collection(db, 'tenants'), where('email', '==', usernameInput));
        const tenantSnapshotByEmail = await getDocs(tenantQueryByEmail);
        tenantDocs = tenantSnapshotByEmail.docs;
    }

    if (tenantDocs.length > 0) {
        for (const tenantDoc of tenantDocs) {
            const tenantData = tenantDoc.data() as Tenant;

            if (!tenantData.hasAccount) {
                continue; // Skip to next tenant if account is not active
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
    }

    return null; // No user found or password incorrect for any matching user
}
