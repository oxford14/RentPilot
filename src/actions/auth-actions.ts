'use server';

import { getAdminAuth } from '@/lib/firebase-admin';
import { getFirebaseAuthClaims, getFirebaseUid } from '@/lib/auth-token';
import type { User } from '@/lib/types';

export async function serverCreateFirebaseCustomToken(
  user: User
): Promise<string> {
  const uid = getFirebaseUid(user);
  const claims = getFirebaseAuthClaims(user);
  return getAdminAuth().createCustomToken(uid, claims);
}
