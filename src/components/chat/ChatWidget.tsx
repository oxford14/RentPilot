
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { MessageSquare, X, Send, User, Shield } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';

const VISITOR_ID_KEY = 'rentpilot_visitorId';
const CHAT_SESSION_ID_KEY = 'rentpilot_chatSessionId';

export function ChatWidget() {
  const { startChatSession, sendChatMessage, markSessionAsRead } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!storedVisitorId) {
      storedVisitorId = uuidv4();
      localStorage.setItem(VISITOR_ID_KEY, storedVisitorId);
    }
    setVisitorId(storedVisitorId);

    const storedSessionId = localStorage.getItem(CHAT_SESSION_ID_KEY);
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(CHAT_SESSION_ID_KEY, sessionId);

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
    if (!sessionId) return;

    const unsub = onSnapshot(doc(db, "chatSessions", sessionId), (doc) => {
        if (doc.exists()) {
            const sessionData = doc.data();
            if (sessionData.visitorUnread && !isOpen) {
                setHasUnread(true);
            }
        }
    });
    return () => unsub();
  }, [sessionId, isOpen]);


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
    if (message.trim() === '' || !visitorId) return;

    const tempMessage = message;
    setMessage('');

    try {
      if (!sessionId) {
        const newSessionId = await startChatSession(visitorId, { text: tempMessage });
        setSessionId(newSessionId);
      } else {
        await sendChatMessage(sessionId, { sender: 'visitor', text: tempMessage });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
      setMessage(tempMessage); // Restore message on error
    }
  };
  
  const handleToggleOpen = () => {
    setIsOpen(prev => {
        const newIsOpen = !prev;
        if (newIsOpen && sessionId) {
            setHasUnread(false);
            markSessionAsRead(sessionId, 'visitor');
        }
        return newIsOpen;
    });
  };

  return (
    <>
      <div className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        isOpen ? "w-[calc(100%-2rem)] max-w-sm h-[70vh] max-h-[500px]" : "w-16 h-16"
      )}>
        <Card className={cn(
            "w-full h-full flex flex-col shadow-2xl transition-all duration-300",
            isOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
        )}>
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
            <CardTitle className="text-lg">Chat with Support</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleOpen}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'admin' ? 'justify-start' : 'justify-end')}>
                    {msg.sender === 'admin' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground"><Shield className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        msg.sender === 'admin' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                    )}>
                        {msg.text}
                    </div>
                    {msg.sender === 'visitor' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                    )}
                    </div>
                ))}
                </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
      <Button
        className={cn(
          "fixed bottom-4 right-4 z-50 h-16 w-16 rounded-full shadow-2xl text-white transition-all duration-300 flex items-center justify-center",
          isOpen ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
        )}
        onClick={handleToggleOpen}
      >
        <MessageSquare className="h-8 w-8" />
        {hasUnread && <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-destructive ring-2 ring-background"/>}
      </Button>
    </>
  );
}
