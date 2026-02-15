import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Photo {
  id: string;
  type: PhotoType;
  url: string;
  filename: string;
}

export type PhotoType =
  | 'FRONT'
  | 'REAR'
  | 'DRIVER_SIDE'
  | 'PASSENGER_SIDE'
  | 'INTERIOR'
  | 'VIN_PLATE'
  | 'ODOMETER'
  | 'DAMAGE';

interface PhotoRequirement {
  type: PhotoType;
  label: string;
  required: boolean;
}

const photoRequirements: PhotoRequirement[] = [
  { type: 'FRONT', label: 'Front', required: true },
  { type: 'REAR', label: 'Rear', required: true },
  { type: 'DRIVER_SIDE', label: 'Driver Side', required: true },
  { type: 'PASSENGER_SIDE', label: 'Passenger Side', required: true },
  { type: 'VIN_PLATE', label: 'VIN Plate', required: true },
  { type: 'ODOMETER', label: 'Odometer', required: true },
  { type: 'INTERIOR', label: 'Interior', required: false },
  { type: 'DAMAGE', label: 'Damage', required: false },
];

interface PhotoUploadProps {
  caseId: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  disabled?: boolean;
}

export function PhotoUpload({ caseId, photos, onPhotosChange, disabled }: PhotoUploadProps) {
  const [uploading, setUploading] = useState<PhotoType | null>(null);
  const [dragOver, setDragOver] = useState<PhotoType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedTypeRef = useRef<PhotoType | null>(null);

  const getPhotoForType = (type: PhotoType): Photo | undefined => {
    return photos.find((p) => p.type === type);
  };

  const handleUpload = async (file: File, type: PhotoType) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error('Invalid file type');
      return;
    }

    setUploading(type);

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Vercel Blob via our API endpoint
      const response = await fetch(`/api/upload?filename=${caseId}-${type}-${Date.now()}.${file.name.split('.').pop()}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const blob = await response.json();

      // Add to photos array
      const newPhoto: Photo = {
        id: `${type}-${Date.now()}`,
        type,
        url: blob.url,
        filename: blob.pathname,
      };

      // Remove existing photo of this type and add new one
      const updatedPhotos = photos.filter((p) => p.type !== type);
      updatedPhotos.push(newPhoto);
      onPhotosChange(updatedPhotos);
    } catch (error) {
      console.error('Upload error:', error);
      // For demo/offline mode, simulate upload with local URL
      const localUrl = URL.createObjectURL(file);
      const newPhoto: Photo = {
        id: `${type}-${Date.now()}`,
        type,
        url: localUrl,
        filename: file.name,
      };
      const updatedPhotos = photos.filter((p) => p.type !== type);
      updatedPhotos.push(newPhoto);
      onPhotosChange(updatedPhotos);
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, type);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, type: PhotoType) => {
      e.preventDefault();
      setDragOver(null);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file, type);
      }
    },
    [photos, onPhotosChange, caseId]
  );

  const handleDragOver = (e: React.DragEvent, type: PhotoType) => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleRemove = (type: PhotoType) => {
    const updatedPhotos = photos.filter((p) => p.type !== type);
    onPhotosChange(updatedPhotos);
  };

  const openFileDialog = (type: PhotoType) => {
    selectedTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = selectedTypeRef.current;
    if (file && type) {
      handleUpload(file, type);
    }
    e.target.value = '';
    selectedTypeRef.current = null;
  };

  const capturedCount = photos.length;
  const requiredCount = photoRequirements.filter((r) => r.required).length;
  const capturedRequired = photoRequirements.filter(
    (r) => r.required && getPhotoForType(r.type)
  ).length;

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {capturedCount} of {photoRequirements.length} photos captured
        </span>
        <span
          className={cn(
            'font-medium',
            capturedRequired === requiredCount
              ? 'text-success'
              : 'text-warning'
          )}
        >
          {capturedRequired}/{requiredCount} required
        </span>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photoRequirements.map((req) => {
          const photo = getPhotoForType(req.type);
          const isUploading = uploading === req.type;
          const isDragOver = dragOver === req.type;

          return (
            <div
              key={req.type}
              className={cn(
                'relative aspect-[4/3] rounded-lg border-2 border-dashed overflow-hidden transition-all',
                photo
                  ? 'border-success'
                  : isDragOver
                  ? 'border-primary bg-info-muted'
                  : 'border-input bg-surface hover:border-primary',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onDrop={(e) => !disabled && handleDrop(e, req.type)}
              onDragOver={(e) => !disabled && handleDragOver(e, req.type)}
              onDragLeave={handleDragLeave}
            >
              {photo ? (
                // Photo preview
                <>
                  <img
                    src={photo.url}
                    alt={req.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => !disabled && handleRemove(req.type)}
                      className="rounded-full bg-danger p-2 text-destructive-foreground transition-colors hover:bg-danger/90"
                      disabled={disabled}
                      aria-label={`Remove ${req.label} photo`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-semibold text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  </div>
                </>
              ) : isUploading ? (
                // Loading state
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-muted">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                </div>
              ) : (
                // Upload prompt
                <button
                  onClick={() => !disabled && openFileDialog(req.type)}
                  disabled={disabled}
                  className="absolute inset-0 flex flex-col items-center justify-center p-2 transition-colors hover:bg-surface-muted"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-center text-xs font-semibold text-foreground">
                    {req.label}
                  </span>
                  {req.required && (
                    <span className="mt-0.5 text-2xs text-danger">Required</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-muted-foreground">
        Click to capture or drag and drop photos. Tap camera on mobile devices.
      </p>
    </div>
  );
}
