import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { initTRPC, TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Initialize Prisma
const prisma = new PrismaClient();

// JWT Payload interface
interface JwtPayload {
  userId: string;
  email: string;
}

// Context creation
const createContext = async (req: Request) => {
  let user: { id: string; email: string; name: string; roleId: string } | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.clinton_JWT_SECRET || 'cinton-default-secret') as JwtPayload;
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, roleId: true, active: true },
      });
      if (dbUser?.active) {
        user = dbUser;
      }
    } catch {
      // Invalid token
    }
  }

  return { user, prisma };
};

type Context = Awaited<ReturnType<typeof createContext>>;

// tRPC setup
const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Auth Router
const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { email: input.email },
      include: { role: true },
    });

    if (!user || !user.active) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.clinton_JWT_SECRET || 'cinton-default-secret',
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: { role: true },
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
    };
  }),
});

// Dashboard Router
const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStored, readyToRelease, onHold, pendingIntake, auctionEligible, todayPayments] =
      await Promise.all([
        ctx.prisma.vehicleCase.count({ where: { status: { in: ['STORED', 'HOLD', 'RELEASE_ELIGIBLE'] } } }),
        ctx.prisma.vehicleCase.count({ where: { status: 'RELEASE_ELIGIBLE' } }),
        ctx.prisma.vehicleCase.count({ where: { status: 'HOLD' } }),
        ctx.prisma.vehicleCase.count({ where: { status: 'PENDING_INTAKE' } }),
        ctx.prisma.vehicleCase.count({ where: { status: 'AUCTION_ELIGIBLE' } }),
        ctx.prisma.feeLedgerEntry.aggregate({
          where: { feeType: 'PAYMENT', createdAt: { gte: today }, voidedAt: null },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalStored,
      readyToRelease,
      onHold,
      pendingIntake,
      auctionEligible,
      todayRevenue: Math.abs(Number(todayPayments._sum.amount || 0)),
    };
  }),
});

