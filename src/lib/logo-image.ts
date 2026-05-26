import type { Crop } from 'react-image-crop';

/** Max display size in header (~176px); 2× retina + crop headroom */
export const LOGO_MAX_WIDTH = 800;
export const LOGO_MAX_HEIGHT = 450;
/** High quality — visually lossless for logos while reducing file size */
export const LOGO_IMAGE_QUALITY = 0.92;

function fitDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Sample pixels to detect transparency without scanning every pixel */
function canvasHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 8000)));
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 250) return true;
    }
  }
  return false;
}

function extensionForMime(mime: string): string {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg') return 'jpg';
  return 'png';
}

/**
 * Resize and compress a logo blob for storage (WebP preferred, JPEG for opaque).
 */
export async function optimizeLogoBlob(source: Blob): Promise<Blob> {
  if (typeof window === 'undefined' || !source.size) {
    return source;
  }

  const bitmap = await createImageBitmap(source);
  const { width, height } = fitDimensions(
    bitmap.width,
    bitmap.height,
    LOGO_MAX_WIDTH,
    LOGO_MAX_HEIGHT
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    bitmap.close();
    return source;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const hasTransparency = canvasHasTransparency(ctx, width, height);

  if (hasTransparency) {
    const webp = await canvasToBlob(canvas, 'image/webp', LOGO_IMAGE_QUALITY);
    if (webp) return webp;
    const png = await canvasToBlob(canvas, 'image/png');
    if (png) return png;
  } else {
    const webp = await canvasToBlob(canvas, 'image/webp', LOGO_IMAGE_QUALITY);
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', LOGO_IMAGE_QUALITY);
    if (webp && jpeg) {
      return webp.size <= jpeg.size ? webp : jpeg;
    }
    if (webp) return webp;
    if (jpeg) return jpeg;
  }

  return source;
}

export function getOptimizedLogoFileName(blob: Blob): string {
  return `logo.${extensionForMime(blob.type)}`;
}

/**
 * Crop from a loaded image element, then optimize for upload.
 */
export async function cropImageToOptimizedBlob(
  image: HTMLImageElement,
  crop: Crop
): Promise<Blob | null> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const cropWidth = Math.round(crop.width * scaleX);
  const cropHeight = Math.round(crop.height * scaleY);

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  const rawBlob = await canvasToBlob(canvas, 'image/png');
  if (!rawBlob) return null;

  return optimizeLogoBlob(rawBlob);
}
