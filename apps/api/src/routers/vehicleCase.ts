import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createVehicleCaseSchema,
  completeIntakeSchema,
  searchCasesSchema,
  VehicleCaseStatus,
} from '@cinton/shared';
import { router, protectedProcedure } from '../trpc';
import { generateCaseNumber } from '../services/caseNumber';

export const vehicleCaseRouter = router({
  create: protectedProcedure
    .input(createVehicleCaseSchema)
    .mutation(async ({ ctx, input }) => {
      const caseNumber = await generateCaseNumber(ctx.prisma);

      const vehicleCase = await ctx.prisma.vehicleCase.create({
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
          vehicleType: input.vehicleType,
          vehicleClass: input.vehicleClass,
          towDate: input.towDate,
          towReason: input.towReason,
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

      // Create audit event
      await ctx.prisma.auditEvent.create({
        data: {
          eventType: 'CREATE',
          entityType: 'VehicleCase',
          entityId: vehicleCase.id,
          actorId: ctx.user.id,
          actorType: 'USER',
          metadata: { caseNumber },
        },
      });

      return vehicleCase;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
        include: {
          towingAgency: true,
          feeLedgerEntries: {
            where: { voidedAt: null },
            orderBy: { accrualDate: 'desc' },
          },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      // Calculate balance
      const totalCharges = vehicleCase.feeLedgerEntries
        .filter((f) => Number(f.amount) > 0)
        .reduce((sum, f) => sum + Number(f.amount), 0);
      const totalPayments = vehicleCase.feeLedgerEntries
        .filter((f) => Number(f.amount) < 0)
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
      const balance = totalCharges - totalPayments;

      return {
        ...vehicleCase,
        feeLedgerSummary: {
          totalCharges,
          totalPayments,
          balance,
        },
      };
    }),

  search: protectedProcedure
    .input(searchCasesSchema)
    .query(async ({ ctx, input }) => {
      const { query, status, limit, offset } = input;

      const where: Record<string, unknown> = {};

      if (status) {
        where.status = status;
      }

      if (query) {
        where.OR = [
          { caseNumber: { contains: query, mode: 'insensitive' } },
          { vin: { contains: query, mode: 'insensitive' } },
          { plateNumber: { contains: query, mode: 'insensitive' } },
          { ownerName: { contains: query, mode: 'insensitive' } },
          { make: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [cases, total] = await Promise.all([
        ctx.prisma.vehicleCase.findMany({
          where,
          include: {
            feeLedgerEntries: {
              where: { voidedAt: null },
              select: { amount: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.vehicleCase.count({ where }),
      ]);

      // Calculate balance for each case
      const casesWithBalance = cases.map((c) => {
        const totalCharges = c.feeLedgerEntries
          .filter((f) => Number(f.amount) > 0)
          .reduce((sum, f) => sum + Number(f.amount), 0);
        const totalPayments = c.feeLedgerEntries
          .filter((f) => Number(f.amount) < 0)
          .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
        const balance = totalCharges - totalPayments;

        const { feeLedgerEntries: _, ...rest } = c;
        return { ...rest, balance };
      });

      return {
        cases: casesWithBalance,
        total,
        hasMore: offset + limit < total,
      };
    }),

  completeIntake: protectedProcedure
    .input(completeIntakeSchema)
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.caseId },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      if (vehicleCase.status !== 'PENDING_INTAKE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Case is not in pending intake status',
        });
      }

      // Determine next status based on police hold
      const nextStatus = vehicleCase.policeHold
        ? VehicleCaseStatus.HOLD
        : VehicleCaseStatus.STORED;

      // Update case
      const updatedCase = await ctx.prisma.vehicleCase.update({
        where: { id: input.caseId },
        data: {
          status: nextStatus,
          yardLocation: input.yardLocation,
          intakeDate: new Date(),
          updatedById: ctx.user.id,
          metadata: {
            ...(vehicleCase.metadata as object || {}),
            intakeNotes: input.notes,
          },
        },
      });

      // Add initial fees
      const fees = [
        {
          vehicleCaseId: vehicleCase.id,
          feeType: 'TOW' as const,
          description: 'Standard tow fee',
          amount: 150.00,
          accrualDate: vehicleCase.towDate,
          createdById: ctx.user.id,
        },
        {
          vehicleCaseId: vehicleCase.id,
          feeType: 'ADMIN' as const,
          description: 'Administrative fee',
          amount: 50.00,
          accrualDate: vehicleCase.towDate,
          createdById: ctx.user.id,
        },
      ];

      await ctx.prisma.feeLedgerEntry.createMany({ data: fees });

      // Create audit event
      await ctx.prisma.auditEvent.create({
        data: {
          eventType: 'STATUS_CHANGE',
          entityType: 'VehicleCase',
          entityId: vehicleCase.id,
          actorId: ctx.user.id,
          actorType: 'USER',
          changes: {
            status: { old: 'PENDING_INTAKE', new: nextStatus },
            yardLocation: { old: null, new: input.yardLocation },
          },
        },
      });

      return updatedCase;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(VehicleCaseStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vehicleCase = await ctx.prisma.vehicleCase.findUnique({
        where: { id: input.id },
      });

      if (!vehicleCase) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Case not found' });
      }

      const updatedCase = await ctx.prisma.vehicleCase.update({
        where: { id: input.id },
        data: {
          status: input.status,
          updatedById: ctx.user.id,
        },
      });

      await ctx.prisma.auditEvent.create({
        data: {
          eventType: 'STATUS_CHANGE',
          entityType: 'VehicleCase',
          entityId: vehicleCase.id,
          actorId: ctx.user.id,
          actorType: 'USER',
          changes: {
            status: { old: vehicleCase.status, new: input.status },
          },
        },
      });

      return updatedCase;
    }),
});
