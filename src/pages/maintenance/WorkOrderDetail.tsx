import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useWoPhotos, PhotoType } from '@/hooks/useWoPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { SignedPhoto } from '@/components/maintenance/SignedPhoto';
import { ArrowLeft, Camera, Loader2, ImagePlus } from 'lucide-react';

function PhotoSection({
  workOrderId,
  type,
  canUpload,
}: {
  workOrderId: string;
  type: PhotoType;
  canUpload: boolean;
}) {
  const { user } = useAuth();
  const { photos, isLoading, isUploading, uploadPhoto } = useWoPhotos(workOrderId);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = photos.filter(p => p.photo_type === type);

  const handleFile = async (file: File | null) => {
    if (!file || !user?.id) return;
    await uploadPhoto(file, type, user.id);
    if (inputRef.current) inputRef.current.value = '';
  };

  const label = type === 'before' ? 'Before' : 'After';

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera size={14} className="text-primary" /> {label} photos
          <span className="text-xs text-muted-foreground">({filtered.length})</span>
        </h3>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              {isUploading ? 'Uploading…' : `Add ${label.toLowerCase()}`}
            </button>
          </>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No {label.toLowerCase()} photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(p => (
            <SignedPhoto
              key={p.id}
              storagePath={p.storage_path}
              alt={`${label} photo`}
              className="aspect-square w-full object-cover rounded border border-border"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { workOrders, isLoading } = useWorkOrders();
  const { user } = useAuth();
  const wo = workOrders.find(w => w.id === id);

  const canUpload = user?.role === 'engineer' || user?.role === 'admin';

  if (isLoading) {
    return (
      <>
        <Header title="Work Order" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
      </>
    );
  }

  if (!wo) {
    return (
      <>
        <Header title="Work Order" subtitle="Not found" />
        <div className="p-6">
          <Link to="/maintenance/work-orders" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
            <ArrowLeft size={14} /> Back to work orders
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">No work order found with id {id}.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`WO #${wo.wo_number}`} subtitle={wo.line_at_time || '—'} />
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        <Link to="/maintenance/work-orders" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
          <ArrowLeft size={12} /> Back to work orders
        </Link>

        <div className="card p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold text-foreground">{wo.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <p className="font-semibold text-foreground">{wo.priority}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Requester</p>
              <p className="font-semibold text-foreground">{wo.requester_name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Engineer</p>
              <p className="font-semibold text-foreground">{wo.engineer_name || '—'}</p>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <p className="text-muted-foreground">Description</p>
              <p className="text-sm text-foreground">{wo.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PhotoSection workOrderId={wo.id} type="before" canUpload={canUpload} />
          <PhotoSection workOrderId={wo.id} type="after" canUpload={canUpload} />
        </div>
      </div>
    </>
  );
}