// Vehicle Case Router
const vehicleCaseRouter = router({
  create: protectedProcedure
    .input(z.object({
      vin: z.string().optional(),
      plateNumber: z.string().optional(),
      plateState: z.string().optional(),
      year: z.number().optional(),
      make: z.string().optional(),
      model: z.string().optional(),
      color: z.string().optional(),
      vehicleType: z.string(),
      vehicleClass: z.string(),
      towDate: z.coerce.date(),
      towReason: z.string(),
      towLocation: z.string(),
      towingAgencyId: z.string().optional(),
      policeHold: z.boolean().default(false),
      policeCaseNumber: z.string().optional(),
      holdExpiresAt: z.coerce.date().optional(),
      ownerName: z.string().optional(),
      ownerAddress: z.string().optional(),
      ownerPhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const year = new Date().getFullYear() % 100;
      let seq = await ctx.prisma.caseNumberSequence.findUnique({ where: { year } });
      if (!seq) {
        seq = await ctx.prisma.caseNumberSequence.create({ data: { year, lastNumber: 0 } });
      }
      const updated = await ctx.prisma.caseNumberSequence.update({
        where: { year },
        data: { lastNumber: { increment: 1 } },
      });
      const caseNumber = `${year.toString().padStart(2, '0')}-${updated.lastNumber.toString().padStart(5, '0')}`;

      return ctx.prisma.vehicleCase.create({
        data: {
          caseNumber,
          status: 'PENDING_INTAKE',
          vin: input.vin || null,
          plateNumber: input.plateNumber || null,
          plateState: input.plateState || null,
          year: input.year || null,
          make: input.make || null,
          model: input.model || null,
          color: input.color || null,
          vehicleType: input.vehicleType as any,
          vehicleClass: input.vehicleClass as any,
          towDate: input.towDate,
          towReason: input.towReason as any,
          towLocation: input.towLocation,
          towingAgencyId: input.towingAgencyId || null,
          policeHold: input.policeHold,
          policeCaseNumber: input.policeCaseNumber || null,
          holdExpiresAt: input.holdExpiresAt || null,
          ownerName: input.ownerName || null,
          ownerAddress: input.ownerAddress || null,
          ownerPhone: input.ownerPhone || null,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
        include: {
          towingAgency: true,
          feeLedgerEntries: { where: { voidedAt: null }, orderBy: { accrualDate: 'desc' } },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      });
      if (!vehicleCase) throw new TRPCError({ code: 'NOT_FOUND' });

      const totalCharges = vehicleCase.feeLedgerEntries
        .filter((f: { amount: unknown }) => Number(f.amount) > 0)
        .reduce((sum: number, f: { amount: unknown }) => sum + Number(f.amount), 0);
      const totalPayments = vehicleCase.feeLedgerEntries
        .filter((f: { amount: unknown }) => Number(f.amount) < 0)
        .reduce((sum: number, f: { amount: unknown }) => sum + Math.abs(Number(f.amount)), 0);

      return { ...vehicleCase, feeLedgerSummary: { totalCharges, totalPayments, balance: totalCharges - totalPayments } };
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      if (input.query) {
        where.OR = [
          { caseNumber: { contains: input.query, mode: 'insensitive' } },
          { vin: { contains: input.query, mode: 'insensitive' } },
          { plateNumber: { contains: input.query, mode: 'insensitive' } },
          { ownerName: { contains: input.query, mode: 'insensitive' } },
        ];
      }

      const [cases, total] = await Promise.all([
        ctx.prisma.vehicleCase.findMany({
          where,
          include: { feeLedgerEntries: { where: { voidedAt: null }, select: { amount: true } } },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.vehicleCase.count({ where }),
      ]);

      const casesWithBalance = cases.map((c: typeof cases[0]) => {
        const totalCharges = c.feeLedgerEntries.filter((f: { amount: unknown }) => Number(f.amount) > 0)
          .reduce((sum: number, f: { amount: unknown }) => sum + Number(f.amount), 0);
        const totalPayments = c.feeLedgerEntries.filter((f: { amount: unknown }) => Number(f.amount) < 0)
          .reduce((sum: number, f: { amount: unknown }) => sum + Math.abs(Number(f.amount)), 0);
        const { feeLedgerEntries: _, ...rest } = c;
        return { ...rest, balance: totalCharges - totalPayments };
      });

      return { cases: casesWithBalance, total, hasMore: input.offset + input.limit < total };
    }),

  completeIntake: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
      yardLocation: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({ where: { id: input.caseId } });
      if (!vehicleCase) throw new TRPCError({ code: 'NOT_FOUND' });
      if (vehicleCase.status !== 'PENDING_INTAKE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Case not in pending intake status' });
      }

      const nextStatus = vehicleCase.policeHold ? 'HOLD' : 'STORED';

      const updated = await ctx.prisma.vehicleCase.update({
        where: { id: input.caseId },
        data: {
          status: nextStatus,
          yardLocation: input.yardLocation,
          intakeDate: new Date(),
          updatedById: ctx.user.id,
          metadata: { ...(vehicleCase.metadata as object || {}), intakeNotes: input.notes },
        },
      });

      await ctx.prisma.feeLedgerEntry.createMany({
        data: [
          { vehicleCaseId: vehicleCase.id, feeType: 'TOW', description: 'Standard tow fee', amount: 150, accrualDate: vehicleCase.towDate, createdById: ctx.user.id },
          { vehicleCaseId: vehicleCase.id, feeType: 'ADMIN', description: 'Administrative fee', amount: 50, accrualDate: vehicleCase.towDate, createdById: ctx.user.id },
        ],
      });

      return updated;
    }),

  recordPayment: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
      amount: z.number().positive(),
      paymentMethod: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({ where: { id: input.caseId } });
      if (!vehicleCase) throw new TRPCError({ code: 'NOT_FOUND' });
      if (vehicleCase.status === 'RELEASED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot record payment for released vehicle' });
      }

      // Create payment entry (negative amount for payment)
      await ctx.prisma.feeLedgerEntry.create({
        data: {
          vehicleCaseId: input.caseId,
          feeType: 'PAYMENT',
          description: `Payment (${input.paymentMethod})`,
          amount: -input.amount,
          accrualDate: new Date(),
          paidAt: new Date(),
          createdById: ctx.user.id,
        },
      });

      // Check if balance is now zero and update status
      const entries = await ctx.prisma.feeLedgerEntry.findMany({
        where: { vehicleCaseId: input.caseId, voidedAt: null },
      });
      const totalCharges = entries.filter((f: { amount: unknown }) => Number(f.amount) > 0)
        .reduce((sum: number, f: { amount: unknown }) => sum + Number(f.amount), 0);
      const totalPayments = entries.filter((f: { amount: unknown }) => Number(f.amount) < 0)
        .reduce((sum: number, f: { amount: unknown }) => sum + Math.abs(Number(f.amount)), 0);
      const balance = totalCharges - totalPayments;

      if (balance <= 0 && vehicleCase.status === 'STORED' && !vehicleCase.policeHold) {
        await ctx.prisma.vehicleCase.update({
          where: { id: input.caseId },
          data: { status: 'RELEASE_ELIGIBLE', updatedById: ctx.user.id },
        });
      }

      return { success: true, newBalance: balance };
    }),

  release: protectedProcedure
    .input(z.object({
      caseId: z.string().uuid(),
      releasedTo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({ where: { id: input.caseId } });
      if (!vehicleCase) throw new TRPCError({ code: 'NOT_FOUND' });
      if (vehicleCase.policeHold) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot release vehicle with police hold' });
      }

      return ctx.prisma.vehicleCase.update({
        where: { id: input.caseId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedTo: input.releasedTo,
          updatedById: ctx.user.id,
        },
      });
    }),
});

