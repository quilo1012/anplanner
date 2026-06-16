import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

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

/** Resizes/compresses an image client-side before upload, matching Anmaisys's
 * approach: skip if already <=1MB, otherwise downscale to max 1920px and
 * re-encode as JPEG at 70% quality. */
async function compressImage(file: File, maxDim = 1920, quality = 0.7): Promise<File> {
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
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
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
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
    if (!workOrderId) return { success: false, error: 'Missing work order id' };
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `${workOrderId}/${photoType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('wo-photos').upload(path, compressed, { upsert: true });
      if (uploadError) return { success: false, error: uploadError.message };

      const { error: dbError } = await supabase
        .from('wo_photos' as never)
        .insert({ work_order_id: workOrderId, photo_type: photoType, storage_path: path, uploaded_by: userId } as never);
      if (dbError) return { success: false, error: dbError.message };

      await fetchPhotos();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    } finally {
      setIsUploading(false);
    }
  };

  return { photos, isLoading, isUploading, uploadPhoto, refreshPhotos: fetchPhotos };
}
