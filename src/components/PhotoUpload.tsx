import { useRef, useState } from 'react';
import { Camera, X, Image, CheckCircle, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  photo?: string;
  filename?: string;
  onChange: (photo: string | undefined, filename: string | undefined) => void;
}

export function PhotoUpload({ photo, filename, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
    setUploadSuccess(false);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onChange(base64, file.name);
      setIsLoading(false);
      setUploadSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
    setUploadSuccess(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Check if photo is a URL (already uploaded) or base64 (pending upload)
  const isUrl = photo && (photo.startsWith('http://') || photo.startsWith('https://'));

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
            className="max-w-xs max-h-48 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-80 transition-opacity"
          >
            <X size={14} />
          </button>
          {filename && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs flex items-center gap-1">
              {isUrl && <CheckCircle size={12} className="text-success" />}
              {filename}
            </p>
          )}
          {uploadSuccess && !isUrl && (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <CheckCircle size={12} />
              Photo ready to upload
            </p>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted transition-colors"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Image size={32} />
              <span>Click to upload monitoring photo</span>
              <span className="text-xs">JPG, PNG, GIF up to 5MB</span>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive mt-2 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
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
