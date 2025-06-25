
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Send, User, Shield, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { sendChatMessage, closeChatSession } = useAppContext();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(collectionGroup(db, 'chatMessages'), where('sessionId', '==', sessionId), orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [sessionId]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      await sendChatMessage(sessionId, { sender: 'admin', text: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send admin message:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
    }
  };

  const handleCloseSession = async () => {
    try {
      await closeChatSession(sessionId);
      toast({ title: 'Session Closed', description: 'The chat session has been marked as closed.' });
    } catch (error) {
      console.error('Failed to close session:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not close the session.' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Conversation with Visitor</h3>
        <Button variant="outline" size="sm" onClick={handleCloseSession}>
          <Power className="mr-2 h-4 w-4" /> Close Conversation
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'admin' ? 'justify-end' : 'justify-start')}>
              {msg.sender === 'visitor' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                msg.sender === 'visitor' ? 'bg-muted' : 'bg-primary text-primary-foreground'
              )}>
                {msg.text}
              </div>
              {msg.sender === 'admin' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Shield className="h-5 w-5"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your response..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
