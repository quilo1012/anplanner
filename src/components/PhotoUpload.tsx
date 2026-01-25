import { useRef, useState } from 'react';
import { Camera, X, Image } from 'lucide-react';

interface PhotoUploadProps {
  photo?: string;
  filename?: string;
  onChange: (photo: string | undefined, filename: string | undefined) => void;
}

export function PhotoUpload({ photo, filename, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onChange(base64, file.name);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="label flex items-center gap-2">
        <Camera size={16} />
        Monitoring Photo
      </label>
      
      {photo ? (
        <div className="relative inline-block">
          <img 
            src={photo} 
            alt="Monitoring" 
            className="max-w-xs max-h-48 rounded-lg border border-[hsl(var(--border))] object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-[hsl(var(--destructive))] text-white rounded-full hover:opacity-80 transition-opacity"
          >
            <X size={14} />
          </button>
          {filename && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate max-w-xs">
              {filename}
            </p>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-8 text-center cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Image size={32} />
              <span>Click to upload monitoring photo</span>
              <span className="text-xs">JPG, PNG, GIF up to 5MB</span>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-[hsl(var(--destructive))] mt-2">{error}</p>
      )}
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
