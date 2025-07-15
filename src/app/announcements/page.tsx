
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Megaphone, PlusCircle, Trash2, CalendarClock, History, Clock, Edit } from 'lucide-react';
import { format, formatInTimeZone, toDate, fromZonedTime } from 'date-fns-tz';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/lib/types';


const announcementFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title is too long."),
  content: z.string().min(10, "Content must be at least 10 characters.").max(1000, "Content is too long."),
  isScheduled: z.boolean().default(false),
  scheduledAtDate: z.date().optional(),
  scheduledAtTime: z.string().optional(),
}).refine(data => {
    if (data.isScheduled) {
        return !!data.scheduledAtDate && !!data.scheduledAtTime;
    }
    return true;
}, {
    message: "A date and time are required for scheduled announcements.",
    path: ["scheduledAtDate"],
});


type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export default function AnnouncementsPage() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, clients, viewingAsClientId } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const currentClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;

  const client = useMemo(() => {
    if (!currentClientId) return null;
    return clients.find(c => c.id === currentClientId);
  }, [clients, currentClientId]);

  const clientTimezone = client?.timezone || 'Etc/UTC';
  
  const isEditing = !!editingAnnouncement;

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: { title: '', content: '', isScheduled: false, scheduledAtTime: '' },
  });
  
  const isScheduled = form.watch('isScheduled');

  useEffect(() => {
    if (user && !user.isSuperAdmin && user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
      router.push('/');
    }
  }, [user, router, toast]);

  const { sentAnnouncements, scheduledAnnouncements } = useMemo(() => {
    if (!currentClientId) return { sentAnnouncements: [], scheduledAnnouncements: [] };
    const all = announcements
      .filter(a => a.scope === currentClientId && a.audience === 'tenant')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      sentAnnouncements: all.filter(a => a.status === 'sent'),
      scheduledAnnouncements: all.filter(a => a.status === 'scheduled'),
    };
  }, [announcements, currentClientId]);

  const clientName = useMemo(() => {
    if (!client) return 'your';
    return client.name || 'your';
  }, [client]);
  
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    const scheduledDateTime = fromZonedTime(announcement.scheduledAt, clientTimezone);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      isScheduled: true,
      scheduledAtDate: scheduledDateTime,
      scheduledAtTime: format(scheduledDateTime, 'HH:mm'),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingAnnouncement(null);
    form.reset({ title: '', content: '', isScheduled: false, scheduledAtDate: undefined, scheduledAtTime: '' });
  }

  const onSubmit = async (data: AnnouncementFormValues) => {
    if (!user || !currentClientId) return;
    
    let scheduledAtISO: string | undefined = undefined;
    if (data.isScheduled && data.scheduledAtDate && data.scheduledAtTime) {
      const [hours, minutes] = data.scheduledAtTime.split(':').map(Number);
      
      const localDate = data.scheduledAtDate;
      const year = localDate.getFullYear();
      const month = localDate.getMonth();
      const day = localDate.getDate();

      const dateInClientTimezone = new Date(year, month, day, hours, minutes);
      
      const nowInClientTimezone = fromZonedTime(new Date(), clientTimezone);

      if (dateInClientTimezone < nowInClientTimezone && !isEditing) {
          toast({
              variant: 'destructive',
              title: 'Invalid Schedule Time',
              description: 'Cannot schedule an announcement for a time in the past.',
          });
          return;
      }
      
      const zonedDateString = formatInTimeZone(dateInClientTimezone, clientTimezone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      scheduledAtISO = toDate(zonedDateString).toISOString();
      
    } else if (data.isScheduled) {
      toast({ variant: 'destructive', title: 'Invalid Date/Time', description: 'Please provide a valid date and time for scheduling.' });
      return;
    }
    
    const baseData = {
        title: data.title,
        content: data.content,
        scope: currentClientId,
        audience: 'tenant' as const,
        senderId: user.username,
        senderName: user.username,
        isScheduled: data.isScheduled,
        scheduledAt: scheduledAtISO || new Date().toISOString(),
        status: data.isScheduled ? 'scheduled' as const : 'sent' as const,
    };

    if (isEditing && editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, baseData);
    } else {
        await addAnnouncement(baseData);
    }
    
    handleCancelEdit();
  };
  
  const handleCancelScheduled = (announcementId: string) => {
    deleteAnnouncement(announcementId);
    toast({ title: 'Scheduled post cancelled.' });
  }
  
  const canViewPage = user?.isSuperAdmin || user?.role === 'admin';

  if (!canViewPage) {
     return <div className="container mx-auto py-2"><p>Access Denied.</p></div>;
  }
  if (!currentClientId) {
    return <div className="container mx-auto py-2"><p>Please select a client to view announcements.</p></div>;
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Megaphone className="mr-3 h-8 w-8 text-primary" />
          Announcements for Tenants
        </h1>
        <p className="text-muted-foreground">Post announcements that will be visible to all tenants of {clientName}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5 text-primary"/> : <PlusCircle className="w-5 h-5 text-primary" />}
            {isEditing ? `Editing Scheduled Announcement` : 'Create New Announcement'}
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
                    <FormControl><Input placeholder="e.g., Scheduled Water Interruption" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Please be advised that there will be a scheduled water interruption..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isScheduled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Schedule for later?</FormLabel>
                        <FormDescription>Post this announcement at a future date and time in the client's timezone ({clientTimezone}).</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              {isScheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="scheduledAtDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} initialFocus />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scheduledAtTime"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {isEditing ? 'Update Announcement' : (isScheduled ? 'Schedule Announcement' : 'Post Announcement Now')}
                </Button>
                {isEditing && <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel Edit</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Announcement History</CardTitle>
          <CardDescription>View, manage, and delete past and scheduled announcements for your tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posted" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posted"><History className="mr-2 h-4 w-4"/>Posted</TabsTrigger>
              <TabsTrigger value="scheduled"><CalendarClock className="mr-2 h-4 w-4"/>Scheduled</TabsTrigger>
            </TabsList>
            <TabsContent value="posted" className="mt-4 space-y-4">
              {sentAnnouncements.length > 0 ? (
                sentAnnouncements.map(announcement => (
                  <div key={announcement.id} className="p-4 border rounded-lg bg-muted/50 flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })} by {announcement.senderName}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setAnnouncementToDelete(announcement.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No announcements posted yet.</p>
              )}
            </TabsContent>
            <TabsContent value="scheduled" className="mt-4 space-y-4">
              {scheduledAnnouncements.length > 0 ? (
                scheduledAnnouncements.map(announcement => (
                  <div key={announcement.id} className="p-4 border rounded-lg bg-blue-500/5 flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.content}</p>
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        Scheduled for {formatInTimeZone(new Date(announcement.scheduledAt), clientTimezone, 'PPp')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCancelScheduled(announcement.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No announcements scheduled.</p>
              )}
            </TabsContent>
          </Tabs>
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
