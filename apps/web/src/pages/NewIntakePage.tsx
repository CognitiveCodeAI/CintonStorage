import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { decodeVIN, isValidVINFormat, mapVehicleType } from '../lib/vinDecoder';
import { PhotoUpload, Photo } from '../components/PhotoUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '../components/ui/Input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
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
  towingAgencyId: string;
  towDate: string;
  towReason: TowReason;
  towAddress: string;
  towCity: string;
  towState: string;
  towZip: string;
  policeHold: boolean;
  policeCaseNumber: string;
  holdDays: number;
  vin: string;
  plateNumber: string;
  plateState: string;
  year: string;
  make: string;
  model: string;
  color: string;
  vehicleType: VehicleType;
  vehicleClass: VehicleClass;
  ownerFirstName: string;
  ownerLastName: string;
  ownerAddress: string;
  ownerCity: string;
  ownerState: string;
  ownerZip: string;
  ownerPhone: string;
  photos: Photo[];
  yardLocation: string;
  notes: string;
}

const initialFormData: IntakeFormData = {
  towingAgencyId: '',
  towDate: new Date().toISOString().slice(0, 16),
  towReason: TowReason.ABANDONED,
  towAddress: '',
  towCity: '',
  towState: 'MI',
  towZip: '',
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
  ownerFirstName: '',
  ownerLastName: '',
  ownerAddress: '',
  ownerCity: '',
  ownerState: 'MI',
  ownerZip: '',
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

  const handleVINChange = (value: string) => {
    const upperVIN = value.toUpperCase();
    updateForm({ vin: upperVIN });
    if (vinDecodeError) setVinDecodeError(null);
  };

  const handleNext = async () => {
    setError(null);
    if (step === 1) {
      if (!formData.towAddress) {
        setError('Tow address is required');
        return;
      }
      if (!formData.towCity) {
        setError('Tow city is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      try {
        const holdExpiresAt = formData.policeHold ? new Date(Date.now() + formData.holdDays * 24 * 60 * 60 * 1000) : undefined;
        const towLocation = [
          formData.towAddress,
          formData.towCity,
          formData.towState,
          formData.towZip,
        ].filter(Boolean).join(', ');
        const result = await createMutation.mutateAsync({
          towingAgencyId: formData.towingAgencyId || undefined,
          towDate: new Date(formData.towDate),
          towReason: formData.towReason,
          towLocation,
          policeHold: formData.policeHold,
          policeCaseNumber: formData.policeCaseNumber || undefined,
          holdExpiresAt,
          vin: formData.vin.length === 17 ? formData.vin : undefined,
          plateNumber: formData.plateNumber || undefined,
          plateState: formData.plateState || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          make: formData.make || undefined,
          model: formData.model || undefined,
          color: formData.color || undefined,
          vehicleType: formData.vehicleType,
          vehicleClass: formData.vehicleClass,
          ownerFirstName: formData.ownerFirstName || undefined,
          ownerLastName: formData.ownerLastName || undefined,
          ownerAddress: formData.ownerAddress || undefined,
          ownerCity: formData.ownerCity || undefined,
          ownerState: formData.ownerState || undefined,
          ownerZip: formData.ownerZip || undefined,
          ownerPhone: formData.ownerPhone || undefined,
        });
        setCreatedCaseId(result.id);
        setCreatedCaseNumber(result.caseNumber);
        addToast(`Case ${result.caseNumber} created successfully`, 'success');
        setStep(3);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(`Failed to create case: ${msg}`);
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(`Failed to complete intake: ${msg}`);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as IntakeStep);
    else navigate('/');
  };

  const handleStepClick = (targetStep: IntakeStep) => {
    if (targetStep < step) setStep(targetStep);
    if (targetStep === 4 && step === 3 && createdCaseId) setStep(4);
  };

  const steps = [
    { number: 1, label: 'Tow Request', icon: MapPin },
    { number: 2, label: 'Vehicle', icon: Car },
    { number: 3, label: 'Photos', icon: Camera },
    { number: 4, label: 'Complete', icon: Check },
  ];

  const isMutating = createMutation.isLoading || completeMutation.isLoading;

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
      <Card className="mb-6"><CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = step > s.number;
            const isCurrent = step === s.number;
            const isClickable = s.number < step || (s.number === 4 && step === 3 && createdCaseId);
            return (
              <div key={s.number} className="flex items-center">
                <button onClick={() => isClickable && handleStepClick(s.number as IntakeStep)} disabled={!isClickable} className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors', isCompleted && 'border-success bg-success text-white cursor-pointer', isCurrent && 'border-primary bg-primary text-primary-foreground ring-2 ring-ring/35', !isCompleted && !isCurrent && 'border-border bg-surface-muted text-muted-foreground', isClickable && !isCompleted && !isCurrent && 'cursor-pointer hover:bg-surface hover:text-foreground')}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                <span className={cn('ml-2 hidden text-sm sm:inline', step >= s.number ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s.label}</span>
                {idx < steps.length - 1 && (<div className={cn('mx-2 h-0.5 w-8 sm:mx-4 sm:w-16 lg:w-24', step > s.number ? 'bg-success' : 'bg-border')} />)}
              </div>
            );
          })}
        </div>
      </CardContent></Card>
      {createdCaseNumber && (
        <div className="mb-4 text-center"><span className="inline-flex items-center rounded-full border border-info/45 bg-info-muted px-4 py-2 font-mono text-lg font-semibold text-info-foreground">Case: {createdCaseNumber}</span></div>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      )}
      <Card className="relative"><CardContent className="p-6">
        {step === 1 && <Step1TowRequest formData={formData} updateForm={updateForm} agencies={agencies || []} />}
        {step === 2 && <Step2VehicleDetails formData={formData} updateForm={updateForm} onDecodeVIN={handleDecodeVIN} onVINChange={handleVINChange} vinDecoding={vinDecoding} vinDecodeError={vinDecodeError} />}
        {step === 3 && <Step3PhotoCapture formData={formData} updateForm={updateForm} caseId={createdCaseId || ''} caseNumber={createdCaseNumber || ''} />}
        {step === 4 && <Step4CompleteIntake formData={formData} updateForm={updateForm} caseNumber={createdCaseNumber || ''} />}
      </CardContent></Card>
      <div className="sticky bottom-3 z-30 mt-6">
        <Card className="border-border bg-surface/95 shadow-[0_12px_26px_rgba(15,23,42,0.16)] backdrop-blur"><CardContent className="!p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" />{step === 1 ? 'Cancel' : 'Back'}</Button>
            <Button onClick={handleNext} variant="primary" loading={isMutating} disabled={isMutating} className="min-w-[11rem] border border-primary/25">
              {isMutating ? 'Processing...' : step === 4 ? (<><Check className="mr-2 h-4 w-4" />Complete Intake</>) : (<>Continue<ArrowRight className="ml-2 h-4 w-4" /></>)}
            </Button>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}