// Agency Router
const agencyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agency.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }),
});

// =============================================
// ADMIN ROUTERS
// =============================================

// Admin Users Router
const adminUsersRouter = router({
  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.count();
  }),

  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      includeInactive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (!input?.includeInactive) {
        where.active = true;
      }
      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: 'insensitive' } },
          { email: { contains: input.query, mode: 'insensitive' } },
        ];
      }
      return ctx.prisma.user.findMany({
        where,
        include: { role: true, agency: true },
        orderBy: { name: 'asc' },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(6),
      roleId: z.string().uuid(),
      agencyId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      return ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          roleId: input.roleId,
          agencyId: input.agencyId || null,
          active: true,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      roleId: z.string().uuid().optional(),
      agencyId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.email) {
        const existing = await ctx.prisma.user.findFirst({
          where: { email: data.email, NOT: { id } },
        });
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
        }
      }
      return ctx.prisma.user.update({
        where: { id },
        data: {
          ...data,
          agencyId: data.agencyId || null,
        },
      });
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({ where: { id: input.id } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { active: !user.active },
      });
    }),

  resetPassword: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, 10);
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
    }),
});

// Admin Roles Router
const adminRolesRouter = router({
  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.role.count();
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      permissions: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.role.findUnique({ where: { name: input.name } });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Role name already exists' });
      }
      return ctx.prisma.role.create({
        data: {
          name: input.name,
          description: input.description || null,
          permissions: input.permissions,
          isSystem: false,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.role.findUnique({ where: { id: input.id } });
      if (!role) throw new TRPCError({ code: 'NOT_FOUND' });
      if (role.isSystem && input.name && input.name !== role.name) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot rename system roles' });
      }
      if (input.name) {
        const existing = await ctx.prisma.role.findFirst({
          where: { name: input.name, NOT: { id: input.id } },
        });
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Role name already exists' });
        }
      }
      return ctx.prisma.role.update({
        where: { id: input.id },
        data: {
          name: role.isSystem ? role.name : (input.name || role.name),
          description: input.description ?? role.description,
          permissions: input.permissions || role.permissions,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.role.findUnique({
        where: { id: input.id },
        include: { _count: { select: { users: true } } },
      });
      if (!role) throw new TRPCError({ code: 'NOT_FOUND' });
      if (role.isSystem) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete system roles' });
      }
      if (role._count.users > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete role with assigned users' });
      }
      return ctx.prisma.role.delete({ where: { id: input.id } });
    }),
});

