'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { serverCreateFirebaseCustomToken } from '@/actions/auth-actions';
import type { ManagedUser, SuperAdminUser, Tenant, User } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';
import { tenantCredentialsEmail } from '@/lib/email/templates';
import type { Firestore } from 'firebase-admin/firestore';

const SALT_ROUNDS = 10;

export type LoginResult = {
  user: User;
  firebaseToken: string;
};

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPasswordAndMigrate(
  db: Firestore,
  collectionName: string,
  docId: string,
  passwordInput: string,
  storedPassword?: string
): Promise<boolean> {
  if (!storedPassword) {
    return false;
  }

  const docRef = db.collection(collectionName).doc(docId);
  const isLikelyHashed =
    storedPassword.startsWith('$2a$') ||
    storedPassword.startsWith('$2b$') ||
    storedPassword.startsWith('$2y$');

  if (isLikelyHashed) {
    try {
      const match = await bcrypt.compare(passwordInput, storedPassword);
      if (match) {
        return true;
      }
    } catch {
      // Fall through to plaintext check.
    }
  }

  if (passwordInput === storedPassword) {
    try {
      const newHashedPassword = await hashPassword(passwordInput);
      await docRef.update({ password: newHashedPassword });
      console.log(`Password for document ${docId} has been migrated to a hash.`);
    } catch (updateError) {
      console.error(`Failed to migrate password for document ${docId}:`, updateError);
    }
    return true;
  }

  return false;
}

export async function serverAddSuperAdminUser(
  userData: Omit<SuperAdminUser, 'id'>
): Promise<void> {
  if (!userData.password) throw new Error('Password is required for new super admins.');
  const db = getAdminDb();
  const hashedPassword = await hashPassword(userData.password);
  await db.collection('superAdminUsers').add({
    username: userData.username,
    password: hashedPassword,
  });
}

export async function serverUpdateSuperAdminUser(
  userId: string,
  userData: Partial<SuperAdminUser>
): Promise<void> {
  const db = getAdminDb();
  const dataToUpdate: Partial<SuperAdminUser> = { username: userData.username };
  if (userData.password) {
    dataToUpdate.password = await hashPassword(userData.password);
  }
  await db.collection('superAdminUsers').doc(userId).set(dataToUpdate, { merge: true });
}

export async function serverAddManagedUser(
  userData: Omit<ManagedUser, 'id'>
): Promise<void> {
  if (!userData.password) throw new Error('Password is required for new users.');
  const db = getAdminDb();
  const hashedPassword = await hashPassword(userData.password);
  await db.collection('managedUsers').add({
    username: userData.username,
    email: userData.email,
    clientId: userData.clientId,
    role: userData.role,
    password: hashedPassword,
    canApplyDiscount: userData.canApplyDiscount || false,
  });
}

export async function serverUpdateManagedUser(
  userId: string,
  userData: Partial<ManagedUser>
): Promise<void> {
  const db = getAdminDb();
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
  await db.collection('managedUsers').doc(userId).set(dataToUpdate, { merge: true });
}

export async function serverChangeManagedUserPassword(
  userId: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const db = getAdminDb();
  const userDocRef = db.collection('managedUsers').doc(userId);
  const userSnapshot = await userDocRef.get();

  if (!userSnapshot.exists) {
    return { success: false, message: 'User not found.' };
  }

  const userData = userSnapshot.data() as ManagedUser;
  const isMatch = await verifyPasswordAndMigrate(
    db,
    'managedUsers',
    userId,
    currentPasswordInput,
    userData.password
  );

  if (!isMatch) {
    return { success: false, message: 'Incorrect current password.' };
  }

  const newHashedPassword = await hashPassword(newPasswordInput);
  await userDocRef.update({ password: newHashedPassword });

  return { success: true, message: 'Password changed successfully.' };
}

