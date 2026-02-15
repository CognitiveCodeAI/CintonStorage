import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { decodeVIN, isValidVINFormat, mapVehicleType } from '../lib/vinDecoder';
import { PhotoUpload, Photo } from '../components/PhotoUpload';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { TowReason, VehicleType, VehicleClass } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps - Clickable */}
      <div className="mb-6">
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
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    isCompleted && 'bg-green-500 text-white cursor-pointer hover:bg-green-600',
                    isCurrent && 'bg-primary text-white',
                    !isCompleted && !isCurrent && 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                    isClickable && !isCompleted && !isCurrent && 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                <span
                  className={cn(
                    'ml-2 text-sm hidden sm:inline',
                    step >= s.number ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-8 sm:w-16 lg:w-24 h-0.5 mx-2 sm:mx-4',
                      step > s.number ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Case Number Badge */}
      {createdCaseNumber && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-mono text-lg">
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
      <Card padding="md">
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

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            loading={createMutation.isPending || completeMutation.isPending}
          >
            {createMutation.isPending || completeMutation.isPending ? (
              'Processing...'
            ) : step === 4 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete Intake
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-gray-400" />
        New Tow Request
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Requesting Agency
          </label>
          <select
            className="input dark:bg-gray-900 dark:border-gray-700"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tow Date & Time *
          </label>
          <input
            type="datetime-local"
            className="input dark:bg-gray-900 dark:border-gray-700"
            value={formData.towDate}
            onChange={(e) => updateForm({ towDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tow Reason *
          </label>
          <select
            className="input dark:bg-gray-900 dark:border-gray-700"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tow Location *
          </label>
          <input
            type="text"
            className="input dark:bg-gray-900 dark:border-gray-700"
            placeholder="123 Main Street, Clinton Township, MI"
            value={formData.towLocation}
            onChange={(e) => updateForm({ towLocation: e.target.value })}
          />
        </div>
      </div>

      {/* Police Hold */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            checked={formData.policeHold}
            onChange={(e) => updateForm({ policeHold: e.target.checked })}
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Place police hold on this vehicle
          </span>
        </label>

        {formData.policeHold && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Police Case Number
              </label>
              <input
                type="text"
                className="input dark:bg-gray-900 dark:border-gray-700"
                placeholder="2026-CT-00123"
                value={formData.policeCaseNumber}
                onChange={(e) => updateForm({ policeCaseNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hold Duration
              </label>
              <select
                className="input dark:bg-gray-900 dark:border-gray-700"
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Car className="h-5 w-5 text-gray-400" />
        Vehicle Details
      </h2>

      {/* VIN with decode button */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Vehicle Identification</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              VIN
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input font-mono flex-1 dark:bg-gray-900 dark:border-gray-700"
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
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{vinDecodeError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.vin.length}/17 characters
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plate Number
              </label>
              <input
                type="text"
                className="input dark:bg-gray-900 dark:border-gray-700"
                placeholder="ABC1234"
                value={formData.plateNumber}
                onChange={(e) => updateForm({ plateNumber: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plate State
              </label>
              <select
                className="input dark:bg-gray-900 dark:border-gray-700"
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
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Vehicle Information</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <input
              type="number"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="2021"
              min="1900"
              max="2100"
              value={formData.year}
              onChange={(e) => updateForm({ year: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Make
            </label>
            <input
              type="text"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="Honda"
              value={formData.make}
              onChange={(e) => updateForm({ make: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <input
              type="text"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="Accord"
              value={formData.model}
              onChange={(e) => updateForm({ model: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <input
              type="text"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="Blue"
              value={formData.color}
              onChange={(e) => updateForm({ color: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              className="input dark:bg-gray-900 dark:border-gray-700"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class
            </label>
            <select
              className="input dark:bg-gray-900 dark:border-gray-700"
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
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          Owner Information (optional)
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner Name
            </label>
            <input
              type="text"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="John Smith"
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner Address
            </label>
            <input
              type="text"
              className="input dark:bg-gray-900 dark:border-gray-700"
              placeholder="456 Oak Avenue, Detroit, MI 48201"
              value={formData.ownerAddress}
              onChange={(e) => updateForm({ ownerAddress: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner Phone
            </label>
            <input
              type="tel"
              className="input dark:bg-gray-900 dark:border-gray-700"
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-400" />
          Photo Capture
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Check className="h-5 w-5 text-gray-400" />
        Complete Intake
      </h2>

      {/* Review Summary */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Review Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Case Number</p>
            <p className="font-mono font-bold text-gray-900 dark:text-gray-100">{caseNumber}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Vehicle</p>
            <p className="text-gray-900 dark:text-gray-100">
              {formData.year} {formData.make} {formData.model}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">VIN</p>
            <p className="font-mono text-gray-900 dark:text-gray-100">{formData.vin || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Plate</p>
            <p className="text-gray-900 dark:text-gray-100">
              {formData.plateNumber
                ? `${formData.plateNumber} (${formData.plateState})`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Tow Reason</p>
            <p className="text-gray-900 dark:text-gray-100">{formData.towReason.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Police Hold</p>
            <p className={formData.policeHold ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
              {formData.policeHold ? `Yes (${formData.holdDays} days)` : 'No'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Photos</p>
            <p className="text-gray-900 dark:text-gray-100">{formData.photos.length} captured</p>
          </div>
        </div>
      </div>

      {/* Yard Location */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Yard Location *</h3>
        <div className="grid grid-cols-6 gap-2">
          {yardLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => updateForm({ yardLocation: loc })}
              className={cn(
                'p-2 rounded-md text-sm font-medium transition-colors',
                formData.yardLocation === loc
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              )}
            >
              {loc}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Or enter manually:
          </label>
          <input
            type="text"
            className="input dark:bg-gray-900 dark:border-gray-700"
            placeholder="D-1"
            value={formData.yardLocation}
            onChange={(e) => updateForm({ yardLocation: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Intake Notes (optional)
        </label>
        <textarea
          className="input h-20 dark:bg-gray-900 dark:border-gray-700"
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
