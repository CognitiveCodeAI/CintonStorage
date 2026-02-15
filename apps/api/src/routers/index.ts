import { router } from '../trpc';
import { authRouter } from './auth';
import { vehicleCaseRouter } from './vehicleCase';
import { agencyRouter } from './agency';
import { dashboardRouter } from './dashboard';

export const appRouter = router({
  auth: authRouter,
  vehicleCase: vehicleCaseRouter,
  agency: agencyRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
