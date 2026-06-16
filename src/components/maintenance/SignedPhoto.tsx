import { useEffect, useState } from 'react';
import { getWoPhotoUrl } from '@/hooks/useWoPhotos';
import { ImageOff } from 'lucide-react';

interface SignedPhotoProps {
  storagePath: string;
  alt: string;
  className?: string;
}

/** Renders a wo-photos image by resolving a fresh 1-hour signed URL.
 * Refreshes when storagePath changes. */
export function SignedPhoto({ storagePath, alt, className }: SignedPhotoProps) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getWoPhotoUrl(storagePath)
      .then(u => {
        if (cancelled) return;
        if (!u) {
          setFailed(true);
        } else {
          setUrl(u);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storagePath]);

  if (loading) {
    return <div className={`bg-muted animate-pulse ${className ?? ''}`} aria-label="Loading photo" />;
  }
  if (failed || !url) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted text-muted-foreground text-xs gap-1 ${className ?? ''}`}>
        <ImageOff size={20} />
        <span>Image unavailable</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={alt} className={className} loading="lazy" />
    </a>
  );
}
