import { useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { ImageOff, Loader2 } from 'lucide-react';

interface SecureImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * A component that displays images from private storage buckets
 * by automatically fetching signed URLs.
 */
export function SecureImage({ src, alt, className = '', onClick }: SecureImageProps) {
  const { signedUrl, isLoading, error } = useSignedUrl(src);
  const [imgError, setImgError] = useState(false);

  if (!src) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (error || imgError || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        <ImageOff className="text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setImgError(true)}
    />
  );
}
