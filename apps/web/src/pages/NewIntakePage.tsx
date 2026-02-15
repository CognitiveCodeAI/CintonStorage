import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { decodeVIN, isValidVINFormat, mapVehicleType } from '../lib/vinDecoder';
import { PhotoUpload, Photo } from '../components/PhotoUpload';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useToast } from '../components/ui/Toast';
import { TowReason, VehicleType, VehicleClass } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Car,
  Camera,
  MapPin,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';

type IntakeStep = 1 | 2 | 3 | 4;

interface IntakeFormData {
  // Step 1: Tow Request
  towingAgencyId: string;
  towDate: string;
  towReason: TowReason;
  towLocation: string;
  policeHold: boolean;
  policeCaseNumber: string;
  holdDays: number;

  // Step 2: Vehicle Details
  vin: string;
  plateNumber: string;
  plateState: string;
  year: string;
  make: string;
  model: string;
  color: string;
  vehicleType: VehicleType;
  vehicleClass: VehicleClass;
  ownerName: string;
  ownerAddress: string;
  ownerPhone: string;

  // Step 3: Photos
  photos: Photo[];

  // Step 4: Complete
  yardLocation: string;
  notes: string;
}

const initialFormData: IntakeFormData = {
  towingAgencyId: '',
  towDate: new Date().toISOString().slice(0, 16),
  towReason: TowReason.ABANDONED,
  towLocation: '',
  policeHold: false,
  policeCaseNumber: '',
  holdDays: 14,
  vin: '',
  plateNumber: '',
  plateState: 'MI',
  year: '',
  make: '',
  model: '',
  color: '',
  vehicleType: VehicleType.SEDAN,
  vehicleClass: VehicleClass.STANDARD,
  ownerName: '',
  ownerAddress: '',
  ownerPhone: '',
  photos: [],
  yardLocation: '',
  notes: '',
};

const yardLocations = [
  'A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6',
  'B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6',
  'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6',
];

