import { router, protectedProcedure } from '../trpc';

export const agencyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const agencies = await ctx.prisma.agency.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        agencyType: true,
        contactEmail: true,
        contactPhone: true,
      },
      orderBy: { name: 'asc' },
    });

    return agencies;
  }),
});
