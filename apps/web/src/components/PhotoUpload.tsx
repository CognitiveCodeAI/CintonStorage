import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, Loader2, ImagePlus } from 'lucide-react';
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
  const [activeMenu, setActiveMenu] = useState<PhotoType | null>(null);
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const galleryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPhotoForType = (type: PhotoType): Photo | undefined => {
    return photos.find((p) => p.type === type);
  };

  const handleUpload = async (file: File, type: PhotoType) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error('Invalid file type');
      return;
    }

    setUploading(type);
    setActiveMenu(null);

    try {
      const response = await fetch(`/api/upload?filename=${caseId}-${type}-${Date.now()}.${file.name.split('.').pop()}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const blob = await response.json();

      const newPhoto: Photo = {
        id: `${type}-${Date.now()}`,
        type,
        url: blob.url,
        filename: blob.pathname,
      };

      const updatedPhotos = photos.filter((p) => p.type !== type);
      updatedPhotos.push(newPhoto);
      onPhotosChange(updatedPhotos);
    } catch (error) {
      console.error('Upload error:', error);
      // Fallback: use local object URL for demo/offline mode
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
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

  const openCamera = (type: PhotoType) => {
    cameraInputRefs.current[type]?.click();
  };

  const openGallery = (type: PhotoType) => {
    galleryInputRefs.current[type]?.click();
  };

  const handleSlotClick = (type: PhotoType) => {
    if (disabled) return;
    setActiveMenu((prev) => (prev === type ? null : type));
  };

  const capturedCount = photos.length;
  const requiredCount = photoRequirements.filter((r) => r.required).length;
  const capturedRequired = photoRequirements.filter(
    (r) => r.required && getPhotoForType(r.type)
  ).length;

  return (
    <div className="space-y-4">
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
          const isMenuOpen = activeMenu === req.type;

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
              {/* Per-slot hidden inputs */}
              <input
                ref={(el) => { cameraInputRefs.current[req.type] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileChange(e, req.type)}
              />
              <input
                ref={(el) => { galleryInputRefs.current[req.type] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, req.type)}
              />

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
                // Upload prompt with action menu
                <div className="absolute inset-0 flex flex-col">
                  <button
                    onClick={() => handleSlotClick(req.type)}
                    disabled={disabled}
                    className="flex flex-1 flex-col items-center justify-center p-2 transition-colors hover:bg-surface-muted"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-center text-xs font-semibold text-foreground">
                      {req.label}
                    </span>
                    {req.required && (
                      <span className="mt-0.5 text-[10px] text-danger">Required</span>
                    )}
                  </button>

                  {/* Action menu */}
                  {isMenuOpen && (
                    <div className="absolute inset-0 z-10 flex flex-col items-stretch justify-center gap-2 bg-surface/95 backdrop-blur-sm p-3">
                      <button
                        onClick={() => openCamera(req.type)}
                        className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </button>
                      <button
                        onClick={() => openGallery(req.type)}
                        className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted active:scale-[0.98]"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Choose File
                      </button>
                      <button
                        onClick={() => setActiveMenu(null)}
                        className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-muted-foreground">
        Tap a slot to take a photo or choose from your device. Drag and drop on desktop.
      </p>
    </div>
  );
}