export async function serverGenerateTenantAccount(
  tenantId: string
): Promise<{ success: boolean; username?: string; password?: string; message?: string }> {
  const db = getAdminDb();
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    return { success: false, message: 'Tenant not found.' };
  }
  const tenantData = tenantSnapshot.data() as Tenant;

  if (tenantData.hasAccount) {
    return { success: false, message: 'This tenant already has an account.' };
  }
  if (!tenantData.email) {
    return {
      success: false,
      message: 'Tenant does not have an email address on file. Cannot send credentials.',
    };
  }

  const username = `tenant${Math.floor(100000 + Math.random() * 900000)}`;
  const temporaryPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await hashPassword(temporaryPassword);

  await tenantRef.update({
    username,
    password: hashedPassword,
    hasAccount: true,
    temporaryPassword: true,
  });

  const clientName = tenantData.clientId
    ? (await db.collection('clients').doc(tenantData.clientId).get()).data()?.name ||
      'your landlord'
    : 'your landlord';

  const { subject, html } = tenantCredentialsEmail({
    tenantName: tenantData.name,
    clientName,
    username,
    temporaryPassword,
  });
  await sendEmail({ to: tenantData.email, subject, html });

  return { success: true, username, password: temporaryPassword };
}

export async function serverResetTenantPassword(
  tenantId: string
): Promise<{ success: boolean; password?: string; message?: string }> {
  const db = getAdminDb();
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    return { success: false, message: 'Tenant not found.' };
  }
  const tenantData = tenantSnapshot.data() as Tenant;

  if (!tenantData.hasAccount) {
    return {
      success: false,
      message: 'This tenant does not have an account yet. Please generate one first.',
    };
  }
  if (!tenantData.email) {
    return {
      success: false,
      message: 'Tenant does not have an email address on file. Cannot send new password.',
    };
  }

  const temporaryPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await hashPassword(temporaryPassword);

  await tenantRef.update({
    password: hashedPassword,
    temporaryPassword: true,
  });

  const clientName = tenantData.clientId
    ? (await db.collection('clients').doc(tenantData.clientId).get()).data()?.name ||
      'your landlord'
    : 'your landlord';

  const { subject, html } = tenantCredentialsEmail({
    tenantName: tenantData.name,
    clientName,
    username: tenantData.username!,
    temporaryPassword,
    isReset: true,
  });
  await sendEmail({ to: tenantData.email, subject, html });

  return { success: true, password: temporaryPassword };
}

export async function serverForceChangeTenantPassword(
  tenantId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const db = getAdminDb();
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    return { success: false, message: 'Tenant not found.' };
  }
  const currentTenant = tenantSnapshot.data() as Tenant;

  if (currentTenant.email) {
    const querySnapshot = await db
      .collection('tenants')
      .where('email', '==', currentTenant.email)
      .get();

    for (const tenantDoc of querySnapshot.docs) {
      if (tenantDoc.id === tenantId) continue;

      const otherTenant = tenantDoc.data() as Tenant;
      const isMatch = await verifyPasswordAndMigrate(
        db,
        'tenants',
        tenantDoc.id,
        newPassword,
        otherTenant.password
      );

      if (isMatch) {
        return { success: false, message: 'Please try a different password.' };
      }
    }
  }

  const newHashedPassword = await hashPassword(newPassword);

  await tenantRef.update({
    password: newHashedPassword,
    temporaryPassword: false,
  });

  return {
    success: true,
    message: 'Password changed successfully! You can now log in with your new password.',
  };
}