interface StepProps { formData: IntakeFormData; updateForm: (updates: Partial<IntakeFormData>) => void; }

function Step1TowRequest({ formData, updateForm, agencies }: StepProps & { agencies: Array<{ id: string; name: string }> }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><MapPin className="h-5 w-5 text-info" />New Tow Request</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Requesting Agency</label>
          <Select onValueChange={(value) => updateForm({ towingAgencyId: value })} defaultValue={formData.towingAgencyId}>
            <SelectTrigger><SelectValue placeholder="Select agency..." /></SelectTrigger>
            <SelectContent>{agencies.map((agency) => (<SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Input label="Tow Date & Time *" type="datetime-local" value={formData.towDate} onChange={(e) => updateForm({ towDate: e.target.value })} />
        <div>
          <label className="mb-1 block text-sm font-medium">Tow Reason *</label>
          <Select onValueChange={(value) => updateForm({ towReason: value as TowReason })} defaultValue={formData.towReason}>
            <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
            <SelectContent>{Object.values(TowReason).map((reason) => (<SelectItem key={reason} value={reason}>{reason.replace(/_/g, ' ')}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2"><Input label="Tow Address *" placeholder="123 Main Street" value={formData.towAddress} onChange={(e) => updateForm({ towAddress: e.target.value })} /></div>
        <Input label="City *" placeholder="Clinton Township" value={formData.towCity} onChange={(e) => updateForm({ towCity: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="State" placeholder="MI" maxLength={2} value={formData.towState} onChange={(e) => updateForm({ towState: e.target.value.toUpperCase() })} />
          <Input label="Zip" placeholder="48035" maxLength={10} value={formData.towZip} onChange={(e) => updateForm({ towZip: e.target.value })} />
        </div>
      </div>
      <Card className="bg-surface-muted"><CardContent className="!p-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="police-hold" checked={formData.policeHold} onCheckedChange={(checked) => updateForm({ policeHold: !!checked })} />
          <label htmlFor="police-hold" className="font-semibold text-foreground">Place a police hold on this vehicle</label>
        </div>
        {formData.policeHold && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Police Case Number" placeholder="2026-CT-00123" value={formData.policeCaseNumber} onChange={(e) => updateForm({ policeCaseNumber: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium">Hold Duration</label>
              <Select onValueChange={(value) => updateForm({ holdDays: parseInt(value) })} defaultValue={String(formData.holdDays)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem><SelectItem value="14">14 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}

function Step2VehicleDetails({ formData, updateForm, onDecodeVIN, onVINChange, vinDecoding, vinDecodeError }: StepProps & { onDecodeVIN: () => void; onVINChange: (value: string) => void; vinDecoding: boolean; vinDecodeError: string | null; }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><Car className="h-5 w-5 text-info" />Vehicle Details</h2>
      <Card className="bg-surface-muted"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Identification</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">VIN</label>
            <div className="flex gap-2">
              <Input type="text" className="flex-1 font-mono" placeholder="1HGBH41JXMN109186" maxLength={17} value={formData.vin} onChange={(e) => onVINChange(e.target.value)} />
              <Button type="button" variant="outline" onClick={onDecodeVIN} disabled={formData.vin.length !== 17 || vinDecoding} loading={vinDecoding}><Search className="h-4 w-4 mr-1" />Decode</Button>
            </div>
            {vinDecodeError && (<p className="mt-1 text-sm text-danger">{vinDecodeError}</p>)}
            <p className="mt-1 text-xs text-muted-foreground">{formData.vin.length}/17 characters</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plate Number" placeholder="ABC1234" value={formData.plateNumber} onChange={(e) => updateForm({ plateNumber: e.target.value.toUpperCase() })} />
            <div>
              <label className="mb-1 block text-sm font-medium">Plate State</label>
              <Select onValueChange={(value) => updateForm({ plateState: value })} defaultValue={formData.plateState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="MI">Michigan</SelectItem><SelectItem value="OH">Ohio</SelectItem><SelectItem value="IN">Indiana</SelectItem><SelectItem value="IL">Illinois</SelectItem><SelectItem value="WI">Wisconsin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent></Card>
      <Card className="bg-surface-muted"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle Information</h3>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Year" type="number" placeholder="2021" min="1900" max="2100" value={formData.year} onChange={(e) => updateForm({ year: e.target.value })} />
          <Input label="Make" placeholder="Honda" value={formData.make} onChange={(e) => updateForm({ make: e.target.value })} />
          <Input label="Model" placeholder="Accord" value={formData.model} onChange={(e) => updateForm({ model: e.target.value })} />
          <Input label="Color" placeholder="Blue" value={formData.color} onChange={(e) => updateForm({ color: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <Select onValueChange={(value) => updateForm({ vehicleType: value as VehicleType })} defaultValue={formData.vehicleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.values(VehicleType).map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Class</label>
            <Select onValueChange={(value) => updateForm({ vehicleClass: value as VehicleClass })} defaultValue={formData.vehicleClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.values(VehicleClass).map((cls) => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>
      <Card className="bg-surface-muted"><CardContent className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><User className="h-4 w-4 text-muted-foreground" />Owner Information (optional)</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="First Name" placeholder="John" value={formData.ownerFirstName} onChange={(e) => updateForm({ ownerFirstName: e.target.value })} />
            <Input label="Last Name" placeholder="Smith" value={formData.ownerLastName} onChange={(e) => updateForm({ ownerLastName: e.target.value })} />
          </div>
          <Input label="Address" placeholder="456 Oak Avenue" value={formData.ownerAddress} onChange={(e) => updateForm({ ownerAddress: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_80px_100px]">
            <Input label="City" placeholder="Detroit" value={formData.ownerCity} onChange={(e) => updateForm({ ownerCity: e.target.value })} className="col-span-2 sm:col-span-1" />
            <Input label="State" placeholder="MI" maxLength={2} value={formData.ownerState} onChange={(e) => updateForm({ ownerState: e.target.value.toUpperCase() })} />
            <Input label="Zip" placeholder="48201" maxLength={10} value={formData.ownerZip} onChange={(e) => updateForm({ ownerZip: e.target.value })} />
          </div>
          <Input label="Phone" type="tel" placeholder="555-123-4567" value={formData.ownerPhone} onChange={(e) => updateForm({ ownerPhone: e.target.value })} />
        </div>
      </CardContent></Card>
    </div>
  );
}

function Step3PhotoCapture({ formData, updateForm, caseId, caseNumber }: StepProps & { caseId: string; caseNumber: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><Camera className="h-5 w-5 text-info" />Photo Capture</h2>
        <p className="mt-1 text-sm text-muted-foreground">Case: {caseNumber} | {formData.year} {formData.make} {formData.model}</p>
      </div>
      <PhotoUpload caseId={caseId} photos={formData.photos} onPhotosChange={(photos) => updateForm({ photos })} />
    </div>
  );
}

function Step4CompleteIntake({ formData, updateForm, caseNumber }: StepProps & { caseNumber: string }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><Check className="h-5 w-5 text-success" />Complete Intake</h2>
      <Card className="bg-surface-muted"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-muted-foreground">Case Number</p><p className="font-mono font-bold text-foreground">{caseNumber}</p></div>
          <div><p className="text-muted-foreground">Vehicle</p><p className="text-foreground">{formData.year} {formData.make} {formData.model}</p></div>
          <div><p className="text-muted-foreground">VIN</p><p className="font-mono text-foreground">{formData.vin || '-'}</p></div>
          <div><p className="text-muted-foreground">Plate</p><p className="text-foreground">{formData.plateNumber ? `${formData.plateNumber} (${formData.plateState})` : '-'}</p></div>
          <div><p className="text-muted-foreground">Tow Reason</p><p className="text-foreground">{formData.towReason.replace(/_/g, ' ')}</p></div>
          <div className="col-span-2"><p className="text-muted-foreground">Tow Location</p><p className="text-foreground">{[formData.towAddress, formData.towCity, formData.towState, formData.towZip].filter(Boolean).join(', ')}</p></div>
          <div><p className="text-muted-foreground">Police Hold</p><p className={cn('font-medium', formData.policeHold ? 'text-danger' : 'text-foreground')}>{formData.policeHold ? `Yes (${formData.holdDays} days)` : 'No'}</p></div>
          <div><p className="text-muted-foreground">Photos</p><p className="text-foreground">{formData.photos.length} captured</p></div>
        </div>
      </CardContent></Card>
      <Card className="bg-surface-muted"><CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Yard Location *</h3>
        <div className="grid grid-cols-6 gap-2">
          {yardLocations.map((loc) => (
            <Toggle key={loc} pressed={formData.yardLocation === loc} onPressedChange={() => updateForm({ yardLocation: loc })}>{loc}</Toggle>
          ))}
        </div>
        <div className="mt-3">
          <Input label="Or enter manually:" placeholder="D-1" value={formData.yardLocation} onChange={(e) => updateForm({ yardLocation: e.target.value.toUpperCase() })} />
        </div>
      </CardContent></Card>
      <div>
        <label className="mb-1 block text-sm font-medium">Intake Notes (optional)</label>
        <Textarea placeholder="Front bumper damage, keys in ignition..." value={formData.notes} onChange={(e) => updateForm({ notes: e.target.value })} />
      </div>
      <Alert variant="default"><AlertDescription><strong>Initial Fees:</strong> Tow Fee ($150) + Admin Fee ($50) = $200.00<br /><span className="text-sm opacity-80">Daily storage begins: {new Date().toLocaleDateString()}</span></AlertDescription></Alert>
    </div>
  );
}
