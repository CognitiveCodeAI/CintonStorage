import { createTRPCReact } from '@trpc/react-query';

// Using 'any' temporarily to decouple from @cinton/api workspace dependency
// This allows the frontend to build independently on Vercel
// Type safety can be restored later with path aliases to api/index.ts
export const trpc = createTRPCReact<any>();
