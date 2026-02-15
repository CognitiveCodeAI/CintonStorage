# Test Plan

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Compliance Rule Validation](#compliance-rule-validation)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Data Management](#test-data-management)

---

## Testing Strategy Overview

### Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ~10% (Playwright)
                    │   Tests     │  Critical user flows
                    ├─────────────┤
                    │ Integration │  ~30% (Vitest)
                    │   Tests     │  API routes, DB, services
                    ├─────────────┤
                    │             │
                    │    Unit     │  ~60% (Vitest)
                    │   Tests     │  Functions, utilities, logic
                    │             │
                    └─────────────┘
```

### Tools & Frameworks

| Purpose | Tool | Config File |
|---------|------|-------------|
| Unit/Integration Tests | Vitest | `vitest.config.ts` |
| E2E Tests | Playwright | `playwright.config.ts` |
| API Testing | Supertest | (within Vitest) |
| Mocking | vitest-mock-extended | (within Vitest) |
| Coverage | Vitest Coverage (v8) | `vitest.config.ts` |
| Database | Docker + Testcontainers | `docker-compose.test.yml` |

### Coverage Requirements

| Category | Minimum | Target |
|----------|---------|--------|
| Overall | 70% | 85% |
| Critical Business Logic | 90% | 95% |
| Fee Calculations | 95% | 100% |
| Compliance Rules | 95% | 100% |
| API Routes | 80% | 90% |

---

## Unit Testing

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/test/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

### Test Structure

```
apps/api/
├── src/
│   ├── services/
│   │   ├── vehicleCaseService.ts
│   │   └── __tests__/
│   │       └── vehicleCaseService.test.ts
│   ├── utils/
│   │   ├── feeCalculator.ts
│   │   └── __tests__/
│   │       └── feeCalculator.test.ts
│   └── ...
└── test/
    ├── setup.ts
    ├── fixtures/
    │   ├── vehicleCases.ts
    │   ├── feeLedger.ts
    │   └── policies.ts
    └── helpers/
        ├── mockPrisma.ts
        └── testFactories.ts
```

### Unit Test Examples

#### Fee Calculator Tests

```typescript
// apps/api/src/utils/__tests__/feeCalculator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDailyStorage,
  calculateTotalBalance,
  calculatePayoutWaterfall,
} from '../feeCalculator';
import { FeeScheduleConfig, VehicleClass, FeeLedgerEntry } from '@cinton/shared';
import { mockFeeSchedule, mockFeeLedgerEntries } from '@test/fixtures';

describe('feeCalculator', () => {
  describe('calculateDailyStorage', () => {
    const feeSchedule: FeeScheduleConfig = mockFeeSchedule();

    it('calculates correct storage for standard vehicle', () => {
      const result = calculateDailyStorage(VehicleClass.STANDARD, feeSchedule);
      expect(result).toBe(45.00);
    });

    it('calculates correct storage for large vehicle', () => {
      const result = calculateDailyStorage(VehicleClass.LARGE, feeSchedule);
      expect(result).toBe(55.00);
    });

    it('calculates correct storage for motorcycle', () => {
      const result = calculateDailyStorage(VehicleClass.MOTORCYCLE, feeSchedule);
      expect(result).toBe(25.00);
    });

    it('calculates correct storage for oversized vehicle', () => {
      const result = calculateDailyStorage(VehicleClass.OVERSIZED, feeSchedule);
      expect(result).toBe(75.00);
    });
  });

  describe('calculateTotalBalance', () => {
    it('returns 0 for empty ledger', () => {
      const result = calculateTotalBalance([]);
      expect(result).toBe(0);
    });

    it('sums positive charges correctly', () => {
      const entries: FeeLedgerEntry[] = [
        mockFeeLedgerEntries.towFee(150),
        mockFeeLedgerEntries.adminFee(50),
        mockFeeLedgerEntries.dailyStorage(45),
      ];
      const result = calculateTotalBalance(entries);
      expect(result).toBe(245);
    });

    it('subtracts payments from balance', () => {
      const entries: FeeLedgerEntry[] = [
        mockFeeLedgerEntries.towFee(150),
        mockFeeLedgerEntries.adminFee(50),
        mockFeeLedgerEntries.payment(100), // Negative amount
      ];
      const result = calculateTotalBalance(entries);
      expect(result).toBe(100);
    });

    it('ignores voided entries', () => {
      const entries: FeeLedgerEntry[] = [
        mockFeeLedgerEntries.towFee(150),
        mockFeeLedgerEntries.voidedFee(50), // Has voidedAt set
      ];
      const result = calculateTotalBalance(entries);
      expect(result).toBe(150);
    });

    it('handles negative balance (overpayment)', () => {
      const entries: FeeLedgerEntry[] = [
        mockFeeLedgerEntries.towFee(100),
        mockFeeLedgerEntries.payment(150),
      ];
      const result = calculateTotalBalance(entries);
      expect(result).toBe(-50);
    });
  });

  describe('calculatePayoutWaterfall', () => {
    it('calculates correct waterfall for standard sale', () => {
      const saleAmount = 5000;
      const fees = {
        tow: 150,
        admin: 50,
        storage: 450,
        lienProcessing: 100,
      };
      const lienholderOwed = 2000;

      const result = calculatePayoutWaterfall(saleAmount, fees, lienholderOwed);

      expect(result.auctionFee).toBe(500); // 10% of sale
      expect(result.towingOwed).toBe(150);
      expect(result.adminOwed).toBe(50);
      expect(result.storageOwed).toBe(450);
      expect(result.lienholderPayment).toBe(2000);
      expect(result.netToState).toBe(1850); // Remainder
    });

    it('handles insufficient funds scenario', () => {
      const saleAmount = 500;
      const fees = {
        tow: 150,
        admin: 50,
        storage: 450,
        lienProcessing: 100,
      };
      const lienholderOwed = 2000;

      const result = calculatePayoutWaterfall(saleAmount, fees, lienholderOwed);

      // Waterfall priority: auction fee -> tow -> admin -> storage -> lienholder
      expect(result.auctionFee).toBe(50); // 10% of sale
      expect(result.towingOwed).toBe(150);
      expect(result.adminOwed).toBe(50);
      expect(result.storageOwed).toBe(250); // Partial
      expect(result.lienholderPayment).toBe(0); // Nothing left
      expect(result.netToState).toBe(0);
    });
  });
});
```

#### VIN Validation Tests

```typescript
// apps/api/src/utils/__tests__/vinValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateVIN, decodeVINYear, calculateVINCheckDigit } from '../vinValidator';

