# Internal API Specification

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [tRPC Router Structure](#trpc-router-structure)
4. [API Endpoints by Domain](#api-endpoints-by-domain)
5. [Error Handling](#error-handling)
6. [Request/Response Patterns](#requestresponse-patterns)
7. [Validation Schemas](#validation-schemas)

---

## Overview

The internal API uses **tRPC** for type-safe communication between the React frontend and Express backend. This provides:

- End-to-end type safety (shared types between client and server)
- Automatic TypeScript inference
- Built-in validation with Zod schemas
- Efficient batching of requests

### Base Architecture

```typescript
// apps/api/src/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { Permission } from '@cinton/shared';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Authenticated procedure - requires valid JWT
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Permission-based procedure factory
export const withPermission = (permission: Permission) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user.role.permissions.includes(permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${permission}`,
      });
    }
    return next();
  });
```

### Context Structure

```typescript
// apps/api/src/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { PrismaClient } from '@prisma/client';
import { User } from '@cinton/shared';

export interface Context {
  prisma: PrismaClient;
  user: User | null;
  requestId: string;
  ip: string;
}

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = token ? await verifyToken(token) : null;

  return {
    prisma,
    user,
    requestId: req.headers['x-request-id'] as string || generateRequestId(),
    ip: req.ip,
  };
};
```

---

## Authentication & Authorization

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  role: string;          // Role ID
  permissions: string[]; // Permission array
  iat: number;
  exp: number;
}
```

### Token Endpoints

#### POST /api/auth/login

```typescript
// Input
const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Output
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
}
```

#### POST /api/auth/refresh

```typescript
// Input
const refreshInput = z.object({
  refreshToken: z.string(),
});

// Output
interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
```

### RBAC Middleware

```typescript
// apps/api/src/middleware/rbac.ts
import { Permission } from '@cinton/shared';

export const requirePermissions = (...permissions: Permission[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const hasAll = permissions.every((p) =>
      ctx.user.role.permissions.includes(p)
    );
    if (!hasAll) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Required permissions: ${permissions.join(', ')}`,
      });
    }
    return next();
  });
};
```

---

## tRPC Router Structure

### Main Router

```typescript
// apps/api/src/routers/_app.ts
import { router } from '../trpc';
import { vehicleCaseRouter } from './vehicleCase';
import { feeLedgerRouter } from './feeLedger';
import { complianceRouter } from './compliance';
import { auctionRouter } from './auction';
import { userRouter } from './user';
import { agencyRouter } from './agency';
import { reportRouter } from './report';
import { documentRouter } from './document';
import { policyRouter } from './policy';

export const appRouter = router({
  vehicleCase: vehicleCaseRouter,
  feeLedger: feeLedgerRouter,
  compliance: complianceRouter,
  auction: auctionRouter,
  user: userRouter,
  agency: agencyRouter,
  report: reportRouter,
  document: documentRouter,
  policy: policyRouter,
});

export type AppRouter = typeof appRouter;
```

---

## API Endpoints by Domain

### Vehicle Case Router

```typescript
// apps/api/src/routers/vehicleCase.ts
import { z } from 'zod';
import { router, withPermission } from '../trpc';
import { Permission, VehicleCaseStatus, TowReason, VehicleType, VehicleClass } from '@cinton/shared';

