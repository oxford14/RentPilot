
"use client";

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ChatSession } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface SessionListProps {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ selectedSessionId, onSelectSession }: SessionListProps) {
  const { chatSessions, markSessionAsRead } = useAppContext();

  const sortedSessions = useMemo(() => {
    return [...chatSessions].sort((a, b) => {
      // Open sessions first
      if (a.status === 'open' && b.status === 'closed') return -1;
      if (a.status === 'closed' && b.status === 'open') return 1;
      // Then by last message time
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [chatSessions]);

  const handleSelect = (session: ChatSession) => {
    onSelectSession(session.id);
    if (session.adminUnread) {
        markSessionAsRead(session.id, 'admin');
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <h2 className="text-lg font-semibold p-2">Conversations</h2>
        <div className="space-y-1">
          {sortedSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelect(session)}
              className={cn(
                "w-full text-left p-3 rounded-md transition-colors flex justify-between items-start",
                selectedSessionId === session.id
                  ? 'bg-primary/20'
                  : 'hover:bg-muted/50',
                session.status === 'closed' && 'opacity-60'
              )}
            >
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold truncate">
                  Visitor {session.visitorId.substring(0, 8)}
                </p>
                <p className={cn(
                    "text-sm truncate",
                    session.adminUnread ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  {session.lastMessageSnippet}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
                </p>
              </div>
              {session.adminUnread && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-primary mt-1 shrink-0">
                      !
                  </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
