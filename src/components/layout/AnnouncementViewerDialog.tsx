"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Announcement } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react';

interface AnnouncementViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  currentUserId: string;
  onMarkAsRead: (announcementId: string) => void;
}

export function AnnouncementViewerDialog({ isOpen, onClose, announcements, currentUserId, onMarkAsRead }: AnnouncementViewerDialogProps) {
  
  const handleItemClick = (announcement: Announcement) => {
    if (!announcement.readBy.includes(currentUserId)) {
        onMarkAsRead(announcement.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            All Announcements
          </DialogTitle>
          <DialogDescription>
            A full list of all announcements. Click an unread announcement to mark it as read.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement, index) => (
                <React.Fragment key={announcement.id}>
                  <button 
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => handleItemClick(announcement)}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-semibold">{announcement.title}</p>
                      {!announcement.readBy.includes(currentUserId) && (
                        <Badge variant="default" className="bg-primary/80">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Posted {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })} by {announcement.senderName}
                    </p>
                  </button>
                  {index < announcements.length - 1 && <Separator />}
                </React.Fragment>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <p>There are no announcements to display.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
