"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { cropImageToOptimizedBlob } from '@/lib/logo-image';

type LogoCropUploadProps = {
  currentLogoUrl?: string | null;
  companyName?: string;
  onLogoReady: (blob: Blob | null) => void;
  disabled?: boolean;
};

export function LogoCropUpload({ currentLogoUrl, companyName, onLogoReady, disabled }: LogoCropUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  React.useEffect(() => {
    setPreview(currentLogoUrl || null);
  }, [currentLogoUrl]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
      setIsCropModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height), width, height));
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop?.width || !crop?.height) return;
    const blob = await cropImageToOptimizedBlob(imgRef.current, crop);
    if (blob) {
      setPreview(URL.createObjectURL(blob));
      onLogoReady(blob);
    }
    setIsCropModalOpen(false);
    setImgSrc('');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-44 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
        {preview ? (
          <Image
            src={preview}
            alt={companyName ? `${companyName} logo` : 'Company logo'}
            fill
            className="object-contain p-2"
            unoptimized
          />
        ) : (
          <span className="text-xs text-muted-foreground px-2 text-center">No logo uploaded</span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {preview ? 'Change Logo' : 'Upload Logo'}
      </Button>

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Company Logo</DialogTitle>
          </DialogHeader>
          {imgSrc && (
            <ReactCrop crop={crop} onChange={(c) => setCrop(c)} aspect={16 / 9}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt="Crop preview" onLoad={onImageLoad} className="max-h-[60vh] w-auto" />
            </ReactCrop>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCropModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCropComplete}>
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