describe('vinValidator', () => {
  describe('validateVIN', () => {
    it('accepts valid 17-character VIN', () => {
      expect(validateVIN('1HGBH41JXMN109186')).toBe(true);
    });

    it('rejects VIN with invalid length', () => {
      expect(validateVIN('1HGBH41JXMN10918')).toBe(false); // 16 chars
      expect(validateVIN('1HGBH41JXMN1091867')).toBe(false); // 18 chars
    });

    it('rejects VIN containing I, O, or Q', () => {
      expect(validateVIN('1HGBH41IXMN109186')).toBe(false); // Contains I
      expect(validateVIN('1HGBH41OXMN109186')).toBe(false); // Contains O
      expect(validateVIN('1HGBH41QXMN109186')).toBe(false); // Contains Q
    });

    it('rejects VIN with special characters', () => {
      expect(validateVIN('1HGBH41-XMN109186')).toBe(false);
      expect(validateVIN('1HGBH41 XMN109186')).toBe(false);
    });

    it('handles lowercase by converting to uppercase', () => {
      expect(validateVIN('1hgbh41jxmn109186')).toBe(true);
    });
  });

  describe('decodeVINYear', () => {
    it('correctly decodes year codes', () => {
      expect(decodeVINYear('A')).toBe(2010);
      expect(decodeVINYear('B')).toBe(2011);
      expect(decodeVINYear('M')).toBe(2021);
      expect(decodeVINYear('N')).toBe(2022);
      expect(decodeVINYear('R')).toBe(2024);
    });

    it('handles numeric year codes (1-9 = 2001-2009)', () => {
      expect(decodeVINYear('1')).toBe(2001);
      expect(decodeVINYear('9')).toBe(2009);
    });

    it('throws for invalid year codes', () => {
      expect(() => decodeVINYear('I')).toThrow();
      expect(() => decodeVINYear('O')).toThrow();
      expect(() => decodeVINYear('Q')).toThrow();
    });
  });

  describe('calculateVINCheckDigit', () => {
    it('calculates correct check digit', () => {
      // Position 9 is the check digit
      const vinWithoutCheck = '1HGBH41JXN109186';
      const expectedCheckDigit = 'M';
      expect(calculateVINCheckDigit(vinWithoutCheck)).toBe(expectedCheckDigit);
    });
  });
});
```

#### Status Transition Tests

```typescript
// apps/api/src/services/__tests__/vehicleCaseService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VehicleCaseService } from '../vehicleCaseService';
import { VehicleCaseStatus } from '@cinton/shared';
import { mockPrismaClient, mockAuditService } from '@test/helpers';