// Input Schemas
const createVehicleCaseInput = z.object({
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/).optional(),
  plateNumber: z.string().max(10).optional(),
  plateState: z.string().length(2).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  vehicleType: z.nativeEnum(VehicleType),
  vehicleClass: z.nativeEnum(VehicleClass),
  towDate: z.date(),
  towReason: z.nativeEnum(TowReason),
  towLocation: z.string().min(1).max(500),
  towingAgencyId: z.string().uuid().optional(),
  yardLocation: z.string().max(50).optional(),
  ownerName: z.string().max(200).optional(),
  ownerAddress: z.string().max(500).optional(),
  ownerPhone: z.string().max(20).optional(),
  policeHold: z.boolean().default(false),
  holdExpiresAt: z.date().optional(),
  policeCaseNumber: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateVehicleCaseInput = z.object({
  id: z.string().uuid(),
  vin: z.string().length(17).optional(),
  plateNumber: z.string().max(10).optional(),
  plateState: z.string().length(2).optional(),
  year: z.number().int().optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  vehicleClass: z.nativeEnum(VehicleClass).optional(),
  yardLocation: z.string().max(50).optional(),
  ownerName: z.string().max(200).optional(),
  ownerAddress: z.string().max(500).optional(),
  ownerPhone: z.string().max(20).optional(),
  lienholderName: z.string().max(200).optional(),
  lienholderAddress: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const searchInput = z.object({
  query: z.string().optional(),           // General search
  vin: z.string().optional(),
  plateNumber: z.string().optional(),
  plateState: z.string().optional(),
  caseNumber: z.string().optional(),
  ownerName: z.string().optional(),
  status: z.array(z.nativeEnum(VehicleCaseStatus)).optional(),
  towDateFrom: z.date().optional(),
  towDateTo: z.date().optional(),
  policeHold: z.boolean().optional(),
  agencyId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['towDate', 'caseNumber', 'status', 'createdAt']).default('towDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const vehicleCaseRouter = router({
  // Create new case
  create: withPermission(Permission.CASE_CREATE)
    .input(createVehicleCaseInput)
    .mutation(async ({ ctx, input }) => {
      const caseNumber = await generateCaseNumber(ctx.prisma);

      const vehicleCase = await ctx.prisma.vehicleCase.create({
        data: {
          ...input,
          caseNumber,
          status: VehicleCaseStatus.PENDING_INTAKE,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'CREATE',
        entityType: 'VehicleCase',
        entityId: vehicleCase.id,
        changes: { created: input },
      });

      return vehicleCase;
    }),

  // Get single case by ID
  getById: withPermission(Permission.CASE_VIEW)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
        include: {
          feeLedgerEntries: true,
          complianceNotices: true,
          documents: true,
          auctionLots: true,
          towingAgency: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return vehicleCase;
    }),

  // Get by case number
  getByCaseNumber: withPermission(Permission.CASE_VIEW)
    .input(z.object({ caseNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { caseNumber: input.caseNumber },
        include: {
          feeLedgerEntries: true,
          complianceNotices: true,
          documents: true,
        },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return vehicleCase;
    }),

  // Search cases
  search: withPermission(Permission.CASE_VIEW)
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder, ...filters } = input;

      const where = buildWhereClause(filters);

      const [cases, total] = await Promise.all([
        ctx.prisma.vehicleCase.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            towingAgency: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.vehicleCase.count({ where }),
      ]);

      return {
        items: cases,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Update case
  update: withPermission(Permission.CASE_UPDATE)
    .input(updateVehicleCaseInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.prisma.vehicleCase.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const updated = await ctx.prisma.vehicleCase.update({
        where: { id },
        data: {
          ...data,
          updatedById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'UPDATE',
        entityType: 'VehicleCase',
        entityId: id,
        changes: calculateChanges(existing, updated),
      });

      return updated;
    }),

  // Change status
  changeStatus: withPermission(Permission.CASE_UPDATE)
    .input(z.object({
      id: z.string().uuid(),
      newStatus: z.nativeEnum(VehicleCaseStatus),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Validate status transition
      if (!isValidTransition(existing.status, input.newStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid transition from ${existing.status} to ${input.newStatus}`,
        });
      }

      const updated = await ctx.prisma.vehicleCase.update({
        where: { id: input.id },
        data: {
          status: input.newStatus,
          updatedById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'STATUS_CHANGE',
        entityType: 'VehicleCase',
        entityId: input.id,
        changes: {
          status: { old: existing.status, new: input.newStatus },
        },
        metadata: { reason: input.reason },
      });

      return updated;
    }),

  // Complete intake
  completeIntake: withPermission(Permission.CASE_UPDATE)
    .input(z.object({
      id: z.string().uuid(),
      yardLocation: z.string(),
      intakeNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.vehicleCase.update({
        where: { id: input.id },
        data: {
          status: VehicleCaseStatus.INTAKE_COMPLETE,
          intakeDate: new Date(),
          yardLocation: input.yardLocation,
          metadata: {
            intakeNotes: input.intakeNotes,
            intakeCompletedAt: new Date().toISOString(),
            intakeCompletedBy: ctx.user.id,
          },
          updatedById: ctx.user.id,
        },
      });
    }),

  // Decode VIN
  decodeVin: withPermission(Permission.CASE_UPDATE)
    .input(z.object({
      id: z.string().uuid(),
      vin: z.string().length(17),
    }))
    .mutation(async ({ ctx, input }) => {
      const decoded = await vinDecodeService.decode(input.vin);

      return ctx.prisma.vehicleCase.update({
        where: { id: input.id },
        data: {
          vin: input.vin,
          year: decoded.data.year,
          make: decoded.data.make,
          model: decoded.data.model,
          vinDecodeData: decoded,
          updatedById: ctx.user.id,
        },
      });
    }),

  // Place/release hold
  setHold: withPermission(Permission.CASE_UPDATE)
    .input(z.object({
      id: z.string().uuid(),
      policeHold: z.boolean(),
      holdExpiresAt: z.date().optional(),
      policeCaseNumber: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updated = await ctx.prisma.vehicleCase.update({
        where: { id },
        data: {
          policeHold: data.policeHold,
          holdExpiresAt: data.holdExpiresAt,
          policeCaseNumber: data.policeCaseNumber,
          status: data.policeHold
            ? VehicleCaseStatus.HOLD
            : VehicleCaseStatus.STORED,
          updatedById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: data.policeHold ? 'HOLD_PLACED' : 'HOLD_RELEASED',
        entityType: 'VehicleCase',
        entityId: id,
        metadata: { reason: data.reason },
      });

      return updated;
    }),

  // Release vehicle
  release: withPermission(Permission.CASE_RELEASE)
    .input(z.object({
      id: z.string().uuid(),
      releasedTo: z.string(),
      releaseType: z.enum(['OWNER', 'LIENHOLDER', 'AGENT', 'INSURANCE', 'AGENCY']),
      identificationVerified: z.boolean(),
      paymentReceiptId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
        include: { feeLedgerEntries: true },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Check for police hold
      if (vehicleCase.policeHold) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot release vehicle with active police hold',
        });
      }

      // Check balance (unless agency release)
      if (input.releaseType !== 'AGENCY') {
        const balance = calculateBalance(vehicleCase.feeLedgerEntries);
        if (balance > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Outstanding balance of $${balance.toFixed(2)} must be paid`,
          });
        }
      }

      const updated = await ctx.prisma.vehicleCase.update({
        where: { id: input.id },
        data: {
          status: VehicleCaseStatus.RELEASED,
          releasedAt: new Date(),
          releasedTo: input.releasedTo,
          updatedById: ctx.user.id,
          metadata: {
            ...vehicleCase.metadata,
            releaseType: input.releaseType,
            identificationVerified: input.identificationVerified,
            releaseNotes: input.notes,
          },
        },
      });

      await ctx.audit.log({
        eventType: 'VEHICLE_RELEASED',
        entityType: 'VehicleCase',
        entityId: input.id,
        metadata: {
          releasedTo: input.releasedTo,
          releaseType: input.releaseType,
          paymentReceiptId: input.paymentReceiptId,
        },
      });

      return updated;
    }),

  // Get release eligibility
  checkReleaseEligibility: withPermission(Permission.CASE_VIEW)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
        include: { feeLedgerEntries: true, complianceNotices: true },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const balance = calculateBalance(vehicleCase.feeLedgerEntries);
      const hasActiveHold = vehicleCase.policeHold &&
        (!vehicleCase.holdExpiresAt || vehicleCase.holdExpiresAt > new Date());

      return {
        eligible: !hasActiveHold && balance <= 0,
        balance,
        hasActiveHold,
        holdExpiresAt: vehicleCase.holdExpiresAt,
        blockers: [
          hasActiveHold && 'Active police hold',
          balance > 0 && `Outstanding balance: $${balance.toFixed(2)}`,
        ].filter(Boolean),
      };
    }),

  // Dashboard stats
  getDashboardStats: withPermission(Permission.CASE_VIEW)
    .query(async ({ ctx }) => {
      const [statusCounts, recentIntakes, holdCount, releaseEligibleCount] = await Promise.all([
        ctx.prisma.vehicleCase.groupBy({
          by: ['status'],
          _count: true,
        }),
        ctx.prisma.vehicleCase.count({
          where: {
            intakeDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        ctx.prisma.vehicleCase.count({
          where: { policeHold: true },
        }),
        ctx.prisma.vehicleCase.count({
          where: { status: VehicleCaseStatus.RELEASE_ELIGIBLE },
        }),
      ]);

      return {
        statusCounts: Object.fromEntries(
          statusCounts.map((s) => [s.status, s._count])
        ),
        recentIntakes,
        holdCount,
        releaseEligibleCount,
      };
    }),
});
```

### Fee Ledger Router

```typescript
// apps/api/src/routers/feeLedger.ts
import { z } from 'zod';
import { router, withPermission } from '../trpc';
import { Permission, FeeType, PaymentMethod } from '@cinton/shared';

const addFeeInput = z.object({
  vehicleCaseId: z.string().uuid(),
  feeType: z.nativeEnum(FeeType),
  description: z.string().max(500),
  amount: z.number().positive(),
  accrualDate: z.date().optional(),
  dueDate: z.date().optional(),
});

const recordPaymentInput = z.object({
  vehicleCaseId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  checkNumber: z.string().optional(),
  cardLast4: z.string().length(4).optional(),
  notes: z.string().optional(),
});

const voidEntryInput = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const feeLedgerRouter = router({
  // Add fee
  addFee: withPermission(Permission.FEE_CREATE)
    .input(addFeeInput)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.feeLedgerEntry.create({
        data: {
          ...input,
          accrualDate: input.accrualDate || new Date(),
          createdById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'FEE_ACCRUED',
        entityType: 'FeeLedgerEntry',
        entityId: entry.id,
        metadata: {
          vehicleCaseId: input.vehicleCaseId,
          feeType: input.feeType,
          amount: input.amount,
        },
      });

      return entry;
    }),

  // Record payment
  recordPayment: withPermission(Permission.PAYMENT_RECORD)
    .input(recordPaymentInput)
    .mutation(async ({ ctx, input }) => {
      const receiptNumber = await generateReceiptNumber(ctx.prisma);

      const entry = await ctx.prisma.feeLedgerEntry.create({
        data: {
          vehicleCaseId: input.vehicleCaseId,
          feeType: FeeType.PAYMENT,
          description: `Payment - ${input.paymentMethod}`,
          amount: -input.amount, // Negative for payments
          accrualDate: new Date(),
          paidAt: new Date(),
          paymentMethod: input.paymentMethod,
          receiptNumber,
          createdById: ctx.user.id,
        },
      });

      await ctx.audit.log({
        eventType: 'PAYMENT_RECEIVED',
        entityType: 'FeeLedgerEntry',
        entityId: entry.id,
        metadata: {
          vehicleCaseId: input.vehicleCaseId,
          amount: input.amount,
          method: input.paymentMethod,
          receiptNumber,
        },
      });

      return entry;
    }),

  // Void entry
  void: withPermission(Permission.FEE_VOID)
    .input(voidEntryInput)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.feeLedgerEntry.update({
        where: { id: input.id },
        data: {
          voidedAt: new Date(),
          voidReason: input.reason,
        },
      });

      await ctx.audit.log({
        eventType: 'UPDATE',
        entityType: 'FeeLedgerEntry',
        entityId: input.id,
        changes: {
          voidedAt: { old: null, new: entry.voidedAt },
          voidReason: { old: null, new: input.reason },
        },
      });

      return entry;
    }),

  // Get ledger for case
  getForCase: withPermission(Permission.FEE_VIEW)
    .input(z.object({ vehicleCaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.prisma.feeLedgerEntry.findMany({
        where: {
          vehicleCaseId: input.vehicleCaseId,
          voidedAt: null,
        },
        orderBy: { accrualDate: 'asc' },
      });

      const totalCharges = entries
        .filter((e) => e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalPayments = entries
        .filter((e) => e.amount < 0)
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

      return {
        entries,
        summary: {
          totalCharges,
          totalPayments,
          balance: totalCharges - totalPayments,
          fullyPaid: totalCharges <= totalPayments,
        },
      };
    }),

  // Get fee schedule (current policy)
  getFeeSchedule: withPermission(Permission.FEE_VIEW)
    .query(async ({ ctx }) => {
      const policy = await ctx.prisma.policyConfig.findFirst({
        where: {
          policyType: 'FEE_SCHEDULE',
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active fee schedule found',
        });
      }

      return policy.config;
    }),

  // Calculate fees for case (preview)
  calculateFees: withPermission(Permission.FEE_VIEW)
    .input(z.object({
      vehicleCaseId: z.string().uuid(),
      asOfDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.vehicleCaseId },
        include: { feeLedgerEntries: { where: { voidedAt: null } } },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const feeSchedule = await getCurrentFeeSchedule(ctx.prisma);
      const asOfDate = input.asOfDate || new Date();

      return calculateProjectedFees(vehicleCase, feeSchedule, asOfDate);
    }),

  // Generate receipt PDF
  generateReceipt: withPermission(Permission.PAYMENT_RECORD)
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.feeLedgerEntry.findUnique({
        where: { id: input.entryId },
        include: { vehicleCase: true },
      });

      if (!entry || entry.feeType !== FeeType.PAYMENT) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const pdfUrl = await generateReceiptPdf(entry);
      return { url: pdfUrl };
    }),
});
```

### Compliance Router

```typescript
// apps/api/src/routers/compliance.ts
import { z } from 'zod';
import { router, withPermission } from '../trpc';
import { Permission, NoticeType, SendMethod, HearingResult } from '@cinton/shared';

const createNoticeInput = z.object({
  vehicleCaseId: z.string().uuid(),
  noticeType: z.nativeEnum(NoticeType),
  recipientType: z.enum(['REGISTERED_OWNER', 'LIENHOLDER', 'MDOS', 'PUBLIC', 'OTHER']),
  recipientName: z.string().optional(),
  recipientAddress: z.string().optional(),
  sendMethod: z.nativeEnum(SendMethod),
  scheduledSendDate: z.date().optional(),
});

const updateNoticeInput = z.object({
  id: z.string().uuid(),
  trackingNumber: z.string().optional(),
  deliveryStatus: z.enum(['PENDING', 'SENT', 'DELIVERED', 'RETURNED', 'UNDELIVERABLE']).optional(),
  deliveredAt: z.date().optional(),
  responseReceived: z.boolean().optional(),
  responseReceivedAt: z.date().optional(),
});

const scheduleHearingInput = z.object({
  noticeId: z.string().uuid(),
  hearingDate: z.date(),
  hearingLocation: z.string().optional(),
  notes: z.string().optional(),
});

const recordHearingResultInput = z.object({
  noticeId: z.string().uuid(),
  result: z.nativeEnum(HearingResult),
  notes: z.string().optional(),
});

export const complianceRouter = router({
  // Create notice
  createNotice: withPermission(Permission.NOTICE_CREATE)
    .input(createNoticeInput)
    .mutation(async ({ ctx, input }) => {
      const notice = await ctx.prisma.complianceNotice.create({
        data: {
          ...input,
          createdById: ctx.user.id,
        },
      });

      return notice;
    }),

  // Update notice
  updateNotice: withPermission(Permission.NOTICE_UPDATE)
    .input(updateNoticeInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.complianceNotice.update({
        where: { id },
        data,
      });
    }),

  // Mark as sent
  markSent: withPermission(Permission.NOTICE_UPDATE)
    .input(z.object({
      id: z.string().uuid(),
      trackingNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const policy = await getCurrentCompliancePolicy(ctx.prisma);

      return ctx.prisma.complianceNotice.update({
        where: { id: input.id },
        data: {
          sentAt: new Date(),
          trackingNumber: input.trackingNumber,
          deliveryStatus: 'SENT',
          responseDueAt: addDays(new Date(), policy.ownerResponseDeadlineDays),
        },
      });
    }),

  // Request hearing
  requestHearing: withPermission(Permission.NOTICE_UPDATE)
    .input(z.object({
      noticeId: z.string().uuid(),
      requestedBy: z.string(),
      requestedAt: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.complianceNotice.update({
        where: { id: input.noticeId },
        data: {
          hearingRequested: true,
          hearingRequestedAt: input.requestedAt || new Date(),
          metadata: {
            hearingRequestedBy: input.requestedBy,
            hearingRequestNotes: input.notes,
          },
        },
      });
    }),

  // Schedule hearing
  scheduleHearing: withPermission(Permission.HEARING_MANAGE)
    .input(scheduleHearingInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.complianceNotice.update({
        where: { id: input.noticeId },
        data: {
          hearingDate: input.hearingDate,
          metadata: {
            hearingLocation: input.hearingLocation,
            hearingScheduledBy: ctx.user.id,
            hearingNotes: input.notes,
          },
        },
      });
    }),

  // Record hearing result
  recordHearingResult: withPermission(Permission.HEARING_MANAGE)
    .input(recordHearingResultInput)
    .mutation(async ({ ctx, input }) => {
      const notice = await ctx.prisma.complianceNotice.update({
        where: { id: input.noticeId },
        data: {
          hearingResult: input.result,
          metadata: {
            hearingResultRecordedAt: new Date().toISOString(),
            hearingResultRecordedBy: ctx.user.id,
            hearingResultNotes: input.notes,
          },
        },
        include: { vehicleCase: true },
      });

      // Update vehicle case status based on result
      if (input.result === HearingResult.OWNER_PREVAILED) {
        await ctx.prisma.vehicleCase.update({
          where: { id: notice.vehicleCaseId },
          data: { status: 'RELEASE_ELIGIBLE' },
        });
      }

      return notice;
    }),

  // Get notices for case
  getForCase: withPermission(Permission.NOTICE_VIEW)
    .input(z.object({ vehicleCaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.complianceNotice.findMany({
        where: { vehicleCaseId: input.vehicleCaseId },
        orderBy: { createdAt: 'asc' },
      });
    }),

  // Get compliance status for case
  getComplianceStatus: withPermission(Permission.NOTICE_VIEW)
    .input(z.object({ vehicleCaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [vehicleCase, notices, policy] = await Promise.all([
        ctx.prisma.vehicleCase.findUnique({
          where: { id: input.vehicleCaseId },
        }),
        ctx.prisma.complianceNotice.findMany({
          where: { vehicleCaseId: input.vehicleCaseId },
        }),
        getCurrentCompliancePolicy(ctx.prisma),
      ]);

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return calculateComplianceStatus(vehicleCase, notices, policy);
    }),

  // Get pending compliance actions (dashboard)
  getPendingActions: withPermission(Permission.NOTICE_VIEW)
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const policy = await getCurrentCompliancePolicy(ctx.prisma);
      const now = new Date();

      // Find cases needing notices
      const casesNeedingOwnerNotice = await ctx.prisma.vehicleCase.findMany({
        where: {
          status: { in: ['STORED', 'INTAKE_COMPLETE'] },
          intakeDate: {
            lte: addDays(now, -policy.ownerNoticeDeadlineDays),
          },
          complianceNotices: {
            none: { noticeType: 'OWNER_INITIAL' },
          },
        },
        take: input.pageSize,
        skip: (input.page - 1) * input.pageSize,
      });

      // Find notices with responses due
      const noticesResponseDue = await ctx.prisma.complianceNotice.findMany({
        where: {
          responseDueAt: { lte: now },
          responseReceived: false,
          deliveryStatus: 'DELIVERED',
        },
        include: { vehicleCase: true },
        take: input.pageSize,
      });

      // Find pending hearings
      const pendingHearings = await ctx.prisma.complianceNotice.findMany({
        where: {
          hearingRequested: true,
          hearingResult: null,
        },
        include: { vehicleCase: true },
        orderBy: { hearingDate: 'asc' },
      });

      return {
        casesNeedingOwnerNotice,
        noticesResponseDue,
        pendingHearings,
      };
    }),

  // Get current compliance policy
  getPolicy: withPermission(Permission.NOTICE_VIEW)
    .query(async ({ ctx }) => {
      return getCurrentCompliancePolicy(ctx.prisma);
    }),
});
```

### Document Router

```typescript
// apps/api/src/routers/document.ts
import { z } from 'zod';
import { router, withPermission } from '../trpc';
import { Permission, DocumentType } from '@cinton/shared';

export const documentRouter = router({
  // Get upload URL
  getUploadUrl: withPermission(Permission.DOCUMENT_UPLOAD)
    .input(z.object({
      vehicleCaseId: z.string().uuid(),
      documentType: z.nativeEnum(DocumentType),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB max
    }))
    .mutation(async ({ ctx, input }) => {
      const key = generateS3Key(input.vehicleCaseId, input.documentType, input.fileName);
      const uploadUrl = await s3.getSignedUploadUrl(key, input.mimeType, input.fileSize);

      return {
        uploadUrl,
        key,
        expiresIn: 300, // 5 minutes
      };
    }),

  // Confirm upload
  confirmUpload: withPermission(Permission.DOCUMENT_UPLOAD)
    .input(z.object({
      vehicleCaseId: z.string().uuid(),
      documentType: z.nativeEnum(DocumentType),
      fileName: z.string(),
      filePath: z.string(),
      fileHash: z.string().length(64), // SHA-256
      mimeType: z.string(),
      fileSize: z.number().int().positive(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify file exists in S3
      const exists = await s3.headObject(input.filePath);
      if (!exists) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File not found at specified path',
        });
      }

      // Verify hash matches
      const actualHash = await s3.getObjectHash(input.filePath);
      if (actualHash !== input.fileHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File hash mismatch',
        });
      }

      const document = await ctx.prisma.caseDocument.create({
        data: {
          vehicleCaseId: input.vehicleCaseId,
          documentType: input.documentType,
          fileName: input.fileName,
          filePath: input.filePath,
          fileHash: input.fileHash,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          metadata: input.metadata || {},
          uploadedById: ctx.user.id,
        },
      });

      return document;
    }),

  // Get download URL
  getDownloadUrl: withPermission(Permission.DOCUMENT_VIEW)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.prisma.caseDocument.findUnique({
        where: { id: input.id },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const url = await s3.getSignedDownloadUrl(document.filePath);
      return { url, expiresIn: 3600 }; // 1 hour
    }),

  // List documents for case
  listForCase: withPermission(Permission.DOCUMENT_VIEW)
    .input(z.object({
      vehicleCaseId: z.string().uuid(),
      documentType: z.nativeEnum(DocumentType).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.caseDocument.findMany({
        where: {
          vehicleCaseId: input.vehicleCaseId,
          ...(input.documentType && { documentType: input.documentType }),
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Delete document
  delete: withPermission(Permission.DOCUMENT_DELETE)
    .input(z.object({
      id: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.caseDocument.findUnique({
        where: { id: input.id },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Soft delete - move to archive prefix
      await s3.moveObject(
        document.filePath,
        `archive/${document.filePath}`
      );

      await ctx.prisma.caseDocument.delete({
        where: { id: input.id },
      });

      await ctx.audit.log({
        eventType: 'DELETE',
        entityType: 'CaseDocument',
        entityId: input.id,
        metadata: { reason: input.reason },
      });

      return { success: true };
    }),
});
```

---

## Error Handling

### Error Codes

```typescript
// packages/shared/src/errors.ts
export const ErrorCodes = {
  // Authentication
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  INSUFFICIENT_PERMISSIONS: 'AUTH_003',

  // Validation
  INVALID_VIN: 'VAL_001',
  INVALID_STATUS_TRANSITION: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',

  // Business Rules
  VEHICLE_ON_HOLD: 'BIZ_001',
  OUTSTANDING_BALANCE: 'BIZ_002',
  NOTICE_NOT_SENT: 'BIZ_003',
  AUCTION_NOT_ELIGIBLE: 'BIZ_004',

  // System
  DATABASE_ERROR: 'SYS_001',
  EXTERNAL_API_ERROR: 'SYS_002',
  FILE_STORAGE_ERROR: 'SYS_003',
} as const;
```

### Error Response Format

```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

// Example error response
{
  "code": "BIZ_001",
  "message": "Cannot release vehicle with active police hold",
  "details": {
    "vehicleCaseId": "uuid",
    "holdExpiresAt": "2026-02-20T00:00:00Z",
    "policeCaseNumber": "2026-CT-12345"
  },
  "requestId": "req_abc123",
  "timestamp": "2026-02-14T15:30:00Z"
}
```

### tRPC Error Handling

```typescript
// apps/api/src/middleware/errorHandler.ts
import { TRPCError } from '@trpc/server';

export const errorFormatter = ({ shape, error }) => {
  return {
    ...shape,
    data: {
      ...shape.data,
      code: error.cause?.code || 'UNKNOWN',
      requestId: error.cause?.requestId,
    },
  };
};

// Usage in router
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Cannot release vehicle with active police hold',
  cause: {
    code: ErrorCodes.VEHICLE_ON_HOLD,
    requestId: ctx.requestId,
    details: { vehicleCaseId, holdExpiresAt },
  },
});
```

---

## Request/Response Patterns

### Pagination

```typescript
// Standard paginated response
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Standard pagination input
const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

### Search

```typescript
// Generic search response
interface SearchResponse<T> extends PaginatedResponse<T> {
  query?: string;
  filters?: Record<string, unknown>;
  aggregations?: Record<string, number>;
}
```

### Batch Operations

```typescript
// Batch operation input
const batchInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// Batch operation response
interface BatchResponse {
  succeeded: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}
```

---

## Validation Schemas

### Shared Zod Schemas

```typescript
// packages/shared/src/schemas/vehicleCase.ts
import { z } from 'zod';
import { VehicleCaseStatus, TowReason, VehicleType, VehicleClass } from '../types';

export const vinSchema = z
  .string()
  .length(17)
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format');

export const plateSchema = z.object({
  number: z.string().min(1).max(10),
  state: z.string().length(2),
});

export const vehicleCaseCreateSchema = z.object({
  vin: vinSchema.optional(),
  plate: plateSchema.optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  vehicleType: z.nativeEnum(VehicleType),
  vehicleClass: z.nativeEnum(VehicleClass),
  towDate: z.coerce.date(),
  towReason: z.nativeEnum(TowReason),
  towLocation: z.string().min(1).max(500),
  towingAgencyId: z.string().uuid().optional(),
  policeHold: z.boolean().default(false),
  policeCaseNumber: z.string().max(50).optional(),
}).refine(
  (data) => data.vin || data.plate,
  { message: 'Either VIN or plate number is required' }
);

export const vehicleCaseSearchSchema = z.object({
  query: z.string().optional(),
  vin: z.string().optional(),
  plateNumber: z.string().optional(),
  plateState: z.string().length(2).optional(),
  caseNumber: z.string().optional(),
  status: z.array(z.nativeEnum(VehicleCaseStatus)).optional(),
  towDateFrom: z.coerce.date().optional(),
  towDateTo: z.coerce.date().optional(),
  policeHold: z.boolean().optional(),
  agencyId: z.string().uuid().optional(),
}).merge(paginationInput);

// packages/shared/src/schemas/feeLedger.ts
export const feeCreateSchema = z.object({
  vehicleCaseId: z.string().uuid(),
  feeType: z.nativeEnum(FeeType),
  description: z.string().max(500),
  amount: z.number().positive(),
  accrualDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export const paymentSchema = z.object({
  vehicleCaseId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  checkNumber: z.string().optional(),
  cardLast4: z.string().length(4).regex(/^\d{4}$/).optional(),
  notes: z.string().max(500).optional(),
});
```

### Frontend Usage

```typescript
// apps/web/src/hooks/useVehicleCase.ts
import { trpc } from '../lib/trpc';
import { vehicleCaseCreateSchema } from '@cinton/shared';

export const useCreateVehicleCase = () => {
  const utils = trpc.useUtils();

  return trpc.vehicleCase.create.useMutation({
    onSuccess: () => {
      utils.vehicleCase.search.invalidate();
    },
  });
};

// Form validation is automatic via tRPC + Zod
```

---

## API Versioning

### Strategy

- Internal API uses tRPC (no versioning needed - types enforce compatibility)
- Breaking changes require migration of both frontend and backend
- Use feature flags for gradual rollouts

### Deprecation Process

1. Mark procedure as deprecated in code
2. Add console warning on usage
3. Document migration path
4. Remove after all clients updated

```typescript
// Example deprecation
export const oldProcedure = protectedProcedure
  .meta({ deprecated: true, replacement: 'newProcedure' })
  .input(...)
  .mutation(async ({ ctx, input }) => {
    console.warn('oldProcedure is deprecated, use newProcedure instead');
    // ... implementation
  });
```
