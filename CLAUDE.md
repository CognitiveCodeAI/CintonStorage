# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cinton Storage is an impound lot management system managing the vehicle lifecycle: intake, storage, fee accrual, compliance, release, and auction. Built for Garfield & Canal Service (Clinton Township, MI) with Michigan MCL compliance requirements.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all dev servers (frontend + backend via Turborepo)
pnpm dev

# Build all packages (generates Prisma client first)
pnpm build

# Lint
pnpm lint

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations (development)
pnpm db:seed        # Seed test data
pnpm db:studio      # Open Prisma Studio GUI

# Frontend smoke tests (Playwright)
cd apps/web && pnpm test:smoke
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
apps/
  api/           # Express + tRPC backend (local dev only)
  web/           # React + Vite frontend
    api/         # Vercel serverless functions (production API)

packages/
  db/            # Prisma schema, migrations, client (@cinton/db)
  shared/        # Zod schemas, TypeScript types, enums (@cinton/shared)
```

### Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query, React Hook Form, react-router-dom
- **Backend**: Express + tRPC (local), Vercel serverless (prod)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT with bcrypt password hashing
- **Validation**: Zod schemas shared between frontend/backend

### API Architecture

**Local development**: `apps/api/` runs standalone Express server with tRPC
**Production (Vercel)**: `apps/web/api/index.ts` is a self-contained serverless function that duplicates tRPC routers

The Vercel function (`apps/web/api/index.ts`) is the production API - it contains its own tRPC setup and Prisma client instantiation. Changes to API logic must be made in both places or consolidated.

### tRPC Routers

- `auth` - login, me (current user)
- `dashboard` - stats (totalStored, readyToRelease, onHold, etc.)
- `vehicleCase` - create, getById, search, completeIntake, recordPayment, release
- `agency` - list agencies

### Key Domain Models (see `packages/db/prisma/schema.prisma`)

- `VehicleCase` - Core entity with status lifecycle (PENDING_INTAKE -> STORED/HOLD -> RELEASE_ELIGIBLE -> RELEASED)
- `FeeLedgerEntry` - Charges (positive amounts) and payments (negative amounts)
- `ComplianceNotice` - Michigan MCL notice tracking
- `PolicyConfig` - Configurable fee schedules and compliance timelines (never hardcode)
- `AuditEvent` - All state changes must be logged

### Frontend Routes

- `/login` - Authentication
- `/` - Dashboard with stats
- `/cases` - Case list with search/filter
- `/cases/:id` - Case detail with fees/actions
- `/intake/new` - Multi-step vehicle intake form

## Key Implementation Patterns

### Shared Types/Schemas
Import from `@cinton/shared` for Zod schemas and TypeScript enums. Both frontend forms and backend validation use the same schemas.

### Fee Calculations
Balance = sum of positive amounts (charges) - sum of absolute negative amounts (payments). Filter out voided entries.

### Status Transitions
- `PENDING_INTAKE` -> `STORED` (no hold) or `HOLD` (with police hold)
- `STORED` -> `RELEASE_ELIGIBLE` (when balance paid and no hold)
- Police holds block release regardless of payment status

### Case Numbers
Format: `YY-NNNNN` (e.g., `26-00001`). Generated via `CaseNumberSequence` table with year-based reset.

## Environment Variables

```bash
DATABASE_URL      # PostgreSQL connection string
clinton_JWT_SECRET  # JWT signing secret (note: production uses this name)
```

## Documentation

See `docs/` for detailed specs:
- `domain-model.md` - Entity relationships
- `api-spec.md` - tRPC API design
- `compliance-policy.md` - Michigan MCL rules (configurable via PolicyConfig)
- `SDG.md` - Full software development guide with implementation slices
