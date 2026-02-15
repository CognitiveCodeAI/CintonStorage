import { router, protectedProcedure } from '../trpc';
import { AuditEvent } from '@prisma/client';

interface CaseInfo {
  id: string;
  caseNumber: string;
  make: string | null;
  model: string | null;
}

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStored,
      readyToRelease,
      onHold,
      pendingIntake,
      auctionEligible,
      todayPayments,
    ] = await Promise.all([
      ctx.prisma.vehicleCase.count({
        where: {
          status: { in: ['STORED', 'HOLD', 'RELEASE_ELIGIBLE'] },
        },
      }),
      ctx.prisma.vehicleCase.count({
        where: { status: 'RELEASE_ELIGIBLE' },
      }),
      ctx.prisma.vehicleCase.count({
        where: { status: 'HOLD' },
      }),
      ctx.prisma.vehicleCase.count({
        where: { status: 'PENDING_INTAKE' },
      }),
      ctx.prisma.vehicleCase.count({
        where: { status: 'AUCTION_ELIGIBLE' },
      }),
      ctx.prisma.feeLedgerEntry.aggregate({
        where: {
          feeType: 'PAYMENT',
          createdAt: { gte: today },
          voidedAt: null,
        },
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

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const events = await ctx.prisma.auditEvent.findMany({
      where: {
        eventType: { in: ['CREATE', 'STATUS_CHANGE', 'PAYMENT_RECEIVED'] },
        entityType: 'VehicleCase',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get related case info
    const caseIds = [...new Set(events.map((e: AuditEvent) => e.entityId))];
    const cases = await ctx.prisma.vehicleCase.findMany({
      where: { id: { in: caseIds } },
      select: {
        id: true,
        caseNumber: true,
        make: true,
        model: true,
      },
    });

    const caseMap = new Map<string, CaseInfo>(cases.map((c: CaseInfo) => [c.id, c]));

    return events.map((event: AuditEvent) => {
      const caseInfo = caseMap.get(event.entityId);
      return {
        id: event.id,
        eventType: event.eventType,
        caseNumber: caseInfo?.caseNumber,
        vehicleDescription: caseInfo
          ? `${caseInfo.make || ''} ${caseInfo.model || ''}`.trim()
          : null,
        createdAt: event.createdAt,
        metadata: event.metadata,
      };
    });
  }),
});
