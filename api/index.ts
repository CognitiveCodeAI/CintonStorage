import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from '../apps/api/src/routers';
import { createContext } from '../apps/api/src/trpc';

const app = express();

// CORS for Vercel deployments
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /\.vercel\.app$/,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC handler
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
