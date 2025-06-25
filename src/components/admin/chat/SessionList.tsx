
"use client";

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ChatSession } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Archive, Inbox } from 'lucide-react';

interface SessionListProps {
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

function SessionListItem({ session, selected, onClick }: { session: ChatSession, selected: boolean, onClick: (session: ChatSession) => void }) {
    return (
        <button
            key={session.id}
            onClick={() => onClick(session)}
            className={cn(
                "w-full text-left p-3 rounded-md transition-colors flex justify-between items-start",
                selected
                ? 'bg-primary/20'
                : 'hover:bg-muted/50',
                session.status === 'closed' && 'opacity-70'
            )}
            >
            <div className="flex-grow overflow-hidden">
                <p className="font-semibold truncate">
                    Visitor {session.visitorId.substring(0, 8)}
                </p>
                <p className={cn(
                    "text-sm truncate",
                    session.adminUnread && session.status === 'open' ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                    {session.lastMessageSnippet}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
                </p>
            </div>
            {session.adminUnread && session.status === 'open' && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-primary mt-1 shrink-0">
                    !
                </Badge>
            )}
        </button>
    );
}

export function SessionList({ selectedSessionId, onSelectSession }: SessionListProps) {
  const { chatSessions, markSessionAsRead } = useAppContext();

  const { openSessions, closedSessions } = useMemo(() => {
    const open: ChatSession[] = [];
    const closed: ChatSession[] = [];
    
    chatSessions.forEach(session => {
        if(session.status === 'open') {
            open.push(session);
        } else {
            closed.push(session);
        }
    });

    open.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    closed.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return { openSessions: open, closedSessions: closed };
  }, [chatSessions]);

  const handleSelect = (session: ChatSession) => {
    onSelectSession(session.id);
    if (session.adminUnread && session.status === 'open') {
        markSessionAsRead(session.id, 'admin');
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="space-y-2">
            <div>
                <h3 className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Open
                </h3>
                <div className="space-y-1">
                    {openSessions.length > 0 ? openSessions.map((session) => (
                        <SessionListItem 
                            key={session.id}
                            session={session}
                            selected={selectedSessionId === session.id}
                            onClick={handleSelect}
                        />
                    )) : (
                        <p className="p-3 text-sm text-center text-muted-foreground">No open conversations.</p>
                    )}
                </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Closed
                </h3>
                <div className="space-y-1">
                    {closedSessions.length > 0 ? closedSessions.map((session) => (
                        <SessionListItem 
                            key={session.id}
                            session={session}
                            selected={selectedSessionId === session.id}
                            onClick={handleSelect}
                        />
                    )) : (
                        <p className="p-3 text-sm text-center text-muted-foreground">No closed conversations.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </ScrollArea>
  );
}