// Admin Agencies Router
const adminAgenciesRouter = router({
  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agency.count();
  }),

  list: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      includeInactive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (!input?.includeInactive) {
        where.active = true;
      }
      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: 'insensitive' } },
          { orisCode: { contains: input.query, mode: 'insensitive' } },
        ];
      }
      return ctx.prisma.agency.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      agencyType: z.string(),
      orisCode: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      defaultHoldDays: z.number().default(14),
      autoNotifyOnIntake: z.boolean().default(false),
      autoNotifyOnRelease: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.orisCode) {
        const existing = await ctx.prisma.agency.findUnique({ where: { orisCode: input.orisCode } });
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'ORIS code already exists' });
        }
      }
      return ctx.prisma.agency.create({
        data: {
          name: input.name,
          agencyType: input.agencyType as any,
          orisCode: input.orisCode || null,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone || null,
          address: input.address || null,
          defaultHoldDays: input.defaultHoldDays,
          autoNotifyOnIntake: input.autoNotifyOnIntake,
          autoNotifyOnRelease: input.autoNotifyOnRelease,
          active: true,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      agencyType: z.string().optional(),
      orisCode: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      defaultHoldDays: z.number().optional(),
      autoNotifyOnIntake: z.boolean().optional(),
      autoNotifyOnRelease: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.orisCode) {
        const existing = await ctx.prisma.agency.findFirst({
          where: { orisCode: data.orisCode, NOT: { id } },
        });
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'ORIS code already exists' });
        }
      }
      return ctx.prisma.agency.update({
        where: { id },
        data: {
          ...data,
          agencyType: data.agencyType as any,
          orisCode: data.orisCode || null,
          contactName: data.contactName || null,
          contactPhone: data.contactPhone || null,
          address: data.address || null,
        },
      });
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agency = await ctx.prisma.agency.findUnique({ where: { id: input.id } });
      if (!agency) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.agency.update({
        where: { id: input.id },
        data: { active: !agency.active },
      });
    }),
});

// Admin Fee Schedule Router
const adminFeeScheduleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const configs = await ctx.prisma.policyConfig.findMany({
      where: { policyType: 'FEE_SCHEDULE', effectiveTo: null },
      orderBy: { name: 'asc' },
    });

    // Define default fee types and their labels
    const feeTypes = [
      { feeType: 'TOW', label: 'Tow Fee', description: 'Standard tow service charge' },
      { feeType: 'ADMIN', label: 'Administrative Fee', description: 'Processing and paperwork fee' },
      { feeType: 'STORAGE_DAILY', label: 'Daily Storage', description: 'Per-day storage charge' },
      { feeType: 'GATE', label: 'Gate Fee', description: 'After-hours release fee' },
      { feeType: 'LIEN_PROCESSING', label: 'Lien Processing', description: 'Title/lien processing fee' },
      { feeType: 'TITLE_SEARCH', label: 'Title Search', description: 'Vehicle title search fee' },
      { feeType: 'NOTICE', label: 'Notice Fee', description: 'Compliance notice mailing fee' },
      { feeType: 'DOLLY', label: 'Dolly Service', description: 'Dolly/wheel-lift service' },
      { feeType: 'WINCH', label: 'Winch Service', description: 'Winch recovery service' },
      { feeType: 'MILEAGE', label: 'Mileage', description: 'Per-mile tow charge' },
    ];

    // Map configs to fee types, using defaults for missing configs
    const defaultAmounts: Record<string, number> = {
      TOW: 150,
      ADMIN: 50,
      STORAGE_DAILY: 45,
      GATE: 75,
      LIEN_PROCESSING: 100,
      TITLE_SEARCH: 50,
      NOTICE: 25,
      DOLLY: 75,
      WINCH: 100,
      MILEAGE: 5,
    };

    return feeTypes.map((ft) => {
      const config = configs.find((c) => c.name === ft.feeType);
      const configData = (config?.config || {}) as Record<string, unknown>;
      return {
        feeType: ft.feeType,
        label: ft.label,
        description: ft.description,
        baseAmount: (configData.baseAmount as number) ?? defaultAmounts[ft.feeType] ?? 0,
        vehicleClassAmounts: (configData.vehicleClassAmounts || {}) as Record<string, number>,
      };
    });
  }),

  update: protectedProcedure
    .input(z.object({
      feeType: z.string(),
      baseAmount: z.number().min(0),
      vehicleClassAmounts: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for existing config
      const existing = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'FEE_SCHEDULE', name: input.feeType, effectiveTo: null },
      });

      const config = {
        baseAmount: input.baseAmount,
        vehicleClassAmounts: input.vehicleClassAmounts || {},
      };

      if (existing) {
        // Archive old config
        await ctx.prisma.policyConfig.update({
          where: { id: existing.id },
          data: { effectiveTo: new Date() },
        });
      }

      // Create new config
      return ctx.prisma.policyConfig.create({
        data: {
          policyType: 'FEE_SCHEDULE',
          name: input.feeType,
          description: `Fee configuration for ${input.feeType}`,
          config,
          effectiveFrom: new Date(),
          createdById: ctx.user.id,
        },
      });
    }),
});

