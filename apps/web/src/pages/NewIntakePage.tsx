import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { TowReason, VehicleType, VehicleClass } from '../types';
import { ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';

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

  // Step 3: Photos (mock)
  photosFront: boolean;
  photosRear: boolean;
  photosDriver: boolean;
  photosPassenger: boolean;
  photosVin: boolean;
  photosOdometer: boolean;

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
  photosFront: false,
  photosRear: false,
  photosDriver: false,
  photosPassenger: false,
  photosVin: false,
  photosOdometer: false,
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
  const navigate = useNavigate();

  const { data: agencies } = trpc.agency.list.useQuery();
  const createMutation = trpc.vehicleCase.create.useMutation();
  const completeMutation = trpc.vehicleCase.completeIntake.useMutation();

  const updateForm = (updates: Partial<IntakeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      // Validate step 1
      if (!formData.towLocation) {
        setError('Tow location is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Create the case
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
        setStep(3);
      } catch (e) {
        setError('Failed to create case. Please try again.');
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      // Complete intake
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

  const steps = [
    { number: 1, label: 'Tow Request' },
    { number: 2, label: 'Vehicle Details' },
    { number: 3, label: 'Photo Capture' },
    { number: 4, label: 'Complete Intake' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step > s.number
                    ? 'bg-green-500 text-white'
                    : step === s.number
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s.number ? <Check className="h-4 w-4" /> : s.number}
              </div>
              <span
                className={`ml-2 text-sm ${
                  step >= s.number ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-24 h-0.5 mx-4 ${
                    step > s.number ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Case Number Badge */}
      {createdCaseNumber && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-mono text-lg">
            Case: {createdCaseNumber}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {step === 1 && (
          <Step1TowRequest
            formData={formData}
            updateForm={updateForm}
            agencies={agencies || []}
          />
        )}
        {step === 2 && (
          <Step2VehicleDetails formData={formData} updateForm={updateForm} />
        )}
        {step === 3 && (
          <Step3PhotoCapture
            formData={formData}
            updateForm={updateForm}
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
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={handleBack}
            className="btn-outline flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>
          <button
            onClick={handleNext}
            className="btn-primary flex items-center"
            disabled={createMutation.isPending || completeMutation.isPending}
          >
            {createMutation.isPending || completeMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
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
          </button>
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">New Tow Request</h2>

      <div>
        <label className="label">Requesting Agency</label>
        <select
          className="input mt-1"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tow Date & Time *</label>
          <input
            type="datetime-local"
            className="input mt-1"
            value={formData.towDate}
            onChange={(e) => updateForm({ towDate: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Tow Reason *</label>
          <select
            className="input mt-1"
            value={formData.towReason}
            onChange={(e) =>
              updateForm({ towReason: e.target.value as TowReason })
            }
          >
            {Object.values(TowReason).map((reason) => (
              <option key={reason} value={reason}>
                {reason.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Tow Location *</label>
        <input
          type="text"
          className="input mt-1"
          placeholder="123 Main Street, Clinton Township, MI"
          value={formData.towLocation}
          onChange={(e) => updateForm({ towLocation: e.target.value })}
        />
      </div>

      {/* Police Hold */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={formData.policeHold}
            onChange={(e) => updateForm({ policeHold: e.target.checked })}
          />
          <span className="font-medium">Place police hold on this vehicle</span>
        </label>

        {formData.policeHold && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="label">Police Case Number</label>
              <input
                type="text"
                className="input mt-1"
                placeholder="2026-CT-00123"
                value={formData.policeCaseNumber}
                onChange={(e) =>
                  updateForm({ policeCaseNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Hold Duration</label>
              <select
                className="input mt-1"
                value={formData.holdDays}
                onChange={(e) =>
                  updateForm({ holdDays: parseInt(e.target.value) })
                }
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

function Step2VehicleDetails({ formData, updateForm }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Vehicle Details</h2>

      {/* VIN & Plate */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Vehicle Identification</h3>
        <div className="space-y-4">
          <div>
            <label className="label">VIN</label>
            <input
              type="text"
              className="input mt-1 font-mono"
              placeholder="1HGBH41JXMN109186"
              maxLength={17}
              value={formData.vin}
              onChange={(e) =>
                updateForm({ vin: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Plate Number</label>
              <input
                type="text"
                className="input mt-1"
                placeholder="ABC1234"
                value={formData.plateNumber}
                onChange={(e) =>
                  updateForm({ plateNumber: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div>
              <label className="label">Plate State</label>
              <select
                className="input mt-1"
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
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Vehicle Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Year</label>
            <input
              type="number"
              className="input mt-1"
              placeholder="2021"
              min="1900"
              max="2100"
              value={formData.year}
              onChange={(e) => updateForm({ year: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Make</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="Honda"
              value={formData.make}
              onChange={(e) => updateForm({ make: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="Accord"
              value={formData.model}
              onChange={(e) => updateForm({ model: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="label">Color</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="Blue"
              value={formData.color}
              onChange={(e) => updateForm({ color: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Vehicle Type</label>
            <select
              className="input mt-1"
              value={formData.vehicleType}
              onChange={(e) =>
                updateForm({ vehicleType: e.target.value as VehicleType })
              }
            >
              {Object.values(VehicleType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Vehicle Class</label>
            <select
              className="input mt-1"
              value={formData.vehicleClass}
              onChange={(e) =>
                updateForm({ vehicleClass: e.target.value as VehicleClass })
              }
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
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Owner Information (optional)</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Owner Name</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="John Smith"
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Owner Address</label>
            <input
              type="text"
              className="input mt-1"
              placeholder="456 Oak Avenue, Detroit, MI 48201"
              value={formData.ownerAddress}
              onChange={(e) => updateForm({ ownerAddress: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Owner Phone</label>
            <input
              type="tel"
              className="input mt-1"
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
  caseNumber,
}: StepProps & { caseNumber: string }) {
  const photos = [
    { key: 'photosFront', label: 'Front' },
    { key: 'photosRear', label: 'Rear' },
    { key: 'photosDriver', label: 'Driver Side' },
    { key: 'photosPassenger', label: 'Passenger Side' },
    { key: 'photosVin', label: 'VIN Plate' },
    { key: 'photosOdometer', label: 'Odometer' },
  ] as const;

  const capturedCount = photos.filter(
    (p) => formData[p.key]
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Photo Capture</h2>
        <p className="text-gray-500 mt-1">
          Case: {caseNumber} | {formData.year} {formData.make} {formData.model}
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Required Photos</h3>
        <div className="grid grid-cols-3 gap-4">
          {photos.map((photo) => (
            <label
              key={photo.key}
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                formData[photo.key]
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={formData[photo.key]}
                onChange={(e) =>
                  updateForm({ [photo.key]: e.target.checked })
                }
              />
              {formData[photo.key] ? (
                <Check className="h-8 w-8 text-green-500" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xl">+</span>
                </div>
              )}
              <span className="text-sm mt-2">{photo.label}</span>
              {formData[photo.key] && (
                <span className="text-xs text-green-600 mt-1">Captured</span>
              )}
            </label>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          {capturedCount} of {photos.length} photos captured
        </p>
        <p className="text-xs text-gray-400 mt-2 text-center">
          (For MVP, click boxes to simulate photo capture)
        </p>
      </div>
    </div>
  );
}

function Step4CompleteIntake({
  formData,
  updateForm,
  caseNumber,
}: StepProps & { caseNumber: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Complete Intake</h2>

      {/* Review Summary */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-medium mb-4">Review Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Case Number</p>
            <p className="font-mono font-bold">{caseNumber}</p>
          </div>
          <div>
            <p className="text-gray-500">Vehicle</p>
            <p>
              {formData.year} {formData.make} {formData.model}
            </p>
          </div>
          <div>
            <p className="text-gray-500">VIN</p>
            <p className="font-mono">{formData.vin || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Plate</p>
            <p>
              {formData.plateNumber
                ? `${formData.plateNumber} (${formData.plateState})`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Tow Reason</p>
            <p>{formData.towReason.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-500">Police Hold</p>
            <p className={formData.policeHold ? 'text-red-600 font-medium' : ''}>
              {formData.policeHold ? `Yes (${formData.holdDays} days)` : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Yard Location */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">Yard Location *</h3>
        <div className="grid grid-cols-6 gap-2">
          {yardLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => updateForm({ yardLocation: loc })}
              className={`p-3 rounded-md text-sm font-medium transition-colors ${
                formData.yardLocation === loc
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="label">Or enter manually:</label>
          <input
            type="text"
            className="input mt-1"
            placeholder="D-1"
            value={formData.yardLocation}
            onChange={(e) =>
              updateForm({ yardLocation: e.target.value.toUpperCase() })
            }
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Intake Notes (optional)</label>
        <textarea
          className="input mt-1 h-24"
          placeholder="Front bumper damage, keys in ignition..."
          value={formData.notes}
          onChange={(e) => updateForm({ notes: e.target.value })}
        />
      </div>

      {/* Fees Preview */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-medium mb-2">Initial Fees to Apply</h3>
        <ul className="text-sm space-y-1">
          <li>Tow Fee (Standard): $150.00</li>
          <li>Administrative Fee: $50.00</li>
          <li className="text-gray-500">
            Daily storage begins: {new Date().toLocaleDateString()}
          </li>
        </ul>
      </div>
    </div>
  );
}
