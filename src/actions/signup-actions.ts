'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import type { Client, ManagedUser } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { addMonths } from 'date-fns';

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

export async function handleSignUp(data: SignUpData): Promise<{ success: boolean; message: string }> {
  try {
    // Check if username or email already exists in either collection
    const usernameQueryManaged = query(collection(db, 'managedUsers'), where('username', '==', data.username));
    const emailQueryManaged = query(collection(db, 'managedUsers'), where('email', '==', data.email));

    const [usernameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(usernameQueryManaged),
        getDocs(emailQueryManaged),
    ]);

    if (!usernameSnapshot.empty) {
        return { success: false, message: 'Username is already taken. Please choose another one.' };
    }
    if (!emailSnapshot.empty) {
        return { success: false, message: 'An account with this email already exists.' };
    }

    // 1. Create the new Client
    const newClientData: Omit<Client, 'id'> = {
      name: data.name,
      businessType: data.businessType,
      subscriptionStatus: 'active',
      subscriptionPlanName: 'Trial',
      subscriptionRate: 0,
      subscriptionEndDate: addMonths(new Date(), 1).toISOString(),
      timezone: data.timezone,
    };

    const clientRef = await addDoc(collection(db, 'clients'), newClientData);

    // 2. Create the new ManagedUser (admin for the client)
    const hashedPassword = await hashPassword(data.password);
    const newUserData: Omit<ManagedUser, 'id'> = {
      username: data.username,
      email: data.email,
      password: hashedPassword,
      clientId: clientRef.id,
      role: 'admin',
      canApplyDiscount: true,
    };

    await addDoc(collection(db, 'managedUsers'), newUserData);

    return { success: true, message: 'Account created successfully!' };

  } catch (error: any) {
    console.error("Error during sign up:", error);
    return { success: false, message: error.message || 'An unknown server error occurred.' };
  }
}
