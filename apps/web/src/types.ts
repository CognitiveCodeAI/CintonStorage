// Enums
export enum VehicleCaseStatus {
  PENDING_INTAKE = 'PENDING_INTAKE',
  INTAKE_COMPLETE = 'INTAKE_COMPLETE',
  STORED = 'STORED',
  HOLD = 'HOLD',
  RELEASE_ELIGIBLE = 'RELEASE_ELIGIBLE',
  RELEASED = 'RELEASED',
  AUCTION_ELIGIBLE = 'AUCTION_ELIGIBLE',
  AUCTION_LISTED = 'AUCTION_LISTED',
  SOLD = 'SOLD',
  DISPOSED = 'DISPOSED',
}

export enum TowReason {
  ABANDONED = 'ABANDONED',
  ACCIDENT = 'ACCIDENT',
  ARREST = 'ARREST',
  ILLEGALLY_PARKED = 'ILLEGALLY_PARKED',
  EVIDENCE = 'EVIDENCE',
  PRIVATE_PROPERTY = 'PRIVATE_PROPERTY',
  REPOSSESSION = 'REPOSSESSION',
  OTHER = 'OTHER',
}

export enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  MOTORCYCLE = 'MOTORCYCLE',
  TRAILER = 'TRAILER',
  RV = 'RV',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER',
}

export enum VehicleClass {
  STANDARD = 'STANDARD',
  LARGE = 'LARGE',
  MOTORCYCLE = 'MOTORCYCLE',
  OVERSIZED = 'OVERSIZED',
  TRAILER = 'TRAILER',
}

// FeeType is now a database entity, not an enum
export interface FeeType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  isCredit: boolean;
  isRecurring: boolean;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// System fee type codes (for reference)
export const SYSTEM_FEE_TYPE_CODES = [
  'TOW',
  'ADMIN',
  'STORAGE_DAILY',
  'GATE',
  'LIEN_PROCESSING',
  'TITLE_SEARCH',
  'NOTICE',
  'DOLLY',
  'WINCH',
  'MILEAGE',
  'STORAGE_OVERRIDE',
  'ADJUSTMENT',
  'PAYMENT',
] as const;

export type SystemFeeTypeCode = typeof SYSTEM_FEE_TYPE_CODES[number];

export enum AgencyType {
  POLICE = 'POLICE',
  SHERIFF = 'SHERIFF',
  STATE_POLICE = 'STATE_POLICE',
  MUNICIPAL = 'MUNICIPAL',
  PRIVATE = 'PRIVATE',
  OTHER = 'OTHER',
}

// Interfaces
export interface VehicleCase {
  id: string;
  caseNumber: string;
  status: VehicleCaseStatus;
  vin: string | null;
  plateNumber: string | null;
  plateState: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  vehicleType: VehicleType;
  vehicleClass: VehicleClass;
  towDate: Date;
  intakeDate: Date | null;
  towReason: TowReason;
  towLocation: string;
  towingAgencyId: string | null;
  yardLocation: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ownerPhone: string | null;
  lienholderName: string | null;
  lienholderAddress: string | null;
  policeHold: boolean;
  holdExpiresAt: Date | null;
  policeCaseNumber: string | null;
  releaseEligibleAt: Date | null;
  releasedAt: Date | null;
  releasedTo: string | null;
  auctionEligibleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
}

export interface VehicleCaseSummary {
  id: string;
  caseNumber: string;
  status: VehicleCaseStatus;
  vin: string | null;
  plateNumber: string | null;
  plateState: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  yardLocation: string | null;
  policeHold: boolean;
  towDate: Date;
  balance: number;
}

export interface FeeLedgerEntry {
  id: string;
  vehicleCaseId: string;
  feeTypeId: string;
  feeType?: FeeType;
  description: string;
  amount: number;
  accrualDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
}

export interface FeeLedgerSummary {
  vehicleCaseId: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  agencyId: string | null;
  active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  agencyType: AgencyType;
  contactEmail: string;
}

export interface DashboardStats {
  totalStored: number;
  readyToRelease: number;
  onHold: number;
  todayRevenue: number;
  pendingIntake: number;
  auctionEligible: number;
}
