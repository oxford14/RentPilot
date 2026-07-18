'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { Client, ManagedUser } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { addMonths } from 'date-fns';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

interface SignUpData {
  name: string;
  email: string;
  username: string;
  password: string;
  businessType: Client['businessType'];
  timezone: string;
}

export async function handleSignUp(
  data: SignUpData
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getAdminDb();

    const [usernameSnapshot, emailSnapshot] = await Promise.all([
      db.collection('managedUsers').where('username', '==', data.username).get(),
      db.collection('managedUsers').where('email', '==', data.email).get(),
    ]);

    if (!usernameSnapshot.empty) {
      return {
        success: false,
        message: 'Username is already taken. Please choose another one.',
      };
    }
    if (!emailSnapshot.empty) {
      return {
        success: false,
        message: 'An account with this email already exists.',
      };
    }

    const newClientData: Omit<Client, 'id'> = {
      name: data.name,
      businessType: data.businessType,
      subscriptionStatus: 'active',
      subscriptionPlanName: 'Trial',
      subscriptionRate: 0,
      subscriptionEndDate: addMonths(new Date(), 1).toISOString(),
      timezone: data.timezone,
    };

    const clientRef = await db.collection('clients').add(newClientData);

    const hashedPassword = await hashPassword(data.password);
    const newUserData: Omit<ManagedUser, 'id'> = {
      username: data.username,
      email: data.email,
      password: hashedPassword,
      clientId: clientRef.id,
      role: 'admin',
      canApplyDiscount: true,
    };

    await db.collection('managedUsers').add(newUserData);

    return { success: true, message: 'Account created successfully!' };
  } catch (error: unknown) {
    console.error('Error during sign up:', error);
    const message = getFriendlyErrorMessage(error, 'We couldn’t create your account. Please try again.');
    return { success: false, message };
  }
}
