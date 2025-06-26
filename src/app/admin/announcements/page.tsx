
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Megaphone, PlusCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Announcement } from '@/lib/types';

const announcementFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title is too long."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content is too long."),
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export default function AdminAnnouncementsPage() {
  const { announcements, addAnnouncement, deleteAnnouncement } = useAppContext();
  const { user } = useAuth();
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: { title: '', content: '' },
  });

  const globalAnnouncements = useMemo(() => {
    return announcements
      .filter(a => a.scope === 'global' && a.audience === 'client-admin')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  const onSubmit = async (data: AnnouncementFormValues) => {
    if (!user) return;
    await addAnnouncement({
      ...data,
      scope: 'global',
      audience: 'client-admin',
      senderId: user.username,
      senderName: 'Super Admin',
    });
    form.reset();
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Megaphone className="mr-3 h-8 w-8 text-primary" />
          Global Announcements
        </h1>
        <p className="text-muted-foreground">Post announcements for all Client Administrators.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Create New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g., New Feature Update: Business Tracker" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl><Textarea placeholder="We are excited to announce a new feature..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>Post Announcement</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Posted Global Announcements</CardTitle>
          <CardDescription>History of announcements sent to all clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {globalAnnouncements.length > 0 ? (
            globalAnnouncements.map(announcement => (
              <div key={announcement.id} className="p-4 border rounded-lg bg-muted/50 flex justify-between items-start">
                <div>
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Posted {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAnnouncementToDelete(announcement.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No global announcements posted yet.</p>
          )}
        </CardContent>
      </Card>

       <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(announcementToDelete) deleteAnnouncement(announcementToDelete); setAnnouncementToDelete(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
