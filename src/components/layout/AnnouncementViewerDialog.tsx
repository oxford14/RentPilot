"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Announcement } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Megaphone } from 'lucide-react';

// Props updated to reflect showing a single announcement
interface AnnouncementViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

export function AnnouncementViewerDialog({ isOpen, onClose, announcement }: AnnouncementViewerDialogProps) {
  // If no announcement is provided, don't render the dialog
  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            {announcement.title}
          </DialogTitle>
          <DialogDescription>
            Posted {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })} by {announcement.senderName}
          </DialogDescription>
        </DialogHeader>
        {/* The content is wrapped in a scroll area in case it's very long */}
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {announcement.content}
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
