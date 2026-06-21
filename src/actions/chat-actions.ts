'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { ChatMessage, ChatSession } from '@/lib/types';

export const startChatSession = async (
  visitorId: string,
  initialMessage: { text: string }
): Promise<string> => {
  const db = getAdminDb();

  const existingSession = await db
    .collection('chatSessions')
    .where('visitorId', '==', visitorId)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  if (!existingSession.empty) {
    const sessionId = existingSession.docs[0].id;
    await sendChatMessage(sessionId, { sender: 'visitor', text: initialMessage.text });
    return sessionId;
  }

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

  const sessionRef = await db.collection('chatSessions').add(newSessionData);

  await db
    .collection(`chatSessions/${sessionRef.id}/chatMessages`)
    .add({
      sessionId: sessionRef.id,
      sender: 'visitor',
      text: initialMessage.text,
      timestamp: now,
    });

  return sessionRef.id;
};

export const sendChatMessage = async (
  sessionId: string,
  message: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp'>
) => {
  const db = getAdminDb();
  const sessionRef = db.collection('chatSessions').doc(sessionId);
  const now = new Date().toISOString();

  const batch = db.batch();

  batch.update(sessionRef, {
    lastMessageAt: now,
    lastMessageSnippet: message.text,
    status: 'open',
    adminUnread: message.sender === 'visitor',
    visitorUnread: message.sender === 'admin',
  });

  const messageRef = db.collection(`chatSessions/${sessionId}/chatMessages`).doc();
  batch.set(messageRef, {
    ...message,
    sessionId,
    timestamp: now,
  });

  await batch.commit();
};

export const markSessionAsRead = async (
  sessionId: string,
  userType: 'visitor' | 'admin'
) => {
  const db = getAdminDb();
  const sessionRef = db.collection('chatSessions').doc(sessionId);
  const updateData =
    userType === 'visitor' ? { visitorUnread: false } : { adminUnread: false };
  await sessionRef.update(updateData);
};

export const closeChatSession = async (sessionId: string) => {
  const db = getAdminDb();
  await db.collection('chatSessions').doc(sessionId).update({ status: 'closed' });
};
