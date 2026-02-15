import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@cinton/api';

export const trpc = createTRPCReact<AppRouter>();