// Admin Yard Router
const adminYardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get yard configuration from PolicyConfig
    const config = await ctx.prisma.policyConfig.findFirst({
      where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
    });

    // Default yard configuration
    const defaultSections = [
      { id: 'section-a', name: 'Row A', prefix: 'A', spots: [] as { id: string; name: string; sectionId: string; vehicleClass?: string; active: boolean; occupied: boolean }[] },
      { id: 'section-b', name: 'Row B', prefix: 'B', spots: [] as { id: string; name: string; sectionId: string; vehicleClass?: string; active: boolean; occupied: boolean }[] },
      { id: 'section-c', name: 'Row C', prefix: 'C', spots: [] as { id: string; name: string; sectionId: string; vehicleClass?: string; active: boolean; occupied: boolean }[] },
    ];

    // Generate default spots for each section
    defaultSections.forEach((section) => {
      for (let i = 1; i <= 6; i++) {
        section.spots.push({
          id: `${section.id}-${i}`,
          name: `${section.prefix}-${i}`,
          sectionId: section.id,
          active: true,
          occupied: false,
        });
      }
    });

    if (!config) {
      // Get current occupied spots from vehicle cases
      const occupiedCases = await ctx.prisma.vehicleCase.findMany({
        where: {
          yardLocation: { not: null },
          status: { in: ['STORED', 'HOLD', 'RELEASE_ELIGIBLE'] },
        },
        select: { yardLocation: true },
      });
      const occupiedSpots = new Set(occupiedCases.map((c) => c.yardLocation));

      defaultSections.forEach((section) => {
        section.spots.forEach((spot) => {
          spot.occupied = occupiedSpots.has(spot.name);
        });
      });

      return { sections: defaultSections };
    }

    const configData = config.config as { sections?: typeof defaultSections };
    const sections = configData.sections || defaultSections;

    // Get current occupied spots
    const occupiedCases = await ctx.prisma.vehicleCase.findMany({
      where: {
        yardLocation: { not: null },
        status: { in: ['STORED', 'HOLD', 'RELEASE_ELIGIBLE'] },
      },
      select: { yardLocation: true },
    });
    const occupiedSpots = new Set(occupiedCases.map((c) => c.yardLocation));

    sections.forEach((section: typeof defaultSections[0]) => {
      section.spots.forEach((spot: typeof defaultSections[0]['spots'][0]) => {
        spot.occupied = occupiedSpots.has(spot.name);
      });
    });

    return { sections };
  }),

  createSection: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      prefix: z.string().min(1).max(2),
      spotsCount: z.number().min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const existingConfig = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
      });

      const sections = (existingConfig?.config as any)?.sections || [];
      const newSectionId = `section-${input.prefix.toLowerCase()}-${Date.now()}`;

      const newSpots = [];
      for (let i = 1; i <= input.spotsCount; i++) {
        newSpots.push({
          id: `${newSectionId}-${i}`,
          name: `${input.prefix}-${i}`,
          sectionId: newSectionId,
          active: true,
          occupied: false,
        });
      }

      const newSection = {
        id: newSectionId,
        name: input.name,
        prefix: input.prefix,
        spots: newSpots,
      };

      sections.push(newSection);

      if (existingConfig) {
        await ctx.prisma.policyConfig.update({
          where: { id: existingConfig.id },
          data: { config: { sections } },
        });
      } else {
        await ctx.prisma.policyConfig.create({
          data: {
            policyType: 'HOLD_DURATION',
            name: 'YARD_CONFIG',
            description: 'Yard section and spot configuration',
            config: { sections },
            effectiveFrom: new Date(),
            createdById: ctx.user.id,
          },
        });
      }

      return newSection;
    }),

  updateSection: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      prefix: z.string().min(1).max(2).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
      });

      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const sections = (config.config as any).sections || [];
      const sectionIndex = sections.findIndex((s: any) => s.id === input.id);
      if (sectionIndex === -1) throw new TRPCError({ code: 'NOT_FOUND' });

      if (input.name) sections[sectionIndex].name = input.name;
      if (input.prefix) {
        sections[sectionIndex].prefix = input.prefix;
        // Update spot names
        sections[sectionIndex].spots.forEach((spot: any, i: number) => {
          spot.name = `${input.prefix}-${i + 1}`;
        });
      }

      await ctx.prisma.policyConfig.update({
        where: { id: config.id },
        data: { config: { sections } },
      });

      return sections[sectionIndex];
    }),

  deleteSection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
      });

      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const sections = (config.config as any).sections || [];
      const sectionIndex = sections.findIndex((s: any) => s.id === input.id);
      if (sectionIndex === -1) throw new TRPCError({ code: 'NOT_FOUND' });

      sections.splice(sectionIndex, 1);

      await ctx.prisma.policyConfig.update({
        where: { id: config.id },
        data: { config: { sections } },
      });

      return { success: true };
    }),

  updateSpot: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      vehicleClass: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
      });

      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const sections = (config.config as any).sections || [];
      let found = false;

      for (const section of sections) {
        const spotIndex = section.spots.findIndex((s: any) => s.id === input.id);
        if (spotIndex !== -1) {
          if (input.name) section.spots[spotIndex].name = input.name;
          section.spots[spotIndex].vehicleClass = input.vehicleClass || undefined;
          found = true;
          break;
        }
      }

      if (!found) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.prisma.policyConfig.update({
        where: { id: config.id },
        data: { config: { sections } },
      });

      return { success: true };
    }),

  toggleSpot: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'YARD_CONFIG', effectiveTo: null },
      });

      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const sections = (config.config as any).sections || [];
      let spot: any = null;

      for (const section of sections) {
        const spotIndex = section.spots.findIndex((s: any) => s.id === input.id);
        if (spotIndex !== -1) {
          section.spots[spotIndex].active = !section.spots[spotIndex].active;
          spot = section.spots[spotIndex];
          break;
        }
      }

      if (!spot) throw new TRPCError({ code: 'NOT_FOUND' });

      await ctx.prisma.policyConfig.update({
        where: { id: config.id },
        data: { config: { sections } },
      });

      return spot;
    }),
});

