import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export type PhotoType = 'before' | 'after';

export interface WoPhoto {
  id: string;
  work_order_id: string;
  photo_type: PhotoType;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

const MAX_BYTES = 1024 * 1024; // 1 MB cap for uploads

/** Compresses an image client-side into a JPEG, iteratively lowering quality
 * until the result is <= 1 MB (or quality bottoms out at 0.4). Logs the
 * original and final sizes for debugging. Files already <= 1 MB are returned
 * untouched. */
async function compressImage(file: File, maxDim = 1920, initialQuality = 0.7): Promise<File> {
  const originalKB = (file.size / 1024).toFixed(1);
  if (file.size <= MAX_BYTES) {
    console.info(`[useWoPhotos] compressImage: file ${originalKB} KB <= 1 MB — skipping compression`);
    return file;
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[useWoPhotos] compressImage: canvas 2D context unavailable — uploading original file');
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const toBlob = (q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q));
      let quality = initialQuality;
      let blob: Blob | null = null;
      for (let i = 0; i < 5; i++) {
        blob = await toBlob(quality);
        if (!blob) break;
        if (blob.size <= MAX_BYTES || quality <= 0.4) break;
        quality = Math.max(0.4, quality - 0.15);
      }
      if (!blob) {
        console.error('[useWoPhotos] compressImage: canvas.toBlob returned null — uploading original file');
        resolve(file);
        return;
      }
      const finalKB = (blob.size / 1024).toFixed(1);
      console.info(`[useWoPhotos] compressImage: ${originalKB} KB → ${finalKB} KB (q=${quality.toFixed(2)}, ${width}x${height})`);
      if (blob.size > MAX_BYTES) {
        console.warn(`[useWoPhotos] compressImage: result still > 1 MB (${finalKB} KB) — uploading anyway`);
      }
      resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      console.error('[useWoPhotos] compressImage: failed to load image', e);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}

/** Generates a 1-hour signed URL for a stored photo (bucket is not meant to
 * be browsed directly; access is gated by storage.objects RLS). */
export async function getWoPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('wo-photos').createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

export function useWoPhotos(workOrderId: string | undefined) {
  const [photos, setPhotos] = useState<WoPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('wo_photos' as never)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    setPhotos((data || []) as unknown as WoPhoto[]);
    setIsLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhoto = async (file: File, photoType: PhotoType, userId: string): Promise<OperationResult> => {
    if (!workOrderId) {
      console.error('[useWoPhotos] uploadPhoto: missing work order id');
      toast.error('Cannot upload photo: missing work order id');
      return { success: false, error: 'Missing work order id' };
    }
    setIsUploading(true);
    try {
      let compressed: File;
      try {
        compressed = await compressImage(file);
      } catch (err) {
        const msg = getErrorMessage(err);
        console.error('[useWoPhotos] uploadPhoto: compression failed', err);
        toast.error(`Image compression failed: ${msg}`);
        return { success: false, error: `Image compression failed: ${msg}` };
      }
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `${workOrderId}/${photoType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wo-photos')
        .upload(path, compressed, { upsert: true });
      if (uploadError) {
        console.error('[useWoPhotos] uploadPhoto: storage upload failed', { path, error: uploadError });
        toast.error(`Upload failed: ${uploadError.message}`);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      const { error: dbError } = await supabase
        .from('wo_photos' as never)
        .insert({ work_order_id: workOrderId, photo_type: photoType, storage_path: path, uploaded_by: userId } as never);
      if (dbError) {
        console.error('[useWoPhotos] uploadPhoto: DB insert failed', { workOrderId, path, error: dbError });
        toast.error(`Database insert failed: ${dbError.message}`);
        return { success: false, error: `Database insert failed: ${dbError.message}` };
      }

      await fetchPhotos();
      toast.success(`${photoType === 'before' ? 'Before' : 'After'} photo uploaded`);
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error('[useWoPhotos] uploadPhoto: unexpected error', err);
      toast.error(`Photo upload error: ${msg}`);
      return { success: false, error: msg };
    } finally {
      setIsUploading(false);
    }
  };

  return { photos, isLoading, isUploading, uploadPhoto, refreshPhotos: fetchPhotos };
}
