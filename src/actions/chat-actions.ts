'use server';

import { db } from '@/lib/firebase';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { collection, doc, getDocs, query, where, limit, addDoc, setDoc, writeBatch, updateDoc } from 'firebase/firestore';

export const startChatSession = async (visitorId: string, initialMessage: { text: string }): Promise<string> => {
  // Check for an existing open session for this visitor
  const q = query(collection(db, 'chatSessions'), where('visitorId', '==', visitorId), where('status', '==', 'open'), limit(1));
  const existingSession = await getDocs(q);

  if (!existingSession.empty) {
    const sessionId = existingSession.docs[0].id;
    // Send the initial message to the existing session
    await sendChatMessage(sessionId, { sender: 'visitor', text: initialMessage.text });
    return sessionId;
  }

  // Create a new session
  const now = new Date().toISOString();
  const newSessionData: Omit<ChatSession, 'id'> = {
    visitorId,
    status: 'open',
    createdAt: now,
    lastMessageAt: now,
    lastMessageSnippet: initialMessage.text,
    adminUnread: true,
    visitorUnread: false,
  };

  const sessionRef = await addDoc(collection(db, 'chatSessions'), newSessionData);
  
  // Add the first message to the subcollection
  const messageRef = doc(collection(db, `chatSessions/${sessionRef.id}/chatMessages`));
  await setDoc(messageRef, {
    sessionId: sessionRef.id,
    sender: 'visitor',
    text: initialMessage.text,
    timestamp: now,
  });
  
  return sessionRef.id;
};

export const sendChatMessage = async (sessionId: string, message: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp'>) => {
  const batch = writeBatch(db);
  const sessionRef = doc(db, 'chatSessions', sessionId);
  const now = new Date().toISOString();
  
  // Update session metadata
  batch.update(sessionRef, {
    lastMessageAt: now,
    lastMessageSnippet: message.text,
    status: 'open', // Re-open session if it was closed
    adminUnread: message.sender === 'visitor',
    visitorUnread: message.sender === 'admin',
  });

  // Add new message to subcollection
  const messageRef = doc(collection(db, `chatSessions/${sessionId}/chatMessages`));
  batch.set(messageRef, {
    ...message,
    sessionId: sessionId,
    timestamp: now,
  });

  await batch.commit();
};

export const markSessionAsRead = async (sessionId: string, userType: 'visitor' | 'admin') => {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  const updateData = userType === 'visitor' ? { visitorUnread: false } : { adminUnread: false };
  await updateDoc(sessionRef, updateData);
};

export const closeChatSession = async (sessionId: string) => {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  await updateDoc(sessionRef, { status: 'closed' });
};
