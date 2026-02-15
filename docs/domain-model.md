# Domain Model & Database Schema

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Core Entities](#core-entities)
3. [Relationships & Constraints](#relationships--constraints)
4. [Audit Event Structure](#audit-event-structure)
5. [Prisma Schema Reference](#prisma-schema-reference)
6. [Migration Strategy](#migration-strategy)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CORE DOMAIN MODEL                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    Agency    │       │     User     │       │     Role     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │──┐    │ id           │◄──────│ id           │
│ name         │  │    │ email        │       │ name         │
│ oris_code    │  │    │ name         │       │ permissions  │
│ api_key_hash │  │    │ password_hash│       └──────────────┘
│ contact_email│  │    │ role_id      │
│ webhook_url  │  │    │ agency_id    │───────┘
└──────────────┘  │    │ active       │
       │          │    └──────────────┘
       │          │           │
       │          │           │ (created_by, updated_by)
       │          │           ▼
       │          │    ┌──────────────────────────────────────────┐
       │          │    │              VehicleCase                  │
       │          │    ├──────────────────────────────────────────┤
       │          └───▶│ id (UUID)                                │
       │               │ case_number (auto-generated)             │
       │               │ status (enum)                            │
       │               │ vin                                      │
       │               │ plate_number, plate_state                │
       │               │ year, make, model, color                 │
       │               │ vehicle_type, vehicle_class              │
       │               │ tow_date, intake_date                    │
       │               │ tow_reason, tow_location                 │
       │               │ towing_agency_id ─────────────────────────┼──┐
       │               │ yard_location                            │  │
       │               │ owner_name, owner_address, owner_phone   │  │
       │               │ lienholder_name, lienholder_address      │  │
       │               │ police_hold, hold_expires_at             │  │
       │               │ police_case_number                       │  │
       │               │ release_eligible_at                      │  │
       │               │ released_at, released_to                 │  │
       │               │ auction_eligible_at                      │  │
       │               │ vin_decode_data (JSONB)                  │  │
       │               │ metadata (JSONB)                         │  │
       │               │ created_at, updated_at                   │  │
       │               │ created_by_id, updated_by_id             │  │
       │               └────────────────┬─────────────────────────┘  │
       │                                │                            │
       └────────────────────────────────┼────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   FeeLedgerEntry │         │ ComplianceNotice │         │   CaseDocument   │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ id               │         │ id               │         │ id               │
│ vehicle_case_id  │         │ vehicle_case_id  │         │ vehicle_case_id  │
│ fee_type (enum)  │         │ notice_type      │         │ document_type    │
│ description      │         │ recipient_type   │         │ file_path        │
│ amount           │         │ sent_at          │         │ file_hash (SHA256│
│ accrual_date     │         │ sent_method      │         │ mime_type        │
│ due_date         │         │ tracking_number  │         │ file_size        │
│ paid_at          │         │ delivery_status  │         │ metadata (JSONB) │
│ payment_method   │         │ delivered_at     │         │ uploaded_by_id   │
│ receipt_number   │         │ response_due_at  │         │ created_at       │
│ voided_at        │         │ response_received│         └──────────────────┘
│ void_reason      │         │ hearing_requested│
│ created_by_id    │         │ hearing_date     │
└──────────────────┘         │ hearing_result   │
                             │ metadata (JSONB) │
                             │ created_by_id    │
                             └──────────────────┘
                                        │
                                        ▼
                             ┌──────────────────┐
                             │    AuctionLot    │
                             ├──────────────────┤
                             │ id               │
                             │ vehicle_case_id  │
                             │ lot_number       │
                             │ auction_date     │
                             │ minimum_bid      │
                             │ status (enum)    │
                             │ winning_bid      │
                             │ buyer_id         │──────┐
                             │ sale_recorded_at │      │
                             │ title_status     │      │
                             │ payout_completed │      │
                             │ metadata (JSONB) │      │
                             └──────────────────┘      │
                                                       ▼
                                              ┌──────────────────┐
                                              │   AuctionBuyer   │
                                              ├──────────────────┤
                                              │ id               │
                                              │ name             │
                                              │ email            │
                                              │ phone            │
                                              │ address          │
                                              │ tax_id           │
                                              │ verified         │
                                              │ blocked          │
                                              │ created_at       │
                                              └──────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              AUDIT TRAIL                                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              AuditEvent                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (UUID)                                                                   │
│ event_type (enum: CREATE, UPDATE, DELETE, STATUS_CHANGE, ACCESS, etc.)      │
│ entity_type (string: VehicleCase, FeeLedgerEntry, etc.)                     │
│ entity_id (UUID)                                                            │
│ actor_id (UUID, nullable - for system actions)                              │
│ actor_type (enum: USER, SYSTEM, AGENCY_API, WEBHOOK)                        │
│ actor_ip (string)                                                           │
│ changes (JSONB: { field: { old: value, new: value } })                      │
│ metadata (JSONB: additional context)                                        │
│ created_at (timestamp)                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### 1. VehicleCase

The central entity representing an impounded vehicle from intake to disposition.

```typescript
// packages/shared/src/types/vehicle-case.ts

export enum VehicleCaseStatus {
  PENDING_INTAKE = 'PENDING_INTAKE',     // Tow logged, vehicle not yet on lot
  INTAKE_COMPLETE = 'INTAKE_COMPLETE',   // Vehicle on lot, photos taken
  STORED = 'STORED',                     // Active storage, fees accruing
  HOLD = 'HOLD',                         // Police hold active
  RELEASE_ELIGIBLE = 'RELEASE_ELIGIBLE', // Can be released to owner
  RELEASED = 'RELEASED',                 // Released to owner/authorized party
  AUCTION_ELIGIBLE = 'AUCTION_ELIGIBLE', // Met notice requirements for auction
  AUCTION_LISTED = 'AUCTION_LISTED',     // Listed in upcoming auction
  SOLD = 'SOLD',                         // Sold at auction
  DISPOSED = 'DISPOSED',                 // Crushed, salvaged, or transferred
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
  STANDARD = 'STANDARD',      // Cars, small SUVs
  LARGE = 'LARGE',            // Trucks, large SUVs, vans
  MOTORCYCLE = 'MOTORCYCLE',  // Motorcycles, scooters
  OVERSIZED = 'OVERSIZED',    // RVs, commercial vehicles
  TRAILER = 'TRAILER',        // Trailers only
}

export interface VehicleCase {
  id: string;
  caseNumber: string;           // Auto-generated: YY-NNNNN
  status: VehicleCaseStatus;

  // Vehicle identification
  vin: string | null;
  plateNumber: string | null;
  plateState: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  vehicleType: VehicleType;
  vehicleClass: VehicleClass;

  // Tow information
  towDate: Date;
  intakeDate: Date | null;
  towReason: TowReason;
  towLocation: string;
  towingAgencyId: string | null;   // Police/requesting agency
  yardLocation: string | null;     // Lot section/row/spot

  // Owner/lienholder
  ownerName: string | null;
  ownerAddress: string | null;
  ownerPhone: string | null;
  lienholderName: string | null;
  lienholderAddress: string | null;

  // Police/legal
  policeHold: boolean;
  holdExpiresAt: Date | null;
  policeCaseNumber: string | null;

  // Release/auction eligibility
  releaseEligibleAt: Date | null;
  releasedAt: Date | null;
  releasedTo: string | null;
  auctionEligibleAt: Date | null;

  // Decoded VIN data (JSONB)
  vinDecodeData: VinDecodeData | null;

  // Flexible metadata (JSONB)
  metadata: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
}

export interface VinDecodeData {
  decoded: boolean;
  decodedAt: Date;
  source: string;
  data: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    bodyClass?: string;
    driveType?: string;
    fuelType?: string;
    engineSize?: string;
    transmissionType?: string;
    manufacturerName?: string;
    plantCountry?: string;
    vehicleType?: string;
    gvwr?: string;
  };
}
```

### 2. FeeLedgerEntry

Individual fee/charge entries for a vehicle case.

```typescript
// packages/shared/src/types/fee-ledger.ts

export enum FeeType {
  TOW = 'TOW',                         // Initial tow charge
  ADMIN = 'ADMIN',                     // Administrative fee
  STORAGE_DAILY = 'STORAGE_DAILY',     // Daily storage charge
  GATE = 'GATE',                       // After-hours gate fee
  LIEN_PROCESSING = 'LIEN_PROCESSING', // Lien sale processing
  TITLE_SEARCH = 'TITLE_SEARCH',       // Title search fee
  NOTICE = 'NOTICE',                   // Notice mailing fee
  DOLLY = 'DOLLY',                     // Dolly/equipment fee
  WINCH = 'WINCH',                     // Winch-out fee
  MILEAGE = 'MILEAGE',                 // Mileage charges
  STORAGE_OVERRIDE = 'STORAGE_OVERRIDE', // Manual storage adjustment
  ADJUSTMENT = 'ADJUSTMENT',           // General adjustment (credit/debit)
  PAYMENT = 'PAYMENT',                 // Payment received (negative amount)
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MONEY_ORDER = 'MONEY_ORDER',
  CERTIFIED_CHECK = 'CERTIFIED_CHECK',
  ACH = 'ACH',
  AGENCY_VOUCHER = 'AGENCY_VOUCHER',
}

export interface FeeLedgerEntry {
  id: string;
  vehicleCaseId: string;
  feeType: FeeType;
  description: string;
  amount: number;             // Positive = charge, negative = credit/payment
  accrualDate: Date;          // Date the fee accrued (for storage: midnight)
  dueDate: Date | null;
  paidAt: Date | null;
  paymentMethod: PaymentMethod | null;
  receiptNumber: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdById: string;
  createdAt: Date;
}

// Computed view for balance calculation
export interface FeeLedgerSummary {
  vehicleCaseId: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  entriesByType: Record<FeeType, number>;
  lastAccrualDate: Date | null;
  fullyPaid: boolean;
}
```

### 3. ComplianceNotice

Tracking for required compliance notices and hearings.

```typescript
// packages/shared/src/types/compliance-notice.ts

export enum NoticeType {
  OWNER_INITIAL = 'OWNER_INITIAL',           // First notice to registered owner
  OWNER_REMINDER = 'OWNER_REMINDER',         // Follow-up notice
  LIENHOLDER = 'LIENHOLDER',                 // Notice to lienholder
  MDOS_TR52P = 'MDOS_TR52P',                 // Michigan TR-52P filing
  AUCTION_PUBLIC = 'AUCTION_PUBLIC',         // Public auction notice
  HEARING_NOTICE = 'HEARING_NOTICE',         // Notice of hearing
  ABANDONED_VEHICLE = 'ABANDONED_VEHICLE',   // Abandoned vehicle notice
}

export enum RecipientType {
  REGISTERED_OWNER = 'REGISTERED_OWNER',
  LIENHOLDER = 'LIENHOLDER',
  MDOS = 'MDOS',
  PUBLIC = 'PUBLIC',
  OTHER = 'OTHER',
}

export enum SendMethod {
  CERTIFIED_MAIL = 'CERTIFIED_MAIL',
  FIRST_CLASS_MAIL = 'FIRST_CLASS_MAIL',
  EMAIL = 'EMAIL',
  PUBLICATION = 'PUBLICATION',
  ELECTRONIC_FILING = 'ELECTRONIC_FILING',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  UNDELIVERABLE = 'UNDELIVERABLE',
  UNKNOWN = 'UNKNOWN',
}

export enum HearingResult {
  PENDING = 'PENDING',
  OWNER_PREVAILED = 'OWNER_PREVAILED',
  LOT_PREVAILED = 'LOT_PREVAILED',
  DISMISSED = 'DISMISSED',
  NO_SHOW = 'NO_SHOW',
  SETTLED = 'SETTLED',
}

export interface ComplianceNotice {
  id: string;
  vehicleCaseId: string;
  noticeType: NoticeType;
  recipientType: RecipientType;
  recipientName: string | null;
  recipientAddress: string | null;
  sentAt: Date | null;
  sendMethod: SendMethod;
  trackingNumber: string | null;
  deliveryStatus: DeliveryStatus;
  deliveredAt: Date | null;
  responseDueAt: Date | null;
  responseReceived: boolean;
  responseReceivedAt: Date | null;
  hearingRequested: boolean;
  hearingRequestedAt: Date | null;
  hearingDate: Date | null;
  hearingResult: HearingResult | null;
  metadata: Record<string, unknown>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. AuctionLot

Vehicles listed for auction sale.

```typescript
// packages/shared/src/types/auction.ts

export enum AuctionLotStatus {
  PENDING = 'PENDING',           // Awaiting auction date
  LISTED = 'LISTED',             // Published in auction listing
  ACTIVE = 'ACTIVE',             // Auction in progress
  SOLD = 'SOLD',                 // Sold to buyer
  NO_SALE = 'NO_SALE',           // Did not meet reserve/no bids
  WITHDRAWN = 'WITHDRAWN',       // Removed from auction
  TITLE_PENDING = 'TITLE_PENDING', // Sold, awaiting title
  COMPLETED = 'COMPLETED',       // Sale fully completed
}

export enum TitleStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  ISSUED = 'ISSUED',
  TRANSFERRED = 'TRANSFERRED',
  BONDED = 'BONDED',
}

export interface AuctionLot {
  id: string;
  vehicleCaseId: string;
  lotNumber: string;            // Auction lot number
  auctionDate: Date;
  minimumBid: number;
  status: AuctionLotStatus;
  winningBid: number | null;
  buyerId: string | null;
  saleRecordedAt: Date | null;
  titleStatus: TitleStatus;
  payoutCompleted: boolean;
  payoutCompletedAt: Date | null;
  metadata: Record<string, unknown>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuctionBuyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  blocked: boolean;
  blockedReason: string | null;
  purchaseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Payout waterfall calculation
export interface PayoutWaterfall {
  saleAmount: number;
  auctionFee: number;           // Lot's auction fee
  storageOwed: number;          // Outstanding storage
  towingOwed: number;           // Outstanding tow fees
  adminOwed: number;            // Outstanding admin fees
  lienholderPayment: number;    // Amount to lienholder (if any)
  netToState: number;           // Remainder to state (after all liens)
}
```

### 5. User & Role

Authentication and authorization entities.

```typescript
// packages/shared/src/types/user.ts

export enum Permission {
  // Vehicle Cases
  CASE_VIEW = 'CASE_VIEW',
  CASE_CREATE = 'CASE_CREATE',
  CASE_UPDATE = 'CASE_UPDATE',
  CASE_DELETE = 'CASE_DELETE',
  CASE_RELEASE = 'CASE_RELEASE',

  // Fees
  FEE_VIEW = 'FEE_VIEW',
  FEE_CREATE = 'FEE_CREATE',
  FEE_VOID = 'FEE_VOID',
  PAYMENT_RECORD = 'PAYMENT_RECORD',

  // Compliance
  NOTICE_VIEW = 'NOTICE_VIEW',
  NOTICE_CREATE = 'NOTICE_CREATE',
  NOTICE_UPDATE = 'NOTICE_UPDATE',
  HEARING_MANAGE = 'HEARING_MANAGE',

  // Auction
  AUCTION_VIEW = 'AUCTION_VIEW',
  AUCTION_MANAGE = 'AUCTION_MANAGE',
  AUCTION_SELL = 'AUCTION_SELL',

  // Documents
  DOCUMENT_VIEW = 'DOCUMENT_VIEW',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE = 'DOCUMENT_DELETE',

  // Reports
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_EXPORT = 'REPORT_EXPORT',

  // Admin
  USER_MANAGE = 'USER_MANAGE',
  ROLE_MANAGE = 'ROLE_MANAGE',
  AGENCY_MANAGE = 'AGENCY_MANAGE',
  POLICY_MANAGE = 'POLICY_MANAGE',
  AUDIT_VIEW = 'AUDIT_VIEW',
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;           // Cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  roleId: string;
  role?: Role;
  agencyId: string | null;     // For agency-specific users
  active: boolean;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Pre-defined system roles
export const SYSTEM_ROLES = {
  ADMIN: {
    name: 'Administrator',
    permissions: Object.values(Permission),
  },
  MANAGER: {
    name: 'Manager',
    permissions: [
      Permission.CASE_VIEW, Permission.CASE_CREATE, Permission.CASE_UPDATE,
      Permission.CASE_RELEASE, Permission.FEE_VIEW, Permission.FEE_CREATE,
      Permission.FEE_VOID, Permission.PAYMENT_RECORD, Permission.NOTICE_VIEW,
      Permission.NOTICE_CREATE, Permission.NOTICE_UPDATE, Permission.HEARING_MANAGE,
      Permission.AUCTION_VIEW, Permission.AUCTION_MANAGE, Permission.DOCUMENT_VIEW,
      Permission.DOCUMENT_UPLOAD, Permission.REPORT_VIEW, Permission.REPORT_EXPORT,
      Permission.AUDIT_VIEW,
    ],
  },
  CASHIER: {
    name: 'Cashier',
    permissions: [
      Permission.CASE_VIEW, Permission.CASE_RELEASE, Permission.FEE_VIEW,
      Permission.FEE_CREATE, Permission.PAYMENT_RECORD, Permission.NOTICE_VIEW,
      Permission.DOCUMENT_VIEW, Permission.DOCUMENT_UPLOAD, Permission.REPORT_VIEW,
    ],
  },
  YARD_OPERATOR: {
    name: 'Yard Operator',
    permissions: [
      Permission.CASE_VIEW, Permission.CASE_CREATE, Permission.CASE_UPDATE,
      Permission.DOCUMENT_VIEW, Permission.DOCUMENT_UPLOAD,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      Permission.CASE_VIEW, Permission.FEE_VIEW, Permission.NOTICE_VIEW,
      Permission.AUCTION_VIEW, Permission.DOCUMENT_VIEW, Permission.REPORT_VIEW,
    ],
  },
} as const;
```

### 6. Agency

Police departments and other agencies that interface with the system.

```typescript
// packages/shared/src/types/agency.ts

export interface Agency {
  id: string;
  name: string;
  orisCode: string | null;      // ORI code for police agencies
  agencyType: AgencyType;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;

  // API access
  apiKeyHash: string | null;
  apiEnabled: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;

  // OAuth clients (if using OAuth)
  oauthClientId: string | null;
  oauthClientSecretHash: string | null;

  // Settings
  defaultHoldDays: number;      // Default police hold duration
  autoNotifyOnIntake: boolean;
  autoNotifyOnRelease: boolean;

  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgencyType {
  POLICE = 'POLICE',
  SHERIFF = 'SHERIFF',
  STATE_POLICE = 'STATE_POLICE',
  MUNICIPAL = 'MUNICIPAL',
  PRIVATE = 'PRIVATE',
  OTHER = 'OTHER',
}
```

### 7. CaseDocument

Files and photos attached to cases.

```typescript
// packages/shared/src/types/document.ts

export enum DocumentType {
  INTAKE_PHOTO = 'INTAKE_PHOTO',
  DAMAGE_PHOTO = 'DAMAGE_PHOTO',
  VIN_PHOTO = 'VIN_PHOTO',
  PLATE_PHOTO = 'PLATE_PHOTO',
  ODOMETER_PHOTO = 'ODOMETER_PHOTO',
  RELEASE_PHOTO = 'RELEASE_PHOTO',
  TOW_RECEIPT = 'TOW_RECEIPT',
  POLICE_REPORT = 'POLICE_REPORT',
  TITLE_DOCUMENT = 'TITLE_DOCUMENT',
  REGISTRATION = 'REGISTRATION',
  INSURANCE = 'INSURANCE',
  RELEASE_AUTHORIZATION = 'RELEASE_AUTHORIZATION',
  HEARING_DOCUMENT = 'HEARING_DOCUMENT',
  NOTICE_COPY = 'NOTICE_COPY',
  CERTIFIED_MAIL_RECEIPT = 'CERTIFIED_MAIL_RECEIPT',
  OTHER = 'OTHER',
}

export interface CaseDocument {
  id: string;
  vehicleCaseId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;             // S3 key
  fileHash: string;             // SHA-256 hash
  mimeType: string;
  fileSize: number;             // bytes
  metadata: {
    originalName?: string;
    capturedAt?: Date;
    location?: { lat: number; lng: number };
    deviceInfo?: string;
    description?: string;
  };
  uploadedById: string;
  createdAt: Date;
}
```

### 8. PolicyConfig

Configurable policies for compliance timelines and fees.

```typescript
// packages/shared/src/types/policy.ts

export interface PolicyConfig {
  id: string;
  policyType: PolicyType;
  name: string;
  description: string;
  config: PolicyConfigData;
  effectiveFrom: Date;
  effectiveTo: Date | null;     // null = current
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PolicyType {
  FEE_SCHEDULE = 'FEE_SCHEDULE',
  COMPLIANCE_TIMELINE = 'COMPLIANCE_TIMELINE',
  HOLD_DURATION = 'HOLD_DURATION',
  AUCTION_RULES = 'AUCTION_RULES',
}

// Fee schedule configuration
export interface FeeScheduleConfig {
  towFees: {
    standard: number;
    large: number;
    motorcycle: number;
    oversized: number;
  };
  dailyStorage: {
    standard: number;
    large: number;
    motorcycle: number;
    oversized: number;
  };
  adminFee: number;
  gateFee: number;
  lienProcessingFee: number;
  titleSearchFee: number;
  noticeFee: number;
  gracePeriodDays: number;      // Days before storage starts
}

// Compliance timeline configuration (Michigan-specific by default)
export interface ComplianceTimelineConfig {
  ownerNoticeDeadlineDays: number;      // Days after intake to send notice
  ownerResponseDeadlineDays: number;    // Days owner has to respond
  lienholderNoticeDeadlineDays: number; // Days to notify lienholder
  mdosFilingDeadlineDays: number;       // Days to file TR-52P
  hearingRequestDeadlineDays: number;   // Days to request hearing
  auctionNoticeDeadlineDays: number;    // Days before auction to notify
  minimumStorageDaysForAuction: number; // Min days before auction eligible
}

export type PolicyConfigData =
  | { type: 'FEE_SCHEDULE'; data: FeeScheduleConfig }
  | { type: 'COMPLIANCE_TIMELINE'; data: ComplianceTimelineConfig };
```

---

## Relationships & Constraints

### Database Constraints

```sql
-- Case number uniqueness and format
ALTER TABLE vehicle_cases
ADD CONSTRAINT case_number_format
CHECK (case_number ~ '^[0-9]{2}-[0-9]{5}$');

-- VIN format validation (17 characters, no I, O, Q)
ALTER TABLE vehicle_cases
ADD CONSTRAINT vin_format
CHECK (vin IS NULL OR (LENGTH(vin) = 17 AND vin ~ '^[A-HJ-NPR-Z0-9]{17}$'));

-- Fee amounts must be non-zero
ALTER TABLE fee_ledger_entries
ADD CONSTRAINT amount_non_zero
CHECK (amount <> 0);

-- Status transitions (enforced by application, documented here)
COMMENT ON COLUMN vehicle_cases.status IS
'Valid transitions:
  PENDING_INTAKE -> INTAKE_COMPLETE
  INTAKE_COMPLETE -> STORED
  STORED -> HOLD | RELEASE_ELIGIBLE | AUCTION_ELIGIBLE
  HOLD -> STORED | RELEASE_ELIGIBLE
  RELEASE_ELIGIBLE -> RELEASED | STORED
  AUCTION_ELIGIBLE -> AUCTION_LISTED | RELEASE_ELIGIBLE
  AUCTION_LISTED -> SOLD | NO_SALE
  SOLD -> DISPOSED
  NO_SALE -> AUCTION_LISTED | DISPOSED';

-- Referential integrity
ALTER TABLE vehicle_cases
ADD CONSTRAINT fk_towing_agency
FOREIGN KEY (towing_agency_id) REFERENCES agencies(id);

ALTER TABLE vehicle_cases
ADD CONSTRAINT fk_created_by
FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE fee_ledger_entries
ADD CONSTRAINT fk_vehicle_case
FOREIGN KEY (vehicle_case_id) REFERENCES vehicle_cases(id) ON DELETE CASCADE;

-- Indexes for common queries
CREATE INDEX idx_vehicle_cases_status ON vehicle_cases(status);
CREATE INDEX idx_vehicle_cases_vin ON vehicle_cases(vin);
CREATE INDEX idx_vehicle_cases_plate ON vehicle_cases(plate_number, plate_state);
CREATE INDEX idx_vehicle_cases_tow_date ON vehicle_cases(tow_date);
CREATE INDEX idx_vehicle_cases_case_number ON vehicle_cases(case_number);
CREATE INDEX idx_fee_ledger_entries_case ON fee_ledger_entries(vehicle_case_id);
CREATE INDEX idx_fee_ledger_entries_accrual ON fee_ledger_entries(accrual_date);
CREATE INDEX idx_compliance_notices_case ON compliance_notices(vehicle_case_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(created_at);
```

### Cascade Rules

| Parent | Child | On Delete | On Update |
|--------|-------|-----------|-----------|
| VehicleCase | FeeLedgerEntry | CASCADE | CASCADE |
| VehicleCase | ComplianceNotice | CASCADE | CASCADE |
| VehicleCase | CaseDocument | CASCADE | CASCADE |
| VehicleCase | AuctionLot | RESTRICT | CASCADE |
| User | VehicleCase (created_by) | RESTRICT | CASCADE |
| Agency | VehicleCase | SET NULL | CASCADE |
| Role | User | RESTRICT | CASCADE |
| AuctionBuyer | AuctionLot | SET NULL | CASCADE |

---

## Audit Event Structure

### Event Types

```typescript
export enum AuditEventType {
  // CRUD operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Status changes
  STATUS_CHANGE = 'STATUS_CHANGE',

  // Access events
  VIEW = 'VIEW',
  SEARCH = 'SEARCH',
  EXPORT = 'EXPORT',

  // Business events
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  FEE_ACCRUED = 'FEE_ACCRUED',
  NOTICE_SENT = 'NOTICE_SENT',
  HOLD_PLACED = 'HOLD_PLACED',
  HOLD_RELEASED = 'HOLD_RELEASED',
  VEHICLE_RELEASED = 'VEHICLE_RELEASED',
  AUCTION_LISTED = 'AUCTION_LISTED',
  AUCTION_SOLD = 'AUCTION_SOLD',

  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // API events
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  WEBHOOK_SENT = 'WEBHOOK_SENT',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
}

export enum ActorType {
  USER = 'USER',           // Staff user
  SYSTEM = 'SYSTEM',       // Automated job
  AGENCY_API = 'AGENCY_API', // Agency API call
  WEBHOOK = 'WEBHOOK',     // Incoming webhook
  PUBLIC = 'PUBLIC',       // Public API (auction listing)
}
```

### Audit Entry Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "STATUS_CHANGE",
  "entityType": "VehicleCase",
  "entityId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "actorId": "123e4567-e89b-12d3-a456-426614174000",
  "actorType": "USER",
  "actorIp": "192.168.1.100",
  "changes": {
    "status": {
      "old": "STORED",
      "new": "RELEASED"
    },
    "releasedAt": {
      "old": null,
      "new": "2026-02-14T15:30:00Z"
    },
    "releasedTo": {
      "old": null,
      "new": "John Smith (owner)"
    }
  },
  "metadata": {
    "releaseType": "OWNER_PICKUP",
    "paymentReceiptId": "RCP-2026-00042",
    "identificationVerified": true
  },
  "createdAt": "2026-02-14T15:30:00Z"
}
```

---

## Prisma Schema Reference

The complete Prisma schema is located at [`schema/prisma.schema`](../schema/prisma.schema).

Key features:
- UUID primary keys for all entities
- Timestamps with timezone support
- JSONB fields for flexible data
- Enum types for all status/type fields
- Proper indexing for query performance
- Cascade delete rules as specified

---

## Migration Strategy

### Initial Migration

```bash
# Generate initial migration
pnpm prisma migrate dev --name init

# Apply to production
pnpm prisma migrate deploy
```

### Migration Naming Convention

```
YYYYMMDDHHMMSS_description_of_change
```

Examples:
- `20260214120000_init`
- `20260215093000_add_agency_webhook_fields`
- `20260216140000_add_fee_type_dolly`

### Data Migration Guidelines

1. **Additive Changes**: Add new columns as nullable first, backfill, then add NOT NULL
2. **Enum Extensions**: Add new values to end of enum to avoid reindexing
3. **Index Changes**: Create indexes concurrently in production
4. **Rollback Plan**: Always have a rollback migration ready

### Seed Data

Development seed data includes:
- Default policy configurations (Michigan compliance)
- System roles and permissions
- Test agencies (Clinton Township PD, etc.)
- Sample vehicle cases in various statuses
- Test users for each role

See `packages/db/prisma/seed.ts` for implementation.
