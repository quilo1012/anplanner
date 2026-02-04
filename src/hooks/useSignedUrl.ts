import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for a private storage object.
 * The bucket 'monitoring-photos' is private for security,
 * so we need to generate signed URLs for authenticated access.
 */
export function useSignedUrl(path: string | undefined, expiresIn: number = 3600): {
  signedUrl: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    // If it's already a signed URL or a data URL, use it directly
    if (path.startsWith('data:') || path.includes('token=')) {
      setSignedUrl(path);
      return;
    }

    // If it's a full URL but not signed, try to extract the path
    let storagePath = path;
    if (path.includes('/storage/v1/object/public/')) {
      // Extract path from public URL format
      const match = path.match(/\/monitoring-photos\/(.+)$/);
      if (match) {
        storagePath = match[1];
      }
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: urlError } = await supabase.storage
          .from('monitoring-photos')
          .createSignedUrl(storagePath, expiresIn);

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          setError(urlError.message);
          // Fallback: try using the original path
          setSignedUrl(path);
        } else if (data) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to get signed URL');
        setSignedUrl(path);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [path, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Utility function to get a signed URL synchronously (for use in non-hook contexts)
 */
export async function getSignedUrl(path: string | undefined): Promise<string | null> {
  if (!path) return null;
  
  // If it's already a signed URL or a data URL, use it directly
  if (path.startsWith('data:') || path.includes('token=')) {
    return path;
  }

  // Extract path if it's a full URL
  let storagePath = path;
  if (path.includes('/storage/v1/object/public/')) {
    const match = path.match(/\/monitoring-photos\/(.+)$/);
    if (match) {
      storagePath = match[1];
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from('monitoring-photos')
      .createSignedUrl(storagePath, 3600);

    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return path; // Fallback to original
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error fetching signed URL:', err);
    return path;
  }
}
