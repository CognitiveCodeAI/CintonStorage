# Compliance & Policy Engine

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Overview](#overview)
2. [Michigan Abandoned Vehicle Rules](#michigan-abandoned-vehicle-rules)
3. [Configurable Policy Engine](#configurable-policy-engine)
4. [Notice Tracking System](#notice-tracking-system)
5. [Hearing/Contest Workflow](#hearingcontest-workflow)
6. [Compliance Checklist Generator](#compliance-checklist-generator)
7. [Implementation Guide](#implementation-guide)

---

## Overview

The Compliance & Policy Engine ensures that all vehicle dispositions meet Michigan statutory requirements while allowing configurable timelines and policies. **Critical**: Compliance timelines and rules must never be hardcoded—they are stored in the PolicyConfig table and can be updated as regulations change.

### Design Principles

1. **Configurable, Not Hardcoded**: All deadlines, fees, and rules come from database config
2. **Audit Trail**: Every compliance action is logged with timestamps
3. **Proactive Alerts**: System warns before deadlines, not after
4. **Documentation**: Generate printable compliance packets for legal defense
5. **MCL References**: Each rule references the specific statute

---

## Michigan Abandoned Vehicle Rules

### Statutory Framework

The Michigan Vehicle Code (MCL 257) governs abandoned vehicle procedures. Key sections:

| Section | Title | Summary |
|---------|-------|---------|
| MCL 257.252 | Definitions | Defines "abandoned vehicle" |
| MCL 257.252a | Notice to Owner | Requirements for owner notification |
| MCL 257.252b | Secretary of State Filing | TR-52P filing requirements |
| MCL 257.252c | Disposal Procedures | How vehicles may be disposed |
| MCL 257.252d | Hearing Rights | Owner's right to contest |
| MCL 257.252e | Public Auction | Requirements for public sale |
| MCL 257.252f | Title Transfer | How title passes to buyer |

### Key Compliance Timelines (Default Configuration)

> **Note**: These are default values loaded into PolicyConfig. Actual values should be verified against current MCL and updated as needed.

| Event | Deadline | MCL Reference | Configurable Key |
|-------|----------|---------------|------------------|
| Send owner notice | Within 7 days of intake | 257.252a(1) | `ownerNoticeDeadlineDays` |
| Send lienholder notice | Within 7 days of intake | 257.252a(2) | `lienholderNoticeDeadlineDays` |
| File TR-52P with MDOS | Within 7 days of intake | 257.252b | `mdosFilingDeadlineDays` |
| Owner response period | 20 days from notice | 257.252a(3) | `ownerResponseDeadlineDays` |
| Hearing request period | 20 days from notice | 257.252d(1) | `hearingRequestDeadlineDays` |
| Public auction notice | 5 days before auction | 257.252e(1) | `auctionNoticeDeadlineDays` |
| Minimum storage before auction | 30 days | 257.252c | `minimumStorageDaysForAuction` |

### TR-52P Form Requirements

The Michigan Department of State TR-52P form must include:

```typescript
interface TR52PFormData {
  // Towing company info
  towingCompanyName: string;
  towingCompanyAddress: string;
  towingCompanyPhone: string;
  towingCompanyLicense: string;

  // Vehicle info
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  plateNumber: string | null;
  plateState: string | null;
  color: string | null;

  // Tow info
  towDate: Date;
  towLocation: string;
  towReason: string;
  requestingAgency: string | null;

  // Owner info (if known)
  ownerName: string | null;
  ownerAddress: string | null;

  // Lienholder info (if known)
  lienholderName: string | null;
  lienholderAddress: string | null;

  // Storage location
  storageFacilityName: string;
  storageFacilityAddress: string;

  // Declaration
  signatureDate: Date;
  signatoryName: string;
  signatoryTitle: string;
}
```

---

## Configurable Policy Engine

### Policy Configuration Schema

```typescript
// packages/shared/src/types/policy.ts

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  config: CompliancePolicyConfig;
  mclReferences: MCLReference[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompliancePolicyConfig {
  // Notice deadlines (days from intake)
  ownerNoticeDeadlineDays: number;
  lienholderNoticeDeadlineDays: number;
  mdosFilingDeadlineDays: number;

  // Response periods (days from notice sent)
  ownerResponseDeadlineDays: number;
  hearingRequestDeadlineDays: number;

  // Auction requirements
  auctionNoticeDeadlineDays: number;  // Days before auction
  minimumStorageDaysForAuction: number;
  auctionPublicationRequired: boolean;
  auctionPublicationDays: number;

  // Hold policies
  defaultPoliceHoldDays: number;
  maxPoliceHoldDays: number;
  holdExtensionAllowed: boolean;
  maxHoldExtensions: number;

  // Special rules
  lowValueThreshold: number;          // Below this, simplified disposal
  highValueThreshold: number;         // Above this, additional notices
  motorcycleRulesApply: boolean;
  commercialVehicleRulesApply: boolean;
}

export interface MCLReference {
  section: string;           // e.g., "257.252a"
  title: string;
  summary: string;
  url: string;               // Link to legislature.mi.gov
  lastVerified: Date;
}

// Default Michigan policy
export const DEFAULT_MICHIGAN_POLICY: CompliancePolicyConfig = {
  ownerNoticeDeadlineDays: 7,
  lienholderNoticeDeadlineDays: 7,
  mdosFilingDeadlineDays: 7,
  ownerResponseDeadlineDays: 20,
  hearingRequestDeadlineDays: 20,
  auctionNoticeDeadlineDays: 5,
  minimumStorageDaysForAuction: 30,
  auctionPublicationRequired: true,
  auctionPublicationDays: 5,
  defaultPoliceHoldDays: 14,
  maxPoliceHoldDays: 90,
  holdExtensionAllowed: true,
  maxHoldExtensions: 3,
  lowValueThreshold: 500,
  highValueThreshold: 10000,
  motorcycleRulesApply: true,
  commercialVehicleRulesApply: true,
};
```

### Fee Schedule Configuration

```typescript
export interface FeeScheduleConfig {
  // Effective dates
  effectiveFrom: Date;
  effectiveTo: Date | null;

  // Tow fees by vehicle class
  towFees: {
    standard: number;    // Cars, small SUVs
    large: number;       // Trucks, large SUVs
    motorcycle: number;  // Motorcycles, scooters
    oversized: number;   // RVs, commercial
    trailer: number;     // Trailers
  };

  // Daily storage fees by vehicle class
  dailyStorageFees: {
    standard: number;
    large: number;
    motorcycle: number;
    oversized: number;
    trailer: number;
  };

  // Fixed fees
  adminFee: number;
  gateFee: number;              // After-hours release
  lienProcessingFee: number;
  titleSearchFee: number;
  noticeMailingFee: number;

  // Mileage-based fees
  mileageRate: number;          // Per mile for tow
  minimumMileageCharge: number;

  // Additional services
  dollyFee: number;
  winchFee: number;
  fuelFee: number;
  jumpStartFee: number;
  lockoutFee: number;

  // Storage rules
  storageBeginsAfterDays: number;  // Grace period (usually 0)
  storageCapDays: number | null;   // Max days before sale required
}

// Default Michigan fee schedule (2026)
export const DEFAULT_FEE_SCHEDULE: FeeScheduleConfig = {
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: null,

  towFees: {
    standard: 150.00,
    large: 200.00,
    motorcycle: 100.00,
    oversized: 350.00,
    trailer: 125.00,
  },

  dailyStorageFees: {
    standard: 45.00,
    large: 55.00,
    motorcycle: 25.00,
    oversized: 75.00,
    trailer: 35.00,
  },

  adminFee: 50.00,
  gateFee: 75.00,
  lienProcessingFee: 100.00,
  titleSearchFee: 25.00,
  noticeMailingFee: 15.00,

  mileageRate: 5.00,
  minimumMileageCharge: 0,

  dollyFee: 50.00,
  winchFee: 75.00,
  fuelFee: 25.00,
  jumpStartFee: 35.00,
  lockoutFee: 45.00,

  storageBeginsAfterDays: 0,
  storageCapDays: null,
};
```

### Policy Loading Service

```typescript
// apps/api/src/services/policyService.ts

import { PrismaClient } from '@prisma/client';
import { CompliancePolicy, FeeScheduleConfig } from '@cinton/shared';
import { addDays } from 'date-fns';

export class PolicyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get the currently effective compliance policy
   */
  async getCurrentCompliancePolicy(): Promise<CompliancePolicy> {
    const now = new Date();

    const policy = await this.prisma.policyConfig.findFirst({
      where: {
        policyType: 'COMPLIANCE_TIMELINE',
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!policy) {
      throw new Error('No active compliance policy found');
    }

    return policy as CompliancePolicy;
  }

  /**
   * Get the currently effective fee schedule
   */
  async getCurrentFeeSchedule(): Promise<FeeScheduleConfig> {
    const now = new Date();

    const policy = await this.prisma.policyConfig.findFirst({
      where: {
        policyType: 'FEE_SCHEDULE',
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!policy) {
      throw new Error('No active fee schedule found');
    }

    return policy.config as FeeScheduleConfig;
  }

  /**
   * Calculate compliance deadlines for a case
   */
  async calculateDeadlines(intakeDate: Date): Promise<ComplianceDeadlines> {
    const policy = await this.getCurrentCompliancePolicy();
    const config = policy.config;

    return {
      ownerNoticeDue: addDays(intakeDate, config.ownerNoticeDeadlineDays),
      lienholderNoticeDue: addDays(intakeDate, config.lienholderNoticeDeadlineDays),
      mdosFilingDue: addDays(intakeDate, config.mdosFilingDeadlineDays),
      auctionEligibleDate: addDays(intakeDate, config.minimumStorageDaysForAuction),
    };
  }

  /**
   * Check if a case is compliant for auction
   */
  async checkAuctionEligibility(caseId: string): Promise<AuctionEligibility> {
    const policy = await this.getCurrentCompliancePolicy();
    const vehicleCase = await this.prisma.vehicleCase.findUnique({
      where: { id: caseId },
      include: { complianceNotices: true },
    });

    if (!vehicleCase) {
      throw new Error('Case not found');
    }

    const checks: EligibilityCheck[] = [];
    const config = policy.config;

    // Check minimum storage days
    const storageDays = differenceInDays(new Date(), vehicleCase.intakeDate);
    checks.push({
      requirement: 'Minimum storage period',
      met: storageDays >= config.minimumStorageDaysForAuction,
      detail: `${storageDays} of ${config.minimumStorageDaysForAuction} days`,
      mclReference: 'MCL 257.252c',
    });

    // Check owner notice sent
    const ownerNotice = vehicleCase.complianceNotices.find(
      n => n.noticeType === 'OWNER_INITIAL' && n.sentAt
    );
    checks.push({
      requirement: 'Owner notice sent',
      met: !!ownerNotice,
      detail: ownerNotice ? `Sent ${formatDate(ownerNotice.sentAt)}` : 'Not sent',
      mclReference: 'MCL 257.252a(1)',
    });

    // Check owner response period expired
    if (ownerNotice) {
      const responseDue = addDays(ownerNotice.sentAt, config.ownerResponseDeadlineDays);
      checks.push({
        requirement: 'Owner response period expired',
        met: new Date() > responseDue,
        detail: `Response due by ${formatDate(responseDue)}`,
        mclReference: 'MCL 257.252a(3)',
      });
    }

    // Check no active hearing
    const activeHearing = vehicleCase.complianceNotices.find(
      n => n.hearingRequested && !n.hearingResult
    );
    checks.push({
      requirement: 'No pending hearing',
      met: !activeHearing,
      detail: activeHearing ? 'Hearing pending' : 'No hearing requested',
      mclReference: 'MCL 257.252d',
    });

    // Check TR-52P filed
    const tr52p = vehicleCase.complianceNotices.find(
      n => n.noticeType === 'MDOS_TR52P' && n.sentAt
    );
    checks.push({
      requirement: 'TR-52P filed with MDOS',
      met: !!tr52p,
      detail: tr52p ? `Filed ${formatDate(tr52p.sentAt)}` : 'Not filed',
      mclReference: 'MCL 257.252b',
    });

    // Check no police hold
    checks.push({
      requirement: 'No active police hold',
      met: !vehicleCase.policeHold,
      detail: vehicleCase.policeHold
        ? `Hold expires ${formatDate(vehicleCase.holdExpiresAt)}`
        : 'No hold',
      mclReference: 'N/A',
    });

    const eligible = checks.every(c => c.met);

    return {
      eligible,
      checks,
      nextActionDate: eligible ? null : this.calculateNextActionDate(checks),
    };
  }

  private calculateNextActionDate(checks: EligibilityCheck[]): Date | null {
    // Find the earliest date that a requirement will be met
    // This is complex logic that depends on the specific requirements
    return null; // Simplified
  }
}

interface ComplianceDeadlines {
  ownerNoticeDue: Date;
  lienholderNoticeDue: Date;
  mdosFilingDue: Date;
  auctionEligibleDate: Date;
}

interface EligibilityCheck {
  requirement: string;
  met: boolean;
  detail: string;
  mclReference: string;
}

interface AuctionEligibility {
  eligible: boolean;
  checks: EligibilityCheck[];
  nextActionDate: Date | null;
}
```

---

## Notice Tracking System

### Notice Types

```typescript
export enum NoticeType {
  // Required notices
  OWNER_INITIAL = 'OWNER_INITIAL',       // First notice to registered owner
  OWNER_REMINDER = 'OWNER_REMINDER',     // Follow-up (optional)
  LIENHOLDER = 'LIENHOLDER',             // Notice to lienholder
  MDOS_TR52P = 'MDOS_TR52P',             // Filing with Secretary of State

  // Auction notices
  AUCTION_PUBLIC = 'AUCTION_PUBLIC',     // Public notice of auction
  AUCTION_DIRECT = 'AUCTION_DIRECT',     // Direct notice to known parties

  // Hearing notices
  HEARING_NOTICE = 'HEARING_NOTICE',     // Notice of scheduled hearing
  HEARING_RESULT = 'HEARING_RESULT',     // Hearing outcome notification

  // Special notices
  HIGH_VALUE = 'HIGH_VALUE',             // Additional notice for high-value vehicles
  COMMERCIAL = 'COMMERCIAL',             // Special notice for commercial vehicles
}
```

### Notice Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTICE WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Vehicle Intake
       │
       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    NOTICE GENERATION TRIGGERED                          │
  │                    (Within 7 days per MCL 257.252a)                     │
  └─────────────────────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────┬─────────────────────────────┐
       ▼                             ▼                             ▼
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │   Owner     │             │ Lienholder  │             │  TR-52P     │
  │   Notice    │             │   Notice    │             │  Filing     │
  └──────┬──────┘             └──────┬──────┘             └──────┬──────┘
         │                           │                           │
         ▼                           ▼                           ▼
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │  Certified  │             │  Certified  │             │ Electronic  │
  │    Mail     │             │    Mail     │             │   Filing    │
  └──────┬──────┘             └──────┬──────┘             └──────┬──────┘
         │                           │                           │
         ▼                           ▼                           ▼
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │  Track      │             │  Track      │             │  Confirm    │
  │  Delivery   │             │  Delivery   │             │  Receipt    │
  └──────┬──────┘             └──────┬──────┘             └──────┬──────┘
         │                           │                           │
         ▼                           ▼                           ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    WAIT FOR RESPONSE PERIOD                             │
  │                    (20 days per MCL 257.252a)                           │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         ├─── Response Received ───▶ Process Response
         │
         └─── No Response ───▶ Eligible for Disposition
```

### Notice Generation Service

```typescript
// apps/api/src/services/noticeService.ts

import { PrismaClient } from '@prisma/client';
import { NoticeType, SendMethod, RecipientType } from '@cinton/shared';

export class NoticeService {
  constructor(
    private prisma: PrismaClient,
    private pdfService: PdfService,
    private mailingService: MailingService,
  ) {}

  /**
   * Generate and send owner notice
   */
  async sendOwnerNotice(caseId: string): Promise<ComplianceNotice> {
    const vehicleCase = await this.prisma.vehicleCase.findUnique({
      where: { id: caseId },
    });

    if (!vehicleCase) {
      throw new Error('Case not found');
    }

    // Check if notice already sent
    const existing = await this.prisma.complianceNotice.findFirst({
      where: {
        vehicleCaseId: caseId,
        noticeType: NoticeType.OWNER_INITIAL,
        sentAt: { not: null },
      },
    });

    if (existing) {
      throw new Error('Owner notice already sent');
    }

    // Generate notice PDF
    const pdfContent = await this.pdfService.generateOwnerNotice(vehicleCase);

    // Create notice record
    const notice = await this.prisma.complianceNotice.create({
      data: {
        vehicleCaseId: caseId,
        noticeType: NoticeType.OWNER_INITIAL,
        recipientType: RecipientType.REGISTERED_OWNER,
        recipientName: vehicleCase.ownerName,
        recipientAddress: vehicleCase.ownerAddress,
        sendMethod: SendMethod.CERTIFIED_MAIL,
      },
    });

    // Queue for mailing
    if (vehicleCase.ownerAddress) {
      const tracking = await this.mailingService.sendCertifiedMail({
        recipientName: vehicleCase.ownerName,
        recipientAddress: vehicleCase.ownerAddress,
        pdfContent,
        returnReceiptRequested: true,
      });

      // Update notice with tracking
      await this.prisma.complianceNotice.update({
        where: { id: notice.id },
        data: {
          sentAt: new Date(),
          trackingNumber: tracking.trackingNumber,
          deliveryStatus: 'SENT',
          responseDueAt: addDays(new Date(), 20), // From policy
        },
      });
    }

    return notice;
  }

  /**
   * Generate TR-52P form and submit to MDOS
   */
  async fileTR52P(caseId: string): Promise<ComplianceNotice> {
    const vehicleCase = await this.prisma.vehicleCase.findUnique({
      where: { id: caseId },
      include: { towingAgency: true },
    });

    if (!vehicleCase) {
      throw new Error('Case not found');
    }

    // Generate TR-52P form data
    const formData = this.buildTR52PData(vehicleCase);

    // Create notice record
    const notice = await this.prisma.complianceNotice.create({
      data: {
        vehicleCaseId: caseId,
        noticeType: NoticeType.MDOS_TR52P,
        recipientType: RecipientType.MDOS,
        sendMethod: SendMethod.ELECTRONIC_FILING,
        metadata: { formData },
      },
    });

    // Submit electronically (or queue for manual submission)
    try {
      const confirmation = await this.mdosService.submitTR52P(formData);

      await this.prisma.complianceNotice.update({
        where: { id: notice.id },
        data: {
          sentAt: new Date(),
          trackingNumber: confirmation.confirmationNumber,
          deliveryStatus: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      // Queue for manual submission
      await this.prisma.complianceNotice.update({
        where: { id: notice.id },
        data: {
          deliveryStatus: 'PENDING',
          metadata: {
            ...notice.metadata,
            electronicSubmissionFailed: true,
            error: error.message,
          },
        },
      });
    }

    return notice;
  }

  /**
   * Update delivery status from tracking
   */
  async updateDeliveryStatus(
    noticeId: string,
    status: DeliveryStatus,
    deliveredAt?: Date,
  ): Promise<void> {
    await this.prisma.complianceNotice.update({
      where: { id: noticeId },
      data: {
        deliveryStatus: status,
        deliveredAt: deliveredAt || (status === 'DELIVERED' ? new Date() : null),
      },
    });

    // Log audit event
    await this.auditService.log({
      eventType: 'NOTICE_DELIVERY_UPDATE',
      entityType: 'ComplianceNotice',
      entityId: noticeId,
      changes: { deliveryStatus: status },
    });
  }

  private buildTR52PData(vehicleCase: VehicleCase): TR52PFormData {
    return {
      towingCompanyName: 'Cinton Storage',
      towingCompanyAddress: '12345 Gratiot Ave, Clinton Twp, MI 48035',
      towingCompanyPhone: '(586) 555-0100',
      towingCompanyLicense: 'MI-TOW-12345',
      vin: vehicleCase.vin,
      year: vehicleCase.year,
      make: vehicleCase.make,
      model: vehicleCase.model,
      plateNumber: vehicleCase.plateNumber,
      plateState: vehicleCase.plateState,
      color: vehicleCase.color,
      towDate: vehicleCase.towDate,
      towLocation: vehicleCase.towLocation,
      towReason: vehicleCase.towReason,
      requestingAgency: vehicleCase.towingAgency?.name,
      ownerName: vehicleCase.ownerName,
      ownerAddress: vehicleCase.ownerAddress,
      lienholderName: vehicleCase.lienholderName,
      lienholderAddress: vehicleCase.lienholderAddress,
      storageFacilityName: 'Cinton Storage',
      storageFacilityAddress: '12345 Gratiot Ave, Clinton Twp, MI 48035',
      signatureDate: new Date(),
      signatoryName: 'System Generated',
      signatoryTitle: 'Facility Manager',
    };
  }
}
```

---

## Hearing/Contest Workflow

### Hearing Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HEARING WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Owner Receives Notice
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  OWNER REQUESTS HEARING (within 20 days per MCL 257.252d)              │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  HEARING REQUEST RECEIVED                                               │
  │  • Log request date/time                                                │
  │  • Verify within deadline                                               │
  │  • Suspend auction eligibility                                          │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  SCHEDULE HEARING                                                       │
  │  • Hearing must be within reasonable time                               │
  │  • Send hearing notice to owner                                         │
  │  • Prepare documentation packet                                         │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  CONDUCT HEARING                                                        │
  │  • Present tow documentation                                            │
  │  • Review compliance notices                                            │
  │  • Hear owner's contest                                                 │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         ├─── Owner Prevails ───▶ Release vehicle (fees may be waived)
         │
         ├─── Lot Prevails ───▶ Continue to auction
         │
         ├─── Settled ───▶ Negotiated resolution
         │
         └─── No Show ───▶ Continue to auction
```

### Hearing Service

```typescript
// apps/api/src/services/hearingService.ts

export class HearingService {
  constructor(
    private prisma: PrismaClient,
    private noticeService: NoticeService,
    private auditService: AuditService,
  ) {}

  /**
   * Process hearing request
   */
  async requestHearing(
    noticeId: string,
    requestedBy: string,
    requestMethod: string,
    notes?: string,
  ): Promise<HearingRequest> {
    const notice = await this.prisma.complianceNotice.findUnique({
      where: { id: noticeId },
      include: { vehicleCase: true },
    });

    if (!notice) {
      throw new Error('Notice not found');
    }

    // Verify request is within deadline
    const policy = await this.policyService.getCurrentCompliancePolicy();
    const deadline = addDays(notice.sentAt, policy.config.hearingRequestDeadlineDays);

    if (new Date() > deadline) {
      throw new Error(
        `Hearing request deadline has passed (was ${formatDate(deadline)})`
      );
    }

    // Update notice with hearing request
    const updated = await this.prisma.complianceNotice.update({
      where: { id: noticeId },
      data: {
        hearingRequested: true,
        hearingRequestedAt: new Date(),
        metadata: {
          ...notice.metadata,
          hearingRequestedBy: requestedBy,
          hearingRequestMethod: requestMethod,
          hearingRequestNotes: notes,
        },
      },
    });

    // Update vehicle case - suspend auction eligibility
    await this.prisma.vehicleCase.update({
      where: { id: notice.vehicleCaseId },
      data: {
        auctionEligibleAt: null, // Clear until hearing resolved
        metadata: {
          ...notice.vehicleCase.metadata,
          hearingPending: true,
        },
      },
    });

    // Log audit event
    await this.auditService.log({
      eventType: 'HEARING_REQUESTED',
      entityType: 'VehicleCase',
      entityId: notice.vehicleCaseId,
      metadata: { noticeId, requestedBy, requestMethod },
    });

    return {
      noticeId,
      requestedAt: new Date(),
      requestedBy,
      deadline,
      status: 'PENDING_SCHEDULING',
    };
  }

  /**
   * Schedule hearing
   */
  async scheduleHearing(
    noticeId: string,
    hearingDate: Date,
    location: string,
    scheduledById: string,
  ): Promise<void> {
    const notice = await this.prisma.complianceNotice.findUnique({
      where: { id: noticeId },
      include: { vehicleCase: true },
    });

    if (!notice || !notice.hearingRequested) {
      throw new Error('No hearing requested for this notice');
    }

    // Update notice
    await this.prisma.complianceNotice.update({
      where: { id: noticeId },
      data: {
        hearingDate,
        metadata: {
          ...notice.metadata,
          hearingLocation: location,
          hearingScheduledBy: scheduledById,
          hearingScheduledAt: new Date().toISOString(),
        },
      },
    });

    // Send hearing notice to owner
    await this.noticeService.sendHearingNotice(
      notice.vehicleCaseId,
      hearingDate,
      location,
      notice.recipientName,
      notice.recipientAddress,
    );
  }

  /**
   * Record hearing result
   */
  async recordHearingResult(
    noticeId: string,
    result: HearingResult,
    notes: string,
    recordedById: string,
  ): Promise<void> {
    const notice = await this.prisma.complianceNotice.findUnique({
      where: { id: noticeId },
      include: { vehicleCase: true },
    });

    if (!notice) {
      throw new Error('Notice not found');
    }

    // Update notice with result
    await this.prisma.complianceNotice.update({
      where: { id: noticeId },
      data: {
        hearingResult: result,
        metadata: {
          ...notice.metadata,
          hearingResultNotes: notes,
          hearingResultRecordedBy: recordedById,
          hearingResultRecordedAt: new Date().toISOString(),
        },
      },
    });

    // Update vehicle case based on result
    switch (result) {
      case HearingResult.OWNER_PREVAILED:
        // Release vehicle, potentially waive fees
        await this.prisma.vehicleCase.update({
          where: { id: notice.vehicleCaseId },
          data: {
            status: VehicleCaseStatus.RELEASE_ELIGIBLE,
            metadata: {
              ...notice.vehicleCase.metadata,
              hearingPending: false,
              hearingOutcome: 'OWNER_PREVAILED',
            },
          },
        });
        break;

      case HearingResult.LOT_PREVAILED:
      case HearingResult.NO_SHOW:
        // Continue to auction
        const policy = await this.policyService.getCurrentCompliancePolicy();
        await this.prisma.vehicleCase.update({
          where: { id: notice.vehicleCaseId },
          data: {
            auctionEligibleAt: addDays(
              notice.vehicleCase.intakeDate,
              policy.config.minimumStorageDaysForAuction,
            ),
            metadata: {
              ...notice.vehicleCase.metadata,
              hearingPending: false,
              hearingOutcome: result,
            },
          },
        });
        break;

      case HearingResult.SETTLED:
        // Custom handling based on settlement terms
        break;
    }

    // Log audit event
    await this.auditService.log({
      eventType: 'HEARING_RESULT_RECORDED',
      entityType: 'VehicleCase',
      entityId: notice.vehicleCaseId,
      metadata: { noticeId, result, notes },
    });
  }
}
```

---

## Compliance Checklist Generator

### Case Compliance Report

```typescript
// apps/api/src/services/complianceReportService.ts

export interface ComplianceReport {
  caseId: string;
  caseNumber: string;
  generatedAt: Date;
  policy: CompliancePolicy;
  vehicle: VehicleSummary;
  timeline: TimelineEvent[];
  checklist: ChecklistItem[];
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  issues: ComplianceIssue[];
  nextActions: NextAction[];
}

export interface ChecklistItem {
  requirement: string;
  mclReference: string;
  status: 'COMPLETE' | 'PENDING' | 'OVERDUE' | 'NOT_APPLICABLE';
  completedAt?: Date;
  dueDate?: Date;
  evidence?: string;
}

export class ComplianceReportService {
  async generateReport(caseId: string): Promise<ComplianceReport> {
    const [vehicleCase, notices, policy] = await Promise.all([
      this.prisma.vehicleCase.findUnique({
        where: { id: caseId },
        include: { documents: true, feeLedgerEntries: true },
      }),
      this.prisma.complianceNotice.findMany({
        where: { vehicleCaseId: caseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.policyService.getCurrentCompliancePolicy(),
    ]);

    if (!vehicleCase) {
      throw new Error('Case not found');
    }

    const config = policy.config;
    const intakeDate = vehicleCase.intakeDate || vehicleCase.towDate;

    // Build checklist
    const checklist: ChecklistItem[] = [
      // Owner Notice
      {
        requirement: 'Send notice to registered owner',
        mclReference: 'MCL 257.252a(1)',
        ...this.checkNoticeStatus(
          notices,
          NoticeType.OWNER_INITIAL,
          intakeDate,
          config.ownerNoticeDeadlineDays,
        ),
      },

      // Lienholder Notice
      {
        requirement: 'Send notice to lienholder (if applicable)',
        mclReference: 'MCL 257.252a(2)',
        ...this.checkNoticeStatus(
          notices,
          NoticeType.LIENHOLDER,
          intakeDate,
          config.lienholderNoticeDeadlineDays,
          !vehicleCase.lienholderName, // Not applicable if no lienholder
        ),
      },

      // TR-52P Filing
      {
        requirement: 'File TR-52P with Secretary of State',
        mclReference: 'MCL 257.252b',
        ...this.checkNoticeStatus(
          notices,
          NoticeType.MDOS_TR52P,
          intakeDate,
          config.mdosFilingDeadlineDays,
        ),
      },

      // Photo documentation
      {
        requirement: 'Intake photos captured',
        mclReference: 'Best Practice',
        ...this.checkPhotoDocumentation(vehicleCase.documents),
      },

      // VIN verification
      {
        requirement: 'VIN verified',
        mclReference: 'Best Practice',
        status: vehicleCase.vin ? 'COMPLETE' : 'PENDING',
        completedAt: vehicleCase.vin ? vehicleCase.intakeDate : undefined,
      },
    ];

    // Build timeline
    const timeline = this.buildTimeline(vehicleCase, notices);

    // Identify issues
    const issues = checklist
      .filter(item => item.status === 'OVERDUE')
      .map(item => ({
        requirement: item.requirement,
        mclReference: item.mclReference,
        dueDate: item.dueDate!,
        daysOverdue: differenceInDays(new Date(), item.dueDate!),
        severity: this.calculateSeverity(item),
      }));

    // Determine next actions
    const nextActions = checklist
      .filter(item => item.status === 'PENDING')
      .map(item => ({
        action: item.requirement,
        dueDate: item.dueDate!,
        priority: this.calculatePriority(item),
      }));

    return {
      caseId,
      caseNumber: vehicleCase.caseNumber,
      generatedAt: new Date(),
      policy,
      vehicle: this.buildVehicleSummary(vehicleCase),
      timeline,
      checklist,
      status: issues.length > 0 ? 'NON_COMPLIANT' :
              nextActions.length > 0 ? 'PENDING' : 'COMPLIANT',
      issues,
      nextActions,
    };
  }

  private checkNoticeStatus(
    notices: ComplianceNotice[],
    type: NoticeType,
    intakeDate: Date,
    deadlineDays: number,
    notApplicable?: boolean,
  ): Partial<ChecklistItem> {
    if (notApplicable) {
      return { status: 'NOT_APPLICABLE' };
    }

    const notice = notices.find(n => n.noticeType === type);
    const dueDate = addDays(intakeDate, deadlineDays);

    if (notice?.sentAt) {
      return {
        status: 'COMPLETE',
        completedAt: notice.sentAt,
        dueDate,
        evidence: `Tracking: ${notice.trackingNumber || 'N/A'}`,
      };
    }

    return {
      status: new Date() > dueDate ? 'OVERDUE' : 'PENDING',
      dueDate,
    };
  }
}
```

---

## Implementation Guide

### Database Schema for Policies

```sql
-- Policy configuration table
CREATE TABLE policy_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_to TIMESTAMP WITH TIME ZONE,
  mcl_references JSONB,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_active_policy
    UNIQUE NULLS NOT DISTINCT (policy_type, effective_to)
);

-- Index for efficient policy lookup
CREATE INDEX idx_policy_configs_lookup
  ON policy_configs(policy_type, effective_from, effective_to);

-- Compliance notices table
CREATE TABLE compliance_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_case_id UUID NOT NULL REFERENCES vehicle_cases(id) ON DELETE CASCADE,
  notice_type VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_address TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  send_method VARCHAR(50),
  tracking_number VARCHAR(100),
  delivery_status VARCHAR(50) DEFAULT 'PENDING',
  delivered_at TIMESTAMP WITH TIME ZONE,
  response_due_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT FALSE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  hearing_requested BOOLEAN DEFAULT FALSE,
  hearing_requested_at TIMESTAMP WITH TIME ZONE,
  hearing_date TIMESTAMP WITH TIME ZONE,
  hearing_result VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for compliance notice queries
CREATE INDEX idx_compliance_notices_case ON compliance_notices(vehicle_case_id);
CREATE INDEX idx_compliance_notices_type ON compliance_notices(notice_type);
CREATE INDEX idx_compliance_notices_due ON compliance_notices(response_due_at)
  WHERE response_received = FALSE;
CREATE INDEX idx_compliance_notices_hearing ON compliance_notices(hearing_requested, hearing_result)
  WHERE hearing_requested = TRUE;
```

### Background Jobs

```typescript
// apps/api/src/jobs/complianceJobs.ts

import { Queue, Worker, Job } from 'bullmq';

// Daily compliance check job
export const complianceCheckQueue = new Queue('compliance-check');

// Schedule daily at 6 AM
complianceCheckQueue.add(
  'daily-check',
  {},
  { repeat: { pattern: '0 6 * * *' } }
);

// Worker to process compliance checks
const complianceWorker = new Worker('compliance-check', async (job: Job) => {
  const policyService = new PolicyService(prisma);
  const noticeService = new NoticeService(prisma, pdfService, mailingService);
  const policy = await policyService.getCurrentCompliancePolicy();

  // Find cases needing owner notice
  const casesNeedingOwnerNotice = await prisma.vehicleCase.findMany({
    where: {
      status: { in: [VehicleCaseStatus.STORED, VehicleCaseStatus.INTAKE_COMPLETE] },
      intakeDate: {
        lte: subDays(new Date(), policy.config.ownerNoticeDeadlineDays - 1), // 1 day warning
      },
      complianceNotices: {
        none: { noticeType: NoticeType.OWNER_INITIAL },
      },
    },
  });

  // Generate alerts
  for (const vehicleCase of casesNeedingOwnerNotice) {
    await alertService.create({
      type: 'COMPLIANCE_ACTION_NEEDED',
      severity: 'HIGH',
      caseId: vehicleCase.id,
      message: `Owner notice due for case ${vehicleCase.caseNumber}`,
    });
  }

  // Check for expiring holds
  const expiringHolds = await prisma.vehicleCase.findMany({
    where: {
      policeHold: true,
      holdExpiresAt: {
        gte: new Date(),
        lte: addDays(new Date(), 2), // Next 48 hours
      },
    },
  });

  for (const vehicleCase of expiringHolds) {
    // Notify agency via webhook
    if (vehicleCase.towingAgencyId) {
      await webhookService.send(vehicleCase.towingAgencyId, {
        type: 'hold.expiring',
        data: {
          caseId: vehicleCase.id,
          caseNumber: vehicleCase.caseNumber,
          holdExpiresAt: vehicleCase.holdExpiresAt,
        },
      });
    }
  }

  return {
    casesNeedingNotice: casesNeedingOwnerNotice.length,
    expiringHolds: expiringHolds.length,
  };
});
```

### API Routes for Policy Management

```typescript
// apps/api/src/routers/policy.ts

export const policyRouter = router({
  // Get current policies
  getCurrent: withPermission(Permission.POLICY_VIEW)
    .query(async ({ ctx }) => {
      const [compliancePolicy, feeSchedule] = await Promise.all([
        ctx.policyService.getCurrentCompliancePolicy(),
        ctx.policyService.getCurrentFeeSchedule(),
      ]);
      return { compliancePolicy, feeSchedule };
    }),

  // Create new policy (effective future date)
  create: withPermission(Permission.POLICY_MANAGE)
    .input(createPolicyInput)
    .mutation(async ({ ctx, input }) => {
      // Validate effective date is in future
      if (input.effectiveFrom <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Effective date must be in the future',
        });
      }

      const policy = await ctx.prisma.policyConfig.create({
        data: {
          ...input,
          createdById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'POLICY_CREATED',
        entityType: 'PolicyConfig',
        entityId: policy.id,
        metadata: { effectiveFrom: input.effectiveFrom },
      });

      return policy;
    }),

  // Get policy history
  getHistory: withPermission(Permission.POLICY_VIEW)
    .input(z.object({ policyType: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.policyConfig.findMany({
        where: { policyType: input.policyType },
        orderBy: { effectiveFrom: 'desc' },
      });
    }),
});
```

---

## Key Compliance Reminders

1. **Never Hardcode Timelines**: All deadline calculations must use PolicyConfig values
2. **Log Everything**: Every notice, hearing, and status change must be audited
3. **Document Evidence**: Attach tracking numbers, delivery confirmations, hearing recordings
4. **Proactive Alerts**: Alert staff before deadlines, not after
5. **Policy Versioning**: Maintain history of policy changes for legal defense
6. **MCL References**: Always include statutory citations for audit trail
