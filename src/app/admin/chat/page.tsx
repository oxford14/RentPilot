
"use client";

import React, { useState } from 'react';
import { SessionList } from '@/components/admin/chat/SessionList';
import { ChatWindow } from '@/components/admin/chat/ChatWindow';
import { Card } from '@/components/ui/card';
import { MessageSquare, MessagesSquare } from 'lucide-react';

export default function AdminChatPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-2 h-full">
        <div className="mb-6">
            <h1 className="text-3xl font-bold font-headline flex items-center">
                <MessagesSquare className="mr-3 h-8 w-8 text-primary" />
                Live Chat
            </h1>
            <p className="text-muted-foreground">Respond to visitor inquiries in real-time.</p>
        </div>
        <Card className="flex h-[calc(100vh-12rem)] shadow-xl">
            <div className="w-1/3 border-r h-full overflow-y-auto">
                <SessionList selectedSessionId={selectedSessionId} onSelectSession={setSelectedSessionId} />
            </div>
            <div className="w-2/3 flex flex-col h-full">
                {selectedSessionId ? (
                    <ChatWindow sessionId={selectedSessionId} key={selectedSessionId} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="h-20 w-20 mb-4" />
                        <h2 className="text-xl font-semibold">Select a conversation</h2>
                        <p>Choose a chat from the list to view messages.</p>
                    </div>
                )}
            </div>
        </Card>
    </div>
  );
}