describe('VehicleCaseService', () => {
  let service: VehicleCaseService;
  let prisma: ReturnType<typeof mockPrismaClient>;
  let audit: ReturnType<typeof mockAuditService>;

  beforeEach(() => {
    prisma = mockPrismaClient();
    audit = mockAuditService();
    service = new VehicleCaseService(prisma, audit);
  });

  describe('changeStatus', () => {
    const validTransitions: [VehicleCaseStatus, VehicleCaseStatus][] = [
      [VehicleCaseStatus.PENDING_INTAKE, VehicleCaseStatus.INTAKE_COMPLETE],
      [VehicleCaseStatus.INTAKE_COMPLETE, VehicleCaseStatus.STORED],
      [VehicleCaseStatus.STORED, VehicleCaseStatus.HOLD],
      [VehicleCaseStatus.STORED, VehicleCaseStatus.RELEASE_ELIGIBLE],
      [VehicleCaseStatus.HOLD, VehicleCaseStatus.STORED],
      [VehicleCaseStatus.HOLD, VehicleCaseStatus.RELEASE_ELIGIBLE],
      [VehicleCaseStatus.RELEASE_ELIGIBLE, VehicleCaseStatus.RELEASED],
      [VehicleCaseStatus.AUCTION_ELIGIBLE, VehicleCaseStatus.AUCTION_LISTED],
      [VehicleCaseStatus.AUCTION_LISTED, VehicleCaseStatus.SOLD],
    ];

    it.each(validTransitions)(
      'allows transition from %s to %s',
      async (from, to) => {
        prisma.vehicleCase.findUnique.mockResolvedValue({
          id: 'case-1',
          status: from,
        });
        prisma.vehicleCase.update.mockResolvedValue({
          id: 'case-1',
          status: to,
        });

        const result = await service.changeStatus('case-1', to, 'user-1');

        expect(result.status).toBe(to);
        expect(audit.log).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'STATUS_CHANGE',
            entityId: 'case-1',
          })
        );
      }
    );

    const invalidTransitions: [VehicleCaseStatus, VehicleCaseStatus][] = [
      [VehicleCaseStatus.PENDING_INTAKE, VehicleCaseStatus.RELEASED],
      [VehicleCaseStatus.STORED, VehicleCaseStatus.SOLD],
      [VehicleCaseStatus.RELEASED, VehicleCaseStatus.STORED],
      [VehicleCaseStatus.SOLD, VehicleCaseStatus.AUCTION_LISTED],
    ];

    it.each(invalidTransitions)(
      'rejects transition from %s to %s',
      async (from, to) => {
        prisma.vehicleCase.findUnique.mockResolvedValue({
          id: 'case-1',
          status: from,
        });

        await expect(
          service.changeStatus('case-1', to, 'user-1')
        ).rejects.toThrow('Invalid status transition');
      }
    );
  });

  describe('release', () => {
    it('prevents release when police hold is active', async () => {
      prisma.vehicleCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: VehicleCaseStatus.RELEASE_ELIGIBLE,
        policeHold: true,
        holdExpiresAt: new Date(Date.now() + 86400000), // Tomorrow
        feeLedgerEntries: [],
      });

      await expect(
        service.release('case-1', {
          releasedTo: 'John Smith',
          releaseType: 'OWNER',
          identificationVerified: true,
        }, 'user-1')
      ).rejects.toThrow('Cannot release vehicle with active police hold');
    });

    it('prevents release with outstanding balance', async () => {
      prisma.vehicleCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: VehicleCaseStatus.RELEASE_ELIGIBLE,
        policeHold: false,
        feeLedgerEntries: [
          { amount: 150, voidedAt: null },
          { amount: 50, voidedAt: null },
          { amount: -100, voidedAt: null }, // Payment
        ],
      });

      await expect(
        service.release('case-1', {
          releasedTo: 'John Smith',
          releaseType: 'OWNER',
          identificationVerified: true,
        }, 'user-1')
      ).rejects.toThrow('Outstanding balance of $100.00 must be paid');
    });

    it('allows release when all conditions met', async () => {
      prisma.vehicleCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: VehicleCaseStatus.RELEASE_ELIGIBLE,
        policeHold: false,
        feeLedgerEntries: [
          { amount: 150, voidedAt: null },
          { amount: -150, voidedAt: null }, // Full payment
        ],
      });
      prisma.vehicleCase.update.mockResolvedValue({
        id: 'case-1',
        status: VehicleCaseStatus.RELEASED,
        releasedAt: expect.any(Date),
        releasedTo: 'John Smith',
      });

      const result = await service.release('case-1', {
        releasedTo: 'John Smith',
        releaseType: 'OWNER',
        identificationVerified: true,
      }, 'user-1');

      expect(result.status).toBe(VehicleCaseStatus.RELEASED);
      expect(result.releasedTo).toBe('John Smith');
    });
  });
});
```

---

## Integration Testing

### Database Test Setup

```typescript
// test/integration/setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient;

export async function setupTestDatabase(): Promise<PrismaClient> {
  // Use test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  // Reset database
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

  prisma = new PrismaClient();
  await prisma.$connect();

  return prisma;
}

export async function cleanupTestDatabase(): Promise<void> {
  // Clean all tables
  await prisma.$transaction([
    prisma.auditEvent.deleteMany(),
    prisma.caseDocument.deleteMany(),
    prisma.complianceNotice.deleteMany(),
    prisma.feeLedgerEntry.deleteMany(),
    prisma.auctionLot.deleteMany(),
    prisma.vehicleCase.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.agency.deleteMany(),
    prisma.policyConfig.deleteMany(),
  ]);
}

export async function teardownTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}
```

### API Route Integration Tests

```typescript
// test/integration/api/vehicleCase.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase } from '../setup';
import { createTestUser, createTestAgency, generateAuthToken } from '../helpers';