export default function NewIntakePage() {
  const [step, setStep] = useState<IntakeStep>(1);
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [createdCaseNumber, setCreatedCaseNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { addToast } = useToast();
  const { data: agencies } = trpc.agency.list.useQuery();
  const createMutation = trpc.vehicleCase.create.useMutation();
  const completeMutation = trpc.vehicleCase.completeIntake.useMutation();

  const updateForm = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDecodeVIN = async () => {
    if (!formData.vin || formData.vin.length !== 17) {
      setVinDecodeError('VIN must be exactly 17 characters');
      return;
    }

    if (!isValidVINFormat(formData.vin)) {
      setVinDecodeError('Invalid VIN format');
      return;
    }

    setVinDecoding(true);
    setVinDecodeError(null);

    try {
      const result = await decodeVIN(formData.vin);

      if (result.errorCode && result.errorCode !== '0') {
        setVinDecodeError(result.errorText || 'Failed to decode VIN');
        return;
      }

      // Update form with decoded values
      updateForm({
        year: result.year || formData.year,
        make: result.make || formData.make,
        model: result.model || formData.model,
        vehicleType: (mapVehicleType(result.vehicleType) as VehicleType) || formData.vehicleType,
      });
    } catch (error) {
      setVinDecodeError('Failed to decode VIN. Please enter details manually.');
    } finally {
      setVinDecoding(false);
    }
  };

  // Auto-decode when VIN reaches 17 characters
  const handleVINChange = (value: string) => {
    const upperVIN = value.toUpperCase();
    updateForm({ vin: upperVIN });

    // Clear previous error
    if (vinDecodeError) {
      setVinDecodeError(null);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      if (!formData.towLocation) {
        setError('Tow location is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      try {
        const holdExpiresAt = formData.policeHold
          ? new Date(Date.now() + formData.holdDays * 24 * 60 * 60 * 1000)
          : undefined;

        const result = await createMutation.mutateAsync({
          towingAgencyId: formData.towingAgencyId || undefined,
          towDate: new Date(formData.towDate),
          towReason: formData.towReason,
          towLocation: formData.towLocation,
          policeHold: formData.policeHold,
          policeCaseNumber: formData.policeCaseNumber || undefined,
          holdExpiresAt,
          vin: formData.vin || undefined,
          plateNumber: formData.plateNumber || undefined,
          plateState: formData.plateState || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          make: formData.make || undefined,
          model: formData.model || undefined,
          color: formData.color || undefined,
          vehicleType: formData.vehicleType,
          vehicleClass: formData.vehicleClass,
          ownerName: formData.ownerName || undefined,
          ownerAddress: formData.ownerAddress || undefined,
          ownerPhone: formData.ownerPhone || undefined,
        });
        setCreatedCaseId(result.id);
        setCreatedCaseNumber(result.caseNumber);
        addToast(`Case ${result.caseNumber} created successfully`, 'success');
        setStep(3);
      } catch (e) {
        setError('Failed to create case. Please try again.');
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (!formData.yardLocation) {
        setError('Yard location is required');
        return;
      }
      try {
        await completeMutation.mutateAsync({
          caseId: createdCaseId!,
          yardLocation: formData.yardLocation,
          notes: formData.notes || undefined,
        });
        addToast('Intake completed successfully', 'success');
        navigate(`/cases/${createdCaseId}`);
      } catch (e) {
        setError('Failed to complete intake. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as IntakeStep);
    } else {
      navigate('/');
    }
  };

  const handleStepClick = (targetStep: IntakeStep) => {
    // Allow going back to completed steps
    if (targetStep < step) {
      setStep(targetStep);
    }
    // Allow jumping to step 4 only if case is created
    if (targetStep === 4 && step === 3 && createdCaseId) {
      setStep(4);
    }
  };

  const steps = [
    { number: 1, label: 'Tow Request', icon: MapPin },
    { number: 2, label: 'Vehicle', icon: Car },
    { number: 3, label: 'Photos', icon: Camera },
    { number: 4, label: 'Complete', icon: Check },
  ];

  const isMutating = Boolean(
    (createMutation as { isPending?: boolean; isLoading?: boolean }).isPending ??
      createMutation.isLoading ??
      (completeMutation as { isPending?: boolean; isLoading?: boolean }).isPending ??
      completeMutation.isLoading
  );

  const stepHelp: Record<IntakeStep, string> = {
    1: 'Confirm tow request and location details',
    2: 'Capture vehicle identifiers and owner details',
    3: 'Upload required intake photos',
    4: 'Assign yard location and finalize intake',
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="ops-page-title">New Intake</h1>
        <p className="ops-page-subtitle">{stepHelp[step]}</p>
      </div>

      {/* Progress Steps - Clickable */}
      <div className="mb-6">
        <div className="ops-surface px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = step > s.number;
            const isCurrent = step === s.number;
            const isClickable = s.number < step || (s.number === 4 && step === 3 && createdCaseId);

            return (
              <div key={s.number} className="flex items-center">
                <button
                  onClick={() => isClickable && handleStepClick(s.number as IntakeStep)}
                  disabled={!isClickable}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                    isCompleted && 'border-success bg-success text-white cursor-pointer',
                    isCurrent && 'border-primary bg-primary text-primary-foreground ring-2 ring-ring/35',
                    !isCompleted && !isCurrent && 'border-border bg-surface-muted text-muted-foreground',
                    isClickable && !isCompleted && !isCurrent && 'cursor-pointer hover:bg-surface hover:text-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                <span
                  className={cn(
                    'ml-2 hidden text-sm sm:inline',
                    step >= s.number ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-8 sm:mx-4 sm:w-16 lg:w-24',
                      step > s.number ? 'bg-success' : 'bg-border'
                    )}
                  />
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Case Number Badge */}
      {createdCaseNumber && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center rounded-full border border-info/45 bg-info-muted px-4 py-2 font-mono text-lg font-semibold text-info-foreground">
            Case: {createdCaseNumber}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Form Content */}
      <Card padding="md" className="relative">
        {step === 1 && (
          <Step1TowRequest
            formData={formData}
            updateForm={updateForm}
            agencies={agencies || []}
          />
        )}
        {step === 2 && (
          <Step2VehicleDetails
            formData={formData}
            updateForm={updateForm}
            onDecodeVIN={handleDecodeVIN}
            onVINChange={handleVINChange}
            vinDecoding={vinDecoding}
            vinDecodeError={vinDecodeError}
          />
        )}
        {step === 3 && (
          <Step3PhotoCapture
            formData={formData}
            updateForm={updateForm}
            caseId={createdCaseId || ''}
            caseNumber={createdCaseNumber || ''}
          />
        )}
        {step === 4 && (
          <Step4CompleteIntake
            formData={formData}
            updateForm={updateForm}
            caseNumber={createdCaseNumber || ''}
          />
        )}
      </Card>

      <div className="sticky bottom-3 z-30 mt-4">
        <div className="ops-surface flex items-center justify-between border-border bg-surface/95 px-4 py-3 shadow-[0_12px_26px_rgba(15,23,42,0.16)] backdrop-blur">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            variant="primary"
            loading={isMutating}
            disabled={isMutating}
            className="min-w-[11rem] border border-primary/25"
          >
            {isMutating ? (
              'Processing...'
            ) : step === 4 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Intake
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step Components
interface StepProps {
  formData: IntakeFormData;
  updateForm: (updates: Partial<IntakeFormData>) => void;
}

function Step1TowRequest({
  formData,
  updateForm,
  agencies,
}: StepProps & { agencies: Array<{ id: string; name: string }> }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <MapPin className="h-5 w-5 text-info" />
        New Tow Request
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Requesting Agency
          </label>
          <select
            className="input"
            value={formData.towingAgencyId}
            onChange={(e) => updateForm({ towingAgencyId: e.target.value })}
          >
            <option value="">Select agency...</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tow Date & Time *
          </label>
          <input
            type="datetime-local"
            className="input"
            value={formData.towDate}
            onChange={(e) => updateForm({ towDate: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tow Reason *
          </label>
          <select
            className="input"
            value={formData.towReason}
            onChange={(e) => updateForm({ towReason: e.target.value as TowReason })}
          >
            {Object.values(TowReason).map((reason) => (
              <option key={reason} value={reason}>
                {reason.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tow Location *
          </label>
          <input
            type="text"
            className="input"
            placeholder="123 Main Street, Clinton Township, MI"
            value={formData.towLocation}
            onChange={(e) => updateForm({ towLocation: e.target.value })}
          />
        </div>
      </div>

      {/* Police Hold */}
      <div className="ops-surface-muted p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            checked={formData.policeHold}
            onChange={(e) => updateForm({ policeHold: e.target.checked })}
          />
          <span className="font-semibold text-foreground">
            Place police hold on this vehicle
          </span>
        </label>

        {formData.policeHold && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Police Case Number
              </label>
              <input
                type="text"
                className="input"
                placeholder="2026-CT-00123"
                value={formData.policeCaseNumber}
                onChange={(e) => updateForm({ policeCaseNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Hold Duration
              </label>
              <select
                className="input"
                value={formData.holdDays}
                onChange={(e) => updateForm({ holdDays: parseInt(e.target.value) })}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step2VehicleDetails({
  formData,
  updateForm,
  onDecodeVIN,
  onVINChange,
  vinDecoding,
  vinDecodeError,
}: StepProps & {
  onDecodeVIN: () => void;
  onVINChange: (value: string) => void;
  vinDecoding: boolean;
  vinDecodeError: string | null;
}) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Car className="h-5 w-5 text-info" />
        Vehicle Details
      </h2>

      {/* VIN with decode button */}
      <div className="ops-surface-muted p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Identification</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              VIN
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1 font-mono"
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                value={formData.vin}
                onChange={(e) => onVINChange(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onDecodeVIN}
                disabled={formData.vin.length !== 17 || vinDecoding}
                loading={vinDecoding}
              >
                <Search className="h-4 w-4 mr-1" />
                Decode
              </Button>
            </div>
            {vinDecodeError && (
              <p className="mt-1 text-sm text-danger">{vinDecodeError}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.vin.length}/17 characters
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Plate Number
              </label>
              <input
                type="text"
                className="input"
                placeholder="ABC1234"
                value={formData.plateNumber}
                onChange={(e) => updateForm({ plateNumber: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Plate State
              </label>
              <select
                className="input"
                value={formData.plateState}
                onChange={(e) => updateForm({ plateState: e.target.value })}
              >
                <option value="MI">Michigan</option>
                <option value="OH">Ohio</option>
                <option value="IN">Indiana</option>
                <option value="IL">Illinois</option>
                <option value="WI">Wisconsin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="ops-surface-muted p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Information</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Year
            </label>
            <input
              type="number"
              className="input"
              placeholder="2021"
              min="1900"
              max="2100"
              value={formData.year}
              onChange={(e) => updateForm({ year: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Make
            </label>
            <input
              type="text"
              className="input"
              placeholder="Honda"
              value={formData.make}
              onChange={(e) => updateForm({ make: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Model
            </label>
            <input
              type="text"
              className="input"
              placeholder="Accord"
              value={formData.model}
              onChange={(e) => updateForm({ model: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Color
            </label>
            <input
              type="text"
              className="input"
              placeholder="Blue"
              value={formData.color}
              onChange={(e) => updateForm({ color: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Type
            </label>
            <select
              className="input"
              value={formData.vehicleType}
              onChange={(e) => updateForm({ vehicleType: e.target.value as VehicleType })}
            >
              {Object.values(VehicleType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Class
            </label>
            <select
              className="input"
              value={formData.vehicleClass}
              onChange={(e) => updateForm({ vehicleClass: e.target.value as VehicleClass })}
            >
              {Object.values(VehicleClass).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Owner Info */}
      <div className="ops-surface-muted p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          Owner Information (optional)
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Owner Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="John Smith"
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Owner Address
            </label>
            <input
              type="text"
              className="input"
              placeholder="456 Oak Avenue, Detroit, MI 48201"
              value={formData.ownerAddress}
              onChange={(e) => updateForm({ ownerAddress: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Owner Phone
            </label>
            <input
              type="tel"
              className="input"
              placeholder="555-123-4567"
              value={formData.ownerPhone}
              onChange={(e) => updateForm({ ownerPhone: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3PhotoCapture({
  formData,
  updateForm,
  caseId,
  caseNumber,
}: StepProps & { caseId: string; caseNumber: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Camera className="h-5 w-5 text-info" />
          Photo Capture
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Case: {caseNumber} | {formData.year} {formData.make} {formData.model}
        </p>
      </div>

      <PhotoUpload
        caseId={caseId}
        photos={formData.photos}
        onPhotosChange={(photos) => updateForm({ photos })}
      />
    </div>
  );
}

function Step4CompleteIntake({
  formData,
  updateForm,
  caseNumber,
}: StepProps & { caseNumber: string }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Check className="h-5 w-5 text-success" />
        Complete Intake
      </h2>

      {/* Review Summary */}
      <div className="ops-surface-muted p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Case Number</p>
            <p className="font-mono font-bold text-foreground">{caseNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vehicle</p>
            <p className="text-foreground">
              {formData.year} {formData.make} {formData.model}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">VIN</p>
            <p className="font-mono text-foreground">{formData.vin || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Plate</p>
            <p className="text-foreground">
              {formData.plateNumber
                ? `${formData.plateNumber} (${formData.plateState})`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tow Reason</p>
            <p className="text-foreground">{formData.towReason.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Police Hold</p>
            <p className={formData.policeHold ? 'font-medium text-danger' : 'text-foreground'}>
              {formData.policeHold ? `Yes (${formData.holdDays} days)` : 'No'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Photos</p>
            <p className="text-foreground">{formData.photos.length} captured</p>
          </div>
        </div>
      </div>

      {/* Yard Location */}
      <div className="ops-surface-muted p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Yard Location *</h3>
        <div className="grid grid-cols-6 gap-2">
          {yardLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => updateForm({ yardLocation: loc })}
              className={cn(
                'rounded-md border p-2 text-sm font-semibold transition-colors',
                formData.yardLocation === loc
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-foreground hover:border-ring hover:bg-surface-muted'
              )}
            >
              {loc}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Or enter manually:
          </label>
          <input
            type="text"
            className="input"
            placeholder="D-1"
            value={formData.yardLocation}
            onChange={(e) => updateForm({ yardLocation: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Intake Notes (optional)
        </label>
        <textarea
          className="input h-20"
          placeholder="Front bumper damage, keys in ignition..."
          value={formData.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
        />
      </div>

      {/* Fees Preview */}
      <Alert variant="info">
        <strong>Initial Fees:</strong> Tow Fee ($150) + Admin Fee ($50) = $200.00
        <br />
        <span className="text-sm opacity-80">Daily storage begins: {new Date().toLocaleDateString()}</span>
      </Alert>
    </div>
  );
}
