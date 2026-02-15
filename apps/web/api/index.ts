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

// Combined App Router
const appRouter = router({
  auth: authRouter,
  dashboard: dashboardRouter,
  vehicleCase: vehicleCaseRouter,
  agency: agencyRouter,
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