describe('Vehicle Case API', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let testUser: User;
  let testAgency: Agency;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();

    // Create test data
    testAgency = await createTestAgency(prisma);
    testUser = await createTestUser(prisma, { roleId: 'manager-role-id' });
    authToken = generateAuthToken(testUser);
  });

  describe('POST /trpc/vehicleCase.create', () => {
    it('creates a new vehicle case', async () => {
      const input = {
        vin: '1HGBH41JXMN109186',
        plateNumber: 'ABC1234',
        plateState: 'MI',
        vehicleType: 'SEDAN',
        vehicleClass: 'STANDARD',
        towDate: new Date().toISOString(),
        towReason: 'ABANDONED',
        towLocation: '123 Main St, Clinton Twp, MI',
        towingAgencyId: testAgency.id,
      };

      const response = await request(app)
        .post('/trpc/vehicleCase.create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body.result.data).toMatchObject({
        vin: '1HGBH41JXMN109186',
        plateNumber: 'ABC1234',
        status: 'PENDING_INTAKE',
        caseNumber: expect.stringMatching(/^\d{2}-\d{5}$/),
      });
    });

    it('validates VIN format', async () => {
      const input = {
        vin: 'INVALID',
        vehicleType: 'SEDAN',
        vehicleClass: 'STANDARD',
        towDate: new Date().toISOString(),
        towReason: 'ABANDONED',
        towLocation: '123 Main St',
      };

      const response = await request(app)
        .post('/trpc/vehicleCase.create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('VIN');
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .post('/trpc/vehicleCase.create')
        .send({});

      expect(response.status).toBe(401);
    });

    it('requires proper permissions', async () => {
      const viewerUser = await createTestUser(prisma, { roleId: 'viewer-role-id' });
      const viewerToken = generateAuthToken(viewerUser);

      const response = await request(app)
        .post('/trpc/vehicleCase.create')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(response.status).toBe(403);
    });
  });

  describe('GET /trpc/vehicleCase.search', () => {
    beforeEach(async () => {
      // Create test cases
      await prisma.vehicleCase.createMany({
        data: [
          {
            caseNumber: '26-00001',
            vin: '1HGBH41JXMN109186',
            plateNumber: 'ABC1234',
            plateState: 'MI',
            status: 'STORED',
            vehicleType: 'SEDAN',
            vehicleClass: 'STANDARD',
            towDate: new Date(),
            towReason: 'ABANDONED',
            towLocation: '123 Main St',
            createdById: testUser.id,
            updatedById: testUser.id,
          },
          {
            caseNumber: '26-00002',
            vin: '2HGFC2F59MH509186',
            plateNumber: 'XYZ5678',
            plateState: 'MI',
            status: 'HOLD',
            policeHold: true,
            vehicleType: 'SEDAN',
            vehicleClass: 'STANDARD',
            towDate: new Date(),
            towReason: 'ARREST',
            towLocation: '456 Oak Ave',
            createdById: testUser.id,
            updatedById: testUser.id,
          },
        ],
      });
    });

    it('searches by plate number', async () => {
      const response = await request(app)
        .get('/trpc/vehicleCase.search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ input: JSON.stringify({ plateNumber: 'ABC1234' }) });

      expect(response.status).toBe(200);
      expect(response.body.result.data.items).toHaveLength(1);
      expect(response.body.result.data.items[0].plateNumber).toBe('ABC1234');
    });

    it('filters by status', async () => {
      const response = await request(app)
        .get('/trpc/vehicleCase.search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ input: JSON.stringify({ status: ['HOLD'] }) });

      expect(response.status).toBe(200);
      expect(response.body.result.data.items).toHaveLength(1);
      expect(response.body.result.data.items[0].policeHold).toBe(true);
    });

    it('paginates results', async () => {
      const response = await request(app)
        .get('/trpc/vehicleCase.search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ input: JSON.stringify({ page: 1, pageSize: 1 }) });

      expect(response.status).toBe(200);
      expect(response.body.result.data.items).toHaveLength(1);
      expect(response.body.result.data.total).toBe(2);
      expect(response.body.result.data.totalPages).toBe(2);
    });
  });
});
```

### Daily Storage Accrual Job Test

```typescript
// test/integration/jobs/storageAccrual.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { StorageAccrualJob } from '@/jobs/storageAccrual';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase } from '../setup';
import { createTestVehicleCase, createTestFeeSchedule } from '../helpers';

describe('Storage Accrual Job', () => {
  let prisma: PrismaClient;
  let job: StorageAccrualJob;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    job = new StorageAccrualJob(prisma);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    await createTestFeeSchedule(prisma);
  });

  it('accrues storage for all stored vehicles', async () => {
    // Create test case stored 3 days ago
    const testCase = await createTestVehicleCase(prisma, {
      status: 'STORED',
      vehicleClass: 'STANDARD',
      intakeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    // Run job
    const result = await job.run(new Date());

    expect(result.processed).toBe(1);
    expect(result.feesAccrued).toBe(1);

    // Verify fee entry created
    const entries = await prisma.feeLedgerEntry.findMany({
      where: { vehicleCaseId: testCase.id },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].feeType).toBe('STORAGE_DAILY');
    expect(entries[0].amount).toBe(45.00); // Standard rate
  });

  it('is idempotent - does not double-charge', async () => {
    const testCase = await createTestVehicleCase(prisma, {
      status: 'STORED',
      vehicleClass: 'STANDARD',
      intakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    // Run job twice for same date
    await job.run(new Date());
    await job.run(new Date());

    // Should only have one fee entry for today
    const entries = await prisma.feeLedgerEntry.findMany({
      where: {
        vehicleCaseId: testCase.id,
        feeType: 'STORAGE_DAILY',
      },
    });

    expect(entries).toHaveLength(1);
  });

  it('uses correct rate based on vehicle class', async () => {
    const standardCase = await createTestVehicleCase(prisma, {
      status: 'STORED',
      vehicleClass: 'STANDARD',
      intakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const largeCase = await createTestVehicleCase(prisma, {
      status: 'STORED',
      vehicleClass: 'LARGE',
      intakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    await job.run(new Date());

    const standardFee = await prisma.feeLedgerEntry.findFirst({
      where: { vehicleCaseId: standardCase.id },
    });
    const largeFee = await prisma.feeLedgerEntry.findFirst({
      where: { vehicleCaseId: largeCase.id },
    });

    expect(standardFee?.amount).toBe(45.00);
    expect(largeFee?.amount).toBe(55.00);
  });

  it('skips released and disposed vehicles', async () => {
    await createTestVehicleCase(prisma, {
      status: 'RELEASED',
      vehicleClass: 'STANDARD',
      intakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    await createTestVehicleCase(prisma, {
      status: 'DISPOSED',
      vehicleClass: 'STANDARD',
      intakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const result = await job.run(new Date());

    expect(result.processed).toBe(0);
    expect(result.feesAccrued).toBe(0);
  });
});
```

---

## End-to-End Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test: Complete Intake Flow

```typescript
// e2e/intake-flow.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsYardOperator, generateTestVIN } from './helpers';

test.describe('Vehicle Intake Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsYardOperator(page);
  });

  test('completes full intake process', async ({ page }) => {
    // Navigate to new intake
    await page.click('[data-testid="new-intake-button"]');
    await expect(page).toHaveURL('/intake/new');

    // Step 1: Tow Request
    await page.selectOption('[name="towingAgencyId"]', { label: 'Clinton Township PD' });
    await page.fill('[name="towDate"]', '2026-02-14');
    await page.fill('[name="towTime"]', '14:30');
    await page.click('[data-testid="tow-reason-abandoned"]');
    await page.fill('[name="towLocation"]', '123 Main Street, Clinton Twp, MI');
    await page.click('[data-testid="continue-button"]');

    // Step 2: Vehicle Details
    const testVIN = generateTestVIN();
    await page.fill('[name="vin"]', testVIN);
    await expect(page.locator('[data-testid="vin-decoded"]')).toBeVisible({ timeout: 5000 });

    await page.fill('[name="plateNumber"]', 'TEST123');
    await page.selectOption('[name="plateState"]', 'MI');
    await page.click('[data-testid="continue-button"]');

    // Step 3: Photo Capture (mock in test)
    await page.click('[data-testid="photo-front"]');
    await page.click('[data-testid="mock-capture"]'); // Test helper button
    await page.click('[data-testid="photo-rear"]');
    await page.click('[data-testid="mock-capture"]');
    // ... continue for required photos

    await page.click('[data-testid="continue-button"]');

    // Step 4: Complete Intake
    await page.click('[data-testid="yard-location-B-3"]');
    await page.fill('[name="intakeNotes"]', 'Test intake notes');
    await page.click('[data-testid="complete-intake-button"]');

    // Verify success
    await expect(page.locator('[data-testid="intake-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="case-number"]')).toContainText(/\d{2}-\d{5}/);
  });

  test('validates required fields', async ({ page }) => {
    await page.click('[data-testid="new-intake-button"]');

    // Try to continue without filling required fields
    await page.click('[data-testid="continue-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="error-towLocation"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-towReason"]')).toBeVisible();
  });

  test('shows VIN decode error for invalid VIN', async ({ page }) => {
    await page.click('[data-testid="new-intake-button"]');
    await page.click('[data-testid="tow-reason-abandoned"]');
    await page.fill('[name="towLocation"]', '123 Main St');
    await page.click('[data-testid="continue-button"]');

    await page.fill('[name="vin"]', 'INVALID-VIN');
    await expect(page.locator('[data-testid="vin-error"]')).toContainText('Invalid VIN format');
  });
});
```

### E2E Test: Release Flow

```typescript
// e2e/release-flow.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsCashier, createTestCase, payBalance } from './helpers';

test.describe('Vehicle Release Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCashier(page);
  });

  test('releases vehicle after payment', async ({ page }) => {
    // Create a test case with balance
    const caseNumber = await createTestCase({
      status: 'RELEASE_ELIGIBLE',
      balance: 250.00,
    });

    // Search for case
    await page.fill('[data-testid="search-input"]', caseNumber);
    await page.click('[data-testid="search-button"]');
    await page.click(`[data-testid="case-${caseNumber}"]`);

    // Verify balance shown
    await expect(page.locator('[data-testid="balance-due"]')).toContainText('$250.00');

    // Record payment
    await page.fill('[name="paymentAmount"]', '250');
    await page.selectOption('[name="paymentMethod"]', 'CREDIT_CARD');
    await page.click('[data-testid="record-payment-button"]');

    // Verify balance updated
    await expect(page.locator('[data-testid="balance-due"]')).toContainText('$0.00');

    // Process release
    await page.click('[data-testid="process-release-button"]');

    // Fill release form
    await page.fill('[name="releasedTo"]', 'John Smith');
    await page.click('[data-testid="relationship-owner"]');
    await page.selectOption('[name="idType"]', 'DRIVERS_LICENSE');
    await page.fill('[name="idNumber"]', 'S123456789');
    await page.check('[name="identificationVerified"]');

    await page.click('[data-testid="complete-release-button"]');

    // Verify release completed
    await expect(page.locator('[data-testid="release-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Released');
  });

  test('prevents release with active hold', async ({ page }) => {
    const caseNumber = await createTestCase({
      status: 'HOLD',
      policeHold: true,
      balance: 0,
    });

    await page.fill('[data-testid="search-input"]', caseNumber);
    await page.click('[data-testid="search-button"]');
    await page.click(`[data-testid="case-${caseNumber}"]`);

    // Release button should be disabled
    await expect(page.locator('[data-testid="process-release-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="hold-warning"]')).toBeVisible();
  });
});
```

---

## Compliance Rule Validation

### Compliance Policy Tests

```typescript
// test/compliance/policyValidation.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PolicyService } from '@/services/policyService';
import { NoticeService } from '@/services/noticeService';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';
import { addDays, subDays } from 'date-fns';

describe('Compliance Policy Validation', () => {
  let prisma: PrismaClient;
  let policyService: PolicyService;
  let noticeService: NoticeService;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    policyService = new PolicyService(prisma);
    noticeService = new NoticeService(prisma);
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    await seedDefaultPolicy(prisma);
  });

  describe('Owner Notice Deadlines', () => {
    it('correctly calculates owner notice deadline', async () => {
      const intakeDate = new Date('2026-02-14');
      const deadlines = await policyService.calculateDeadlines(intakeDate);

      expect(deadlines.ownerNoticeDue).toEqual(new Date('2026-02-21')); // 7 days later
    });

    it('flags cases past owner notice deadline', async () => {
      // Create case intake 10 days ago (past 7-day deadline)
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 10),
        status: 'STORED',
      });

      const compliance = await policyService.getComplianceStatus(testCase.id);

      expect(compliance.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'Owner notice sent',
          met: false,
          overdue: true,
        })
      );
    });

    it('marks owner notice complete when sent', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 5),
        status: 'STORED',
      });

      await noticeService.sendOwnerNotice(testCase.id);

      const compliance = await policyService.getComplianceStatus(testCase.id);

      expect(compliance.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'Owner notice sent',
          met: true,
        })
      );
    });
  });

  describe('Auction Eligibility', () => {
    it('requires minimum storage days', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 20), // Only 20 days
        status: 'STORED',
      });

      const eligibility = await policyService.checkAuctionEligibility(testCase.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'Minimum storage period',
          met: false,
          detail: expect.stringContaining('20 of 30'),
        })
      );
    });

    it('requires all notices sent', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 45),
        status: 'STORED',
      });

      // Send owner notice but not TR-52P
      await noticeService.sendOwnerNotice(testCase.id);

      const eligibility = await policyService.checkAuctionEligibility(testCase.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'TR-52P filed with MDOS',
          met: false,
        })
      );
    });

    it('requires response period expired', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 45),
        status: 'STORED',
      });

      // Send notices recently (response period not expired)
      await prisma.complianceNotice.create({
        data: {
          vehicleCaseId: testCase.id,
          noticeType: 'OWNER_INITIAL',
          recipientType: 'REGISTERED_OWNER',
          sentAt: subDays(new Date(), 5), // Sent 5 days ago
          sendMethod: 'CERTIFIED_MAIL',
          responseDueAt: addDays(new Date(), 15), // Due in 15 days
        },
      });

      const eligibility = await policyService.checkAuctionEligibility(testCase.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'Owner response period expired',
          met: false,
        })
      );
    });

    it('blocks auction during pending hearing', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 45),
        status: 'STORED',
      });

      // Create notice with hearing requested
      await prisma.complianceNotice.create({
        data: {
          vehicleCaseId: testCase.id,
          noticeType: 'OWNER_INITIAL',
          recipientType: 'REGISTERED_OWNER',
          sentAt: subDays(new Date(), 25),
          sendMethod: 'CERTIFIED_MAIL',
          hearingRequested: true,
          hearingRequestedAt: subDays(new Date(), 10),
          hearingResult: null, // Pending
        },
      });

      const eligibility = await policyService.checkAuctionEligibility(testCase.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.checks).toContainEqual(
        expect.objectContaining({
          requirement: 'No pending hearing',
          met: false,
        })
      );
    });

    it('allows auction when all requirements met', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 45),
        status: 'STORED',
      });

      // Send all required notices with expired response periods
      await prisma.complianceNotice.createMany({
        data: [
          {
            vehicleCaseId: testCase.id,
            noticeType: 'OWNER_INITIAL',
            recipientType: 'REGISTERED_OWNER',
            sentAt: subDays(new Date(), 30),
            sendMethod: 'CERTIFIED_MAIL',
            responseDueAt: subDays(new Date(), 10),
            deliveryStatus: 'DELIVERED',
          },
          {
            vehicleCaseId: testCase.id,
            noticeType: 'MDOS_TR52P',
            recipientType: 'MDOS',
            sentAt: subDays(new Date(), 30),
            sendMethod: 'ELECTRONIC_FILING',
            deliveryStatus: 'DELIVERED',
          },
        ],
      });

      const eligibility = await policyService.checkAuctionEligibility(testCase.id);

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.checks.every(c => c.met)).toBe(true);
    });
  });

  describe('Hearing Deadlines', () => {
    it('validates hearing request within deadline', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 15),
      });

      const notice = await prisma.complianceNotice.create({
        data: {
          vehicleCaseId: testCase.id,
          noticeType: 'OWNER_INITIAL',
          recipientType: 'REGISTERED_OWNER',
          sentAt: subDays(new Date(), 10),
          responseDueAt: addDays(new Date(), 10), // 20 days from sent
        },
      });

      // Should succeed (within 20 days)
      await expect(
        policyService.requestHearing(notice.id, 'John Smith', 'PHONE')
      ).resolves.toBeDefined();
    });

    it('rejects hearing request past deadline', async () => {
      const testCase = await createTestVehicleCase(prisma, {
        intakeDate: subDays(new Date(), 45),
      });

      const notice = await prisma.complianceNotice.create({
        data: {
          vehicleCaseId: testCase.id,
          noticeType: 'OWNER_INITIAL',
          recipientType: 'REGISTERED_OWNER',
          sentAt: subDays(new Date(), 30),
          responseDueAt: subDays(new Date(), 10), // Expired
        },
      });

      await expect(
        policyService.requestHearing(notice.id, 'John Smith', 'PHONE')
      ).rejects.toThrow('Hearing request deadline has passed');
    });
  });
});
```

---

## Performance Testing

### Load Testing with k6

```javascript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'testpassword',
  }), { headers: { 'Content-Type': 'application/json' } });

  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Search cases (common operation)
  const searchRes = http.get(`${BASE_URL}/trpc/vehicleCase.search?input=${encodeURIComponent(JSON.stringify({}))}`, { headers });
  check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Get single case
  const caseRes = http.get(`${BASE_URL}/trpc/vehicleCase.getById?input=${encodeURIComponent(JSON.stringify({ id: 'test-case-id' }))}`, { headers });
  check(caseRes, {
    'get case status 200': (r) => r.status === 200,
    'get case response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
```

### Database Query Performance Tests

```typescript
// test/performance/queries.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Query Performance', () => {
  beforeAll(async () => {
    // Seed 10,000 test cases for performance testing
    await seedLargeDataset(10000);
  });

  it('searches cases in under 100ms with 10k records', async () => {
    const start = performance.now();

    await prisma.vehicleCase.findMany({
      where: {
        status: { in: ['STORED', 'HOLD'] },
        towDate: { gte: subDays(new Date(), 30) },
      },
      take: 20,
      orderBy: { towDate: 'desc' },
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('calculates fee balance in under 50ms', async () => {
    const testCaseId = 'case-with-many-fees';

    const start = performance.now();

    await prisma.feeLedgerEntry.aggregate({
      where: { vehicleCaseId: testCaseId, voidedAt: null },
      _sum: { amount: true },
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
```

---

## Security Testing

### Authentication Tests

```typescript
// test/security/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/app';

describe('Authentication Security', () => {
  it('rejects invalid JWT tokens', async () => {
    const response = await request(app)
      .get('/trpc/vehicleCase.search')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('rejects expired JWT tokens', async () => {
    const expiredToken = generateExpiredToken();

    const response = await request(app)
      .get('/trpc/vehicleCase.search')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('prevents timing attacks on login', async () => {
    const validEmail = 'user@example.com';
    const invalidEmail = 'nonexistent@example.com';

    // Time multiple attempts
    const validTimes: number[] = [];
    const invalidTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startValid = performance.now();
      await request(app).post('/api/auth/login').send({
        email: validEmail,
        password: 'wrongpassword',
      });
      validTimes.push(performance.now() - startValid);

      const startInvalid = performance.now();
      await request(app).post('/api/auth/login').send({
        email: invalidEmail,
        password: 'wrongpassword',
      });
      invalidTimes.push(performance.now() - startInvalid);
    }

    const avgValid = validTimes.reduce((a, b) => a + b) / validTimes.length;
    const avgInvalid = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;

    // Timing difference should be minimal (< 50ms)
    expect(Math.abs(avgValid - avgInvalid)).toBeLessThan(50);
  });
});
```

### Input Validation Tests

```typescript
// test/security/input.test.ts
import { describe, it, expect } from 'vitest';

describe('Input Validation Security', () => {
  it('prevents SQL injection in search', async () => {
    const maliciousInput = "'; DROP TABLE vehicle_cases; --";

    const response = await request(app)
      .get('/trpc/vehicleCase.search')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ input: JSON.stringify({ query: maliciousInput }) });

    // Should not error, just return no results
    expect(response.status).toBe(200);
    expect(response.body.result.data.items).toHaveLength(0);

    // Table should still exist
    const count = await prisma.vehicleCase.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('sanitizes XSS in text fields', async () => {
    const xssPayload = '<script>alert("xss")</script>';

    const response = await request(app)
      .post('/trpc/vehicleCase.create')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        towLocation: xssPayload,
        // ... other fields
      });

    // Should be stored but sanitized
    const created = response.body.result.data;
    expect(created.towLocation).not.toContain('<script>');
  });

  it('limits request body size', async () => {
    const largeBody = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB

    const response = await request(app)
      .post('/trpc/vehicleCase.create')
      .set('Authorization', `Bearer ${validToken}`)
      .send(largeBody);

    expect(response.status).toBe(413); // Payload Too Large
  });
});
```

---

## Test Data Management

### Test Fixtures

```typescript
// test/fixtures/index.ts
import { VehicleCase, FeeLedgerEntry, ComplianceNotice, User, Agency } from '@cinton/shared';

export const vehicleCaseFixtures = {
  stored: (): Partial<VehicleCase> => ({
    caseNumber: '26-00001',
    vin: '1HGBH41JXMN109186',
    plateNumber: 'TEST123',
    plateState: 'MI',
    status: 'STORED',
    vehicleType: 'SEDAN',
    vehicleClass: 'STANDARD',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    color: 'Blue',
    towDate: new Date(),
    intakeDate: new Date(),
    towReason: 'ABANDONED',
    towLocation: '123 Test St, Clinton Twp, MI',
    policeHold: false,
  }),

  onHold: (): Partial<VehicleCase> => ({
    ...vehicleCaseFixtures.stored(),
    status: 'HOLD',
    policeHold: true,
    holdExpiresAt: addDays(new Date(), 14),
    policeCaseNumber: '2026-CT-00001',
  }),

  releaseEligible: (): Partial<VehicleCase> => ({
    ...vehicleCaseFixtures.stored(),
    status: 'RELEASE_ELIGIBLE',
    intakeDate: subDays(new Date(), 5),
  }),
};

export const feeLedgerFixtures = {
  towFee: (amount = 150): Partial<FeeLedgerEntry> => ({
    feeType: 'TOW',
    description: 'Standard tow',
    amount,
    accrualDate: new Date(),
  }),

  dailyStorage: (amount = 45): Partial<FeeLedgerEntry> => ({
    feeType: 'STORAGE_DAILY',
    description: 'Daily storage',
    amount,
    accrualDate: new Date(),
  }),

  payment: (amount: number): Partial<FeeLedgerEntry> => ({
    feeType: 'PAYMENT',
    description: 'Payment received',
    amount: -amount,
    accrualDate: new Date(),
    paidAt: new Date(),
  }),
};
```

### Factory Functions

```typescript
// test/factories/index.ts
import { PrismaClient } from '@prisma/client';
import { vehicleCaseFixtures, feeLedgerFixtures } from '../fixtures';

export async function createTestVehicleCase(
  prisma: PrismaClient,
  overrides: Partial<VehicleCase> = {},
): Promise<VehicleCase> {
  const fixture = vehicleCaseFixtures.stored();

  return prisma.vehicleCase.create({
    data: {
      ...fixture,
      ...overrides,
      createdById: overrides.createdById || (await getOrCreateTestUser(prisma)).id,
      updatedById: overrides.updatedById || (await getOrCreateTestUser(prisma)).id,
    },
  });
}

export async function createTestCaseWithFees(
  prisma: PrismaClient,
  feeOverrides: { tow?: number; storage?: number; payments?: number[] } = {},
): Promise<{ vehicleCase: VehicleCase; fees: FeeLedgerEntry[] }> {
  const vehicleCase = await createTestVehicleCase(prisma);
  const fees: FeeLedgerEntry[] = [];

  // Add tow fee
  fees.push(
    await prisma.feeLedgerEntry.create({
      data: {
        vehicleCaseId: vehicleCase.id,
        ...feeLedgerFixtures.towFee(feeOverrides.tow || 150),
        createdById: vehicleCase.createdById,
      },
    })
  );

  // Add storage fees
  if (feeOverrides.storage) {
    fees.push(
      await prisma.feeLedgerEntry.create({
        data: {
          vehicleCaseId: vehicleCase.id,
          ...feeLedgerFixtures.dailyStorage(feeOverrides.storage),
          createdById: vehicleCase.createdById,
        },
      })
    );
  }

  // Add payments
  for (const payment of feeOverrides.payments || []) {
    fees.push(
      await prisma.feeLedgerEntry.create({
        data: {
          vehicleCaseId: vehicleCase.id,
          ...feeLedgerFixtures.payment(payment),
          createdById: vehicleCase.createdById,
        },
      })
    );
  }

  return { vehicleCase, fees };
}
```

### Database Seeding

```typescript
// packages/db/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { DEFAULT_MICHIGAN_POLICY, DEFAULT_FEE_SCHEDULE, SYSTEM_ROLES } from '@cinton/shared';

const prisma = new PrismaClient();

async function main() {
  // Create system roles
  for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        permissions: role.permissions,
        isSystem: true,
      },
    });
  }

  // Create default policies
  await prisma.policyConfig.upsert({
    where: { id: 'default-compliance-policy' },
    update: { config: DEFAULT_MICHIGAN_POLICY },
    create: {
      id: 'default-compliance-policy',
      policyType: 'COMPLIANCE_TIMELINE',
      name: 'Michigan Default',
      config: DEFAULT_MICHIGAN_POLICY,
      effectiveFrom: new Date('2026-01-01'),
    },
  });

  await prisma.policyConfig.upsert({
    where: { id: 'default-fee-schedule' },
    update: { config: DEFAULT_FEE_SCHEDULE },
    create: {
      id: 'default-fee-schedule',
      policyType: 'FEE_SCHEDULE',
      name: 'Standard Fees 2026',
      config: DEFAULT_FEE_SCHEDULE,
      effectiveFrom: new Date('2026-01-01'),
    },
  });

  // Create test agency
  await prisma.agency.upsert({
    where: { orisCode: 'MI0500000' },
    update: {},
    create: {
      name: 'Clinton Township Police Department',
      orisCode: 'MI0500000',
      agencyType: 'MUNICIPAL',
      contactEmail: 'dispatch@clintontownship.gov',
      apiEnabled: true,
      defaultHoldDays: 14,
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Running Tests

### NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "k6 run performance/load-test.js",
    "test:all": "pnpm test && pnpm test:integration && pnpm test:e2e"
  }
}
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
