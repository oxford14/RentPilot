
'use server';

import { db } from '@/lib/firebase';
import type { DemoRequest } from '@/lib/types';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

export async function serverAddDemoRequest(requestData: Omit<DemoRequest, 'id' | 'createdAt' | 'status'>) {
    await addDoc(collection(db, 'demoRequests'), {
        ...requestData,
        status: 'pending',
        createdAt: new Date().toISOString(),
    });
}

export async function serverGetDemoRequests(): Promise<DemoRequest[]> {
    const q = query(collection(db, 'demoRequests'));
    const querySnapshot = await getDocs(q);
    const requests: DemoRequest[] = [];
    querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as DemoRequest);
    });
    return requests;
}
