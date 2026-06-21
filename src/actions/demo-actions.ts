'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { DemoRequest } from '@/lib/types';

export async function serverAddDemoRequest(
  requestData: Omit<DemoRequest, 'id' | 'createdAt' | 'status'>
) {
  const db = getAdminDb();
  await db.collection('demoRequests').add({
    ...requestData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function serverGetDemoRequests(): Promise<DemoRequest[]> {
  const db = getAdminDb();
  const querySnapshot = await db.collection('demoRequests').get();
  return querySnapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as DemoRequest
  );
}