// Admin Settings Router
const adminSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.policyConfig.findFirst({
      where: { policyType: 'HOLD_DURATION', name: 'SYSTEM_SETTINGS', effectiveTo: null },
    });

    const defaults = {
      businessName: 'Garfield & Canal Service',
      businessAddress: '',
      businessPhone: '',
      defaultState: 'MI',
      defaultVehicleType: 'SEDAN',
      defaultVehicleClass: 'STANDARD',
      defaultTowReason: 'ABANDONED',
      defaultPaymentMethod: 'CASH',
      alertThresholdDaysWarning: 14,
      alertThresholdDaysCritical: 30,
      alertThresholdBalance: 500,
    };

    if (!config) return defaults;

    return { ...defaults, ...(config.config as object) };
  }),

  update: protectedProcedure
    .input(z.object({
      businessName: z.string().optional(),
      businessAddress: z.string().optional(),
      businessPhone: z.string().optional(),
      defaultState: z.string().optional(),
      defaultVehicleType: z.string().optional(),
      defaultVehicleClass: z.string().optional(),
      defaultTowReason: z.string().optional(),
      defaultPaymentMethod: z.string().optional(),
      alertThresholdDaysWarning: z.number().optional(),
      alertThresholdDaysCritical: z.number().optional(),
      alertThresholdBalance: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.policyConfig.findFirst({
        where: { policyType: 'HOLD_DURATION', name: 'SYSTEM_SETTINGS', effectiveTo: null },
      });

      if (existing) {
        return ctx.prisma.policyConfig.update({
          where: { id: existing.id },
          data: { config: { ...(existing.config as object), ...input } },
        });
      }

      return ctx.prisma.policyConfig.create({
        data: {
          policyType: 'HOLD_DURATION',
          name: 'SYSTEM_SETTINGS',
          description: 'System-wide settings',
          config: input,
          effectiveFrom: new Date(),
          createdById: ctx.user.id,
        },
      });
    }),
});

// Combined Admin Router
const adminRouter = router({
  users: adminUsersRouter,
  roles: adminRolesRouter,
  agencies: adminAgenciesRouter,
  feeSchedule: adminFeeScheduleRouter,
  yard: adminYardRouter,
  settings: adminSettingsRouter,
});

// Combined App Router
const appRouter = router({
  auth: authRouter,
  dashboard: dashboardRouter,
  vehicleCase: vehicleCaseRouter,
  agency: agencyRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (req.url === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // tRPC handler
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    }),
    router: appRouter,
    createContext: () => createContext(new Request(url, { headers: req.headers as HeadersInit })),
  }).then(async (response) => {
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const body = await response.text();
    res.send(body);
  });
}