export async function serverChangeTenantPassword(
  tenantId: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const db = getAdminDb();
  const tenantDocRef = db.collection('tenants').doc(tenantId);
  const tenantSnapshot = await tenantDocRef.get();

  if (!tenantSnapshot.exists) {
    return { success: false, message: 'Tenant not found.' };
  }

  const tenantData = tenantSnapshot.data() as Tenant;

  if (!tenantData.hasAccount) {
    return { success: false, message: 'Account not active.' };
  }

  const isMatch = await verifyPasswordAndMigrate(
    db,
    'tenants',
    tenantId,
    currentPasswordInput,
    tenantData.password
  );

  if (!isMatch) {
    return { success: false, message: 'Incorrect current password.' };
  }

  if (tenantData.email) {
    const querySnapshot = await db
      .collection('tenants')
      .where('email', '==', tenantData.email)
      .get();

    for (const otherTenantDoc of querySnapshot.docs) {
      if (otherTenantDoc.id === tenantId) continue;

      const otherTenant = otherTenantDoc.data() as Tenant;
      const newPasswordIsMatchForOther = await verifyPasswordAndMigrate(
        db,
        'tenants',
        otherTenantDoc.id,
        newPasswordInput,
        otherTenant.password
      );

      if (newPasswordIsMatchForOther) {
        return { success: false, message: 'Please try a different password.' };
      }
    }
  }

  const newHashedPassword = await hashPassword(newPasswordInput);
  await tenantDocRef.update({ password: newHashedPassword, temporaryPassword: false });

  return { success: true, message: 'Password changed successfully.' };
}

export async function serverVerifyCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<LoginResult | null> {
  const db = getAdminDb();

  const superAdminSnapshot = await db
    .collection('superAdminUsers')
    .where('username', '==', usernameInput)
    .get();

  if (!superAdminSnapshot.empty) {
    for (const superAdminDoc of superAdminSnapshot.docs) {
      const superAdminData = superAdminDoc.data() as SuperAdminUser;
      if (
        await verifyPasswordAndMigrate(
          db,
          'superAdminUsers',
          superAdminDoc.id,
          passwordInput,
          superAdminData.password
        )
      ) {
        const user: User = {
          id: superAdminDoc.id,
          username: superAdminData.username,
          isSuperAdmin: true,
        };
        const firebaseToken = await serverCreateFirebaseCustomToken(user);
        return { user, firebaseToken };
      }
    }
  }

  let managedUserDocs = (
    await db.collection('managedUsers').where('username', '==', usernameInput).get()
  ).docs;

  if (managedUserDocs.length === 0) {
    managedUserDocs = (
      await db.collection('managedUsers').where('email', '==', usernameInput).get()
    ).docs;
  }

  if (managedUserDocs.length > 0) {
    for (const managedUserDoc of managedUserDocs) {
      const managedUserData = managedUserDoc.data() as ManagedUser;
      if (
        await verifyPasswordAndMigrate(
          db,
          'managedUsers',
          managedUserDoc.id,
          passwordInput,
          managedUserData.password
        )
      ) {
        const user: User = {
          id: managedUserDoc.id,
          username: managedUserData.username,
          email: managedUserData.email,
          clientId: managedUserData.clientId,
          isSuperAdmin: false,
          role: managedUserData.role,
          canApplyDiscount: managedUserData.canApplyDiscount,
        };
        const firebaseToken = await serverCreateFirebaseCustomToken(user);
        return { user, firebaseToken };
      }
    }
  }

  let tenantDocs = (
    await db.collection('tenants').where('username', '==', usernameInput).get()
  ).docs;

  if (tenantDocs.length === 0 && usernameInput.includes('@')) {
    tenantDocs = (
      await db.collection('tenants').where('email', '==', usernameInput).get()
    ).docs;
  }

  if (tenantDocs.length > 0) {
    for (const tenantDoc of tenantDocs) {
      const tenantData = tenantDoc.data() as Tenant;

      if (!tenantData.hasAccount) {
        continue;
      }

      if (
        await verifyPasswordAndMigrate(
          db,
          'tenants',
          tenantDoc.id,
          passwordInput,
          tenantData.password
        )
      ) {
        const user: User = {
          username: tenantData.username!,
          email: tenantData.email,
          tenantId: tenantDoc.id,
          isSuperAdmin: false,
          role: 'tenant',
          clientId: tenantData.clientId,
          temporaryPassword: tenantData.temporaryPassword || false,
        };
        const firebaseToken = await serverCreateFirebaseCustomToken(user);
        return { user, firebaseToken };
      }
    }
  }

  return null;
}
