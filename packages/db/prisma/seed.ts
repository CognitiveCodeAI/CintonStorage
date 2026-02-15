import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        'CASE_VIEW', 'CASE_CREATE', 'CASE_UPDATE', 'CASE_DELETE', 'CASE_RELEASE',
        'FEE_VIEW', 'FEE_CREATE', 'FEE_VOID', 'PAYMENT_RECORD',
        'NOTICE_VIEW', 'NOTICE_CREATE', 'NOTICE_UPDATE', 'HEARING_MANAGE',
        'AUCTION_VIEW', 'AUCTION_MANAGE', 'AUCTION_SELL',
        'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
        'REPORT_VIEW', 'REPORT_EXPORT',
        'USER_MANAGE', 'ROLE_MANAGE', 'AGENCY_MANAGE', 'POLICY_MANAGE', 'AUDIT_VIEW',
      ],
      isSystem: true,
    },
  });
  console.log('Created admin role:', adminRole.id);

  // Create cashier role
  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: {},
    create: {
      name: 'Cashier',
      description: 'Process payments and releases',
      permissions: [
        'CASE_VIEW', 'CASE_RELEASE',
        'FEE_VIEW', 'FEE_CREATE', 'PAYMENT_RECORD',
        'NOTICE_VIEW',
        'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD',
        'REPORT_VIEW',
      ],
      isSystem: true,
    },
  });
  console.log('Created cashier role:', cashierRole.id);

  // Create yard operator role
  const yardRole = await prisma.role.upsert({
    where: { name: 'Yard Operator' },
    update: {},
    create: {
      name: 'Yard Operator',
      description: 'Intake and yard operations',
      permissions: [
        'CASE_VIEW', 'CASE_CREATE', 'CASE_UPDATE',
        'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD',
      ],
      isSystem: true,
    },
  });
  console.log('Created yard role:', yardRole.id);

  // Create test agency
  const agency = await prisma.agency.upsert({
    where: { orisCode: 'MI0500100' },
    update: {},
    create: {
      name: 'Clinton Township Police Department',
      orisCode: 'MI0500100',
      agencyType: 'POLICE',
      contactName: 'Sgt. Mike Johnson',
      contactEmail: 'mjohnson@clintontownship.gov',
      contactPhone: '586-555-0100',
      address: '40700 Romeo Plank Rd, Clinton Township, MI 48038',
      defaultHoldDays: 14,
    },
  });
  console.log('Created agency:', agency.id);

  // Create admin user (password: admin123)
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cinton.com' },
    update: {},
    create: {
      email: 'admin@cinton.com',
      name: 'System Admin',
      passwordHash,
      roleId: adminRole.id,
      active: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create cashier user
  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@cinton.com' },
    update: {},
    create: {
      email: 'cashier@cinton.com',
      name: 'Jane Cashier',
      passwordHash,
      roleId: cashierRole.id,
      active: true,
    },
  });
  console.log('Created cashier user:', cashierUser.email);

  // Create yard user
  const yardUser = await prisma.user.upsert({
    where: { email: 'yard@cinton.com' },
    update: {},
    create: {
      email: 'yard@cinton.com',
      name: 'Bob Yard',
      passwordHash,
      roleId: yardRole.id,
      active: true,
    },
  });
  console.log('Created yard user:', yardUser.email);

  // Initialize case number sequence for current year
  const currentYear = new Date().getFullYear();
  const twoDigitYear = currentYear % 100;

  await prisma.caseNumberSequence.upsert({
    where: { year: twoDigitYear },
    update: {},
    create: {
      year: twoDigitYear,
      lastNumber: 0,
    },
  });
  console.log('Initialized case number sequence for year:', twoDigitYear);

  // Create sample vehicle cases
  const sampleCases = [
    {
      caseNumber: `${twoDigitYear}-00001`,
      status: 'STORED' as const,
      vin: '1HGBH41JXMN109186',
      plateNumber: 'ABC1234',
      plateState: 'MI',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      color: 'Blue',
      vehicleType: 'SEDAN' as const,
      vehicleClass: 'STANDARD' as const,
      towDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      intakeDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      towReason: 'ABANDONED' as const,
      towLocation: '123 Main Street, Clinton Township, MI',
      towingAgencyId: agency.id,
      yardLocation: 'A-1',
      ownerName: 'John Smith',
      ownerAddress: '456 Oak Avenue, Detroit, MI 48201',
      policeHold: false,
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      caseNumber: `${twoDigitYear}-00002`,
      status: 'HOLD' as const,
      vin: '2T1BURHE5HC123456',
      plateNumber: 'XYZ9876',
      plateState: 'MI',
      year: 2017,
      make: 'Toyota',
      model: 'Corolla',
      color: 'Silver',
      vehicleType: 'SEDAN' as const,
      vehicleClass: 'STANDARD' as const,
      towDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      intakeDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      towReason: 'ARREST' as const,
      towLocation: '789 Elm Street, Clinton Township, MI',
      towingAgencyId: agency.id,
      yardLocation: 'B-3',
      policeHold: true,
      holdExpiresAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
      policeCaseNumber: '2026-CT-00123',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      caseNumber: `${twoDigitYear}-00003`,
      status: 'RELEASE_ELIGIBLE' as const,
      vin: '3FA6P0H77HR123456',
      plateNumber: 'DEF5678',
      plateState: 'MI',
      year: 2019,
      make: 'Ford',
      model: 'Fusion',
      color: 'White',
      vehicleType: 'SEDAN' as const,
      vehicleClass: 'STANDARD' as const,
      towDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      intakeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      towReason: 'ILLEGALLY_PARKED' as const,
      towLocation: '321 Pine Road, Clinton Township, MI',
      towingAgencyId: agency.id,
      yardLocation: 'C-2',
      ownerName: 'Sarah Johnson',
      ownerAddress: '789 Maple Dr, Warren, MI 48092',
      ownerPhone: '586-555-1234',
      policeHold: false,
      releaseEligibleAt: new Date(),
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  // Update case number sequence
  await prisma.caseNumberSequence.update({
    where: { year: twoDigitYear },
    data: { lastNumber: 3 },
  });

  for (const caseData of sampleCases) {
    const vehicleCase = await prisma.vehicleCase.upsert({
      where: { caseNumber: caseData.caseNumber },
      update: {},
      create: caseData,
    });
    console.log('Created vehicle case:', vehicleCase.caseNumber);

    // Add fees for this case
    const fees = [
      {
        vehicleCaseId: vehicleCase.id,
        feeType: 'TOW' as const,
        description: 'Standard tow fee',
        amount: 150.00,
        accrualDate: vehicleCase.towDate,
        createdById: adminUser.id,
      },
      {
        vehicleCaseId: vehicleCase.id,
        feeType: 'ADMIN' as const,
        description: 'Administrative fee',
        amount: 50.00,
        accrualDate: vehicleCase.towDate,
        createdById: adminUser.id,
      },
    ];

    // Add daily storage fees
    const daysSinceIntake = Math.floor(
      (Date.now() - vehicleCase.towDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    for (let i = 1; i <= daysSinceIntake; i++) {
      const storageDate = new Date(vehicleCase.towDate);
      storageDate.setDate(storageDate.getDate() + i);
      fees.push({
        vehicleCaseId: vehicleCase.id,
        feeType: 'STORAGE_DAILY' as const,
        description: 'Daily storage fee',
        amount: 45.00,
        accrualDate: storageDate,
        createdById: adminUser.id,
      });
    }

    for (const fee of fees) {
      await prisma.feeLedgerEntry.create({ data: fee });
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
