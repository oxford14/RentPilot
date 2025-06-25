
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Client } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  logoFile: z.any().optional(),
  subscriptionStatus: z.enum(['active', 'inactive'], { required_error: "Subscription status is required." }),
  subscriptionEndDate: z.date().optional(),
  allowUserDiscount: z.boolean().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
}

// Helper to get the cropped image as a blob
function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.resolve(null);
  }
  
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png', 1);
  });
}

export function ClientForm({ isOpen, onClose, client }: ClientFormProps) {
  const { addClient, updateClient } = useAppContext();
  const { toast } = useToast();
  
  // State for image cropping
  const [preview, setPreview] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || '',
      logoFile: undefined,
      subscriptionStatus: client?.subscriptionStatus || 'active',
      subscriptionEndDate: client?.subscriptionEndDate ? new Date(client.subscriptionEndDate) : undefined,
      allowUserDiscount: client?.allowUserDiscount || false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: client?.name || '',
        logoFile: undefined,
        subscriptionStatus: client?.subscriptionStatus || 'active',
        subscriptionEndDate: client?.subscriptionEndDate ? new Date(client.subscriptionEndDate) : undefined,
        allowUserDiscount: client?.allowUserDiscount || false,
      });
      setPreview(client?.logoUrl || null);
      setCroppedImageBlob(null);
      setImgSrc('');
      setCrop(undefined);
      setIsSubmitting(false);
    }
  }, [client, isOpen, form]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsCropModalOpen(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    // Set a default centered crop
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(newCrop);
  };
  
  const handleCropComplete = async () => {
    if (imgRef.current && crop?.width && crop?.height) {
        const blob = await getCroppedImg(imgRef.current, crop);
        setCroppedImageBlob(blob);
        if (blob) {
            setPreview(URL.createObjectURL(blob));
        }
        setIsCropModalOpen(false);
        setImgSrc('');
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const clientPayload = {
      name: data.name,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionEndDate: data.subscriptionEndDate?.toISOString(),
      allowUserDiscount: data.allowUserDiscount,
    };

    try {
      if (client) { // Editing existing client
        await updateClient({ ...client, ...clientPayload }, croppedImageBlob);
        toast({ title: "Client Updated", description: `${data.name} has been updated successfully.` });
      } else { // Adding new client
        await addClient(clientPayload, croppedImageBlob);
        toast({ title: "Client Added", description: `${data.name} has been added successfully.` });
      }
      onClose();
    } catch (error: any) {
      console.error("Client form submission error:", error);
      let description = "An unexpected error occurred. Check the browser console for details.";
      if (error.message?.includes('timed out')) {
        description = error.message;
      } else if (error.code && typeof error.code === 'string') {
          if (error.code.includes('storage/unauthorized')) {
              description = "Upload failed: Permission denied. Please check your Firebase Storage rules and ensure they are deployed.";
          } else if (error.code.includes('storage/object-not-found')) {
              description = "Upload failed: The file could not be found.";
          }
      } else if (error.message) {
        description = error.message;
      }
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: description,
        duration: 9000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[525px] bg-card shadow-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp Rentals" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subscriptionStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Subscription Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4 pt-2"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="active" /></FormControl>
                            <FormLabel className="font-normal">Active</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="inactive" /></FormControl>
                            <FormLabel className="font-normal">Inactive</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subscriptionEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Subscription End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>Client Logo</FormLabel>
                <FormControl>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>

              {preview && (
                <div className="space-y-2">
                  <FormLabel>Logo Preview</FormLabel>
                  <div className="flex items-center justify-center p-4 border rounded-md bg-muted">
                      <Image src={preview} alt="Logo preview" width={120} height={45} className="object-contain" />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="allowUserDiscount"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                    <div className="space-y-0.5">
                      <FormLabel>Allow Discount for Users</FormLabel>
                      <FormDescription className="text-xs">
                        Allow regular users (non-admins) to apply discounts to payments.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </DialogClose>
                <Button type="submit" variant="default" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (client ? 'Save Changes' : 'Add Client')}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Cropping Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Crop Your Logo</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center">
             {imgSrc && (
                <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    aspect={16 / 9}
                    minWidth={100}
                >
                    <Image
                        ref={imgRef}
                        src={imgSrc}
                        alt="Crop preview"
                        onLoad={onImageLoad}
                        width={400}
                        height={400}
                        className="max-h-[60vh] object-contain"
                    />
                </ReactCrop>
            )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCropComplete}>Crop & Use Image</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
