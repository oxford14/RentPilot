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
import { Send, User, Shield, Power, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateChatResponseOptions, type ChatMessage as AIChatMessage } from '@/ai/flows/generate-chat-response-flow';


interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { sendChatMessage, closeChatSession } = useAppContext();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(collectionGroup(db, 'chatMessages'), where('sessionId', '==', sessionId), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(newMessages.reverse());
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

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    setSuggestions([]);
    setSuggestionError(null);
    try {
      const history: AIChatMessage[] = messages.map(msg => ({ sender: msg.sender, text: msg.text }));
      
      if (history.length === 0 || history[history.length - 1].sender === 'admin') {
        setSuggestionError("There's no new visitor message to reply to.");
        setIsSuggestionsOpen(true);
        setIsGenerating(false);
        return;
      }

      const result = await generateChatResponseOptions({ history });
      if (result && result.options.length > 0) {
        setSuggestions(result.options);
        setIsSuggestionsOpen(true);
      } else {
        setSuggestionError("No suggestions could be generated for this conversation.");
        setIsSuggestionsOpen(true);
      }
    } catch (err: any) {
      console.error("Failed to generate suggestions:", err);
      setSuggestionError("An AI error occurred. Please try again.");
      setIsSuggestionsOpen(true);
    } finally {
      setIsGenerating(false);
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
            <Popover open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
                <PopoverTrigger asChild>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleGenerateSuggestions}
                        disabled={isGenerating}
                        className="shrink-0"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                        <span className="sr-only">Generate AI Suggestions</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">AI-Generated Replies</h4>
                        <p className="text-sm text-muted-foreground">
                            Click a suggestion to use it.
                        </p>
                        <div className="grid gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setNewMessage(suggestion);
                                        setIsSuggestionsOpen(false);
                                    }}
                                    className="text-left text-sm p-2 rounded-md hover:bg-accent transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                            {suggestionError && <p className="text-xs text-destructive p-2">{suggestionError}</p>}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your response..."
              autoComplete="off"
              className="flex-grow"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
        </form>
      </div>
    </div>
  );
}
