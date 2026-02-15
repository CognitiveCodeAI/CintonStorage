# Software Development Guide: Impound Lot Management System

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Development Workflow](#development-workflow)
6. [Implementation Slices](#implementation-slices)
7. [Document Index](#document-index)

---

## Executive Summary

This Software Development Guide (SDG) provides comprehensive specifications for building a modern impound lot management system modeled after Garfield & Canal Service (Clinton Township, MI). The system manages the complete vehicle impound lifecycle: intake, storage, fee accrual, compliance tracking, release processing, and auction disposition.

### Target Users

| Role | Primary Functions |
|------|------------------|
| **Yard Operator** | Vehicle intake, photo documentation, yard placement |
| **Cashier** | Fee calculation, payment processing, release authorization |
| **Manager** | Reporting, compliance oversight, auction management |
| **Police Agency** | Case queries, clearance submissions, release authorizations |
| **Public** | Auction listings, vehicle search |

### Core Capabilities

- **Vehicle Case Management**: Full lifecycle from tow-in to disposition
- **Fee Ledger**: Automated daily storage accrual with configurable rates
- **Compliance Engine**: Michigan MCL-compliant notice tracking and timelines
- **Agency Portal**: Secure API for police department integrations
- **Auction Management**: Public listings, buyer registration, sales recording

---

## Business Context

### Impound Lot Operations Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VEHICLE LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │  INTAKE  │───▶│  STORED  │───▶│ ELIGIBLE │───▶│ DISPOSITION          │  │
│  │          │    │          │    │          │    │ ├─ Owner Release      │  │
│  │ • Tow-in │    │ • Fees   │    │ • Notices│    │ ├─ Lien Sale/Auction  │  │
│  │ • Photos │    │ • Accrual│    │ • Hearings│   │ ├─ Crusher/Salvage    │  │
│  │ • VIN    │    │ • Hold   │    │ • Clear  │    │ └─ Agency Transfer    │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Business Rules

1. **Storage Fees**: Accrue daily at midnight, configurable per vehicle class
2. **Police Holds**: Vehicles under investigation cannot be released until cleared
3. **Compliance Notices**: Michigan requires specific notices at defined intervals
4. **Lien Priority**: Fees must be paid in specific order (tow → admin → storage)
5. **Auction Eligibility**: Vehicles must meet notice and timeline requirements

### Michigan Compliance Requirements

The system must support (but not hardcode) Michigan MCL requirements:

| Requirement | MCL Reference | Configurable |
|-------------|---------------|--------------|
| Registered owner notice | MCL 257.252a | Timeline in days |
| MDOS TR-52P filing | MCL 257.252b | Filing deadline |
| Hearing request period | MCL 257.252d | Days allowed |
| Auction public notice | MCL 257.252e | Notice period |

---

## Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20+ | Server runtime |
| Language | TypeScript | 5.x | Type safety |
| Framework | Express.js | 4.x | HTTP server |
| API Layer | tRPC | 10.x | Type-safe APIs |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 5.x | Database access + migrations |
| Queue | BullMQ + Redis | 4.x | Background jobs |
| Validation | Zod | 3.x | Runtime validation |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18+ | UI framework |
| Language | TypeScript | 5.x | Type safety |
| Build Tool | Vite | 5.x | Development/build |
| Styling | Tailwind CSS | 3.x | Utility CSS |
| Components | shadcn/ui | latest | UI component library |
| Server State | TanStack Query | 5.x | Data fetching/caching |
| Forms | React Hook Form | 7.x | Form management |
| Router | TanStack Router | 1.x | Type-safe routing |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Authentication | JWT + RBAC | User auth + permissions |
| File Storage | S3-compatible | Photos, documents |
| PDF Generation | Puppeteer | Case packets, receipts |
| Unit Testing | Vitest | Fast unit tests |
| E2E Testing | Playwright | Browser automation |
| CI/CD | GitHub Actions | Automated pipelines |

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Web App       │   Mobile Web    │   Agency Portal │   Public Listings     │
│   (Staff)       │   (Yard Ops)    │   (Police API)  │   (Auction Page)      │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬────────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / LOAD BALANCER                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                                       │
         ▼                                                       ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────────┐
│         INTERNAL API            │     │           AGENCY API                 │
│         (tRPC)                  │     │           (REST + tRPC)             │
├─────────────────────────────────┤     ├─────────────────────────────────────┤
│ • Vehicle Case Management       │     │ • Case Queries                      │
│ • Fee Ledger                    │     │ • Clearance Submission              │
│ • Release Processing            │     │ • Release Authorization             │
│ • Compliance Tracking           │     │ • Webhook Notifications             │
│ • Auction Management            │     │ • Agency-specific Reports           │
└────────────────┬────────────────┘     └────────────────┬────────────────────┘
                 │                                        │
                 ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│ VehicleCase     │ FeeLedger       │ Compliance      │ Audit                 │
│ Service         │ Service         │ Service         │ Service               │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬────────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   PostgreSQL    │     Redis       │   S3 Storage    │   External APIs       │
│   (Primary DB)  │   (Queue/Cache) │   (Files)       │   (VIN Decode, etc)   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
```

### Monorepo Structure

```
cinton-storage/
├── apps/
│   ├── api/                    # Express + tRPC backend
│   │   ├── src/
│   │   │   ├── routers/        # tRPC routers
│   │   │   ├── services/       # Business logic
│   │   │   ├── jobs/           # BullMQ job handlers
│   │   │   ├── middleware/     # Auth, logging, etc.
│   │   │   └── utils/          # Helpers
│   │   └── package.json
│   ├── web/                    # React frontend (staff)
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── lib/            # Utilities
│   │   └── package.json
│   └── agency-portal/          # Agency-facing web UI
│       └── ...
├── packages/
│   ├── db/                     # Prisma schema + client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   ├── shared/                 # Shared types + Zod schemas
│   │   ├── src/
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── types/          # TypeScript types
│   │   │   └── constants/      # Shared constants
│   │   └── package.json
│   └── ui/                     # Shared UI components
│       └── ...
├── docs/                       # Documentation
├── schema/                     # API specs
├── scripts/                    # Dev/deploy scripts
├── package.json                # Root workspace
├── turbo.json                  # Turborepo config
└── tsconfig.base.json          # Base TS config
```

---

## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone <repo-url>
cd cinton-storage

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with local database credentials

# Start database (Docker)
docker compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Start development servers
pnpm dev
```

### Git Workflow

1. **Branch Naming**: `feature/slice-N-description`, `fix/issue-description`
2. **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
3. **Pull Requests**: Require passing CI + code review
4. **Merging**: Squash merge to main

### Code Quality

| Tool | Purpose | Config File |
|------|---------|-------------|
| ESLint | Linting | `eslint.config.js` |
| Prettier | Formatting | `.prettierrc` |
| TypeScript | Type checking | `tsconfig.json` |
| Vitest | Unit tests | `vitest.config.ts` |
| Playwright | E2E tests | `playwright.config.ts` |

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
```

---

## Implementation Slices

### Slice Dependency Graph

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────┐                                                  │
│  │ Slice 1  │ Foundation                                       │
│  │ (Base)   │ Auth, DB, Audit                                  │
│  └────┬─────┘                                                  │
│       │                                                        │
│       ▼                                                        │
│  ┌──────────┐                                                  │
│  │ Slice 2  │ Vehicle Intake                                   │
│  │          │ Case creation, photos, VIN                       │
│  └────┬─────┘                                                  │
│       │                                                        │
│       ├──────────────┬──────────────┐                          │
│       ▼              ▼              ▼                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                    │
│  │ Slice 3  │   │ Slice 5  │   │ Slice 8  │                    │
│  │ Fee Mgmt │   │ Compliance│   │ Agency   │                   │
│  └────┬─────┘   └────┬─────┘   │ Portal   │                    │
│       │              │         └──────────┘                    │
│       ▼              ▼                                         │
│  ┌──────────────────────┐                                      │
│  │      Slice 4         │ Release Workflow                     │
│  │ (Requires 3 + 5)     │                                      │
│  └──────────┬───────────┘                                      │
│             │                                                  │
│             ▼                                                  │
│  ┌──────────────────────┐                                      │
│  │      Slice 6         │ Auction Management                   │
│  │ (Requires 4)         │                                      │
│  └──────────┬───────────┘                                      │
│             │                                                  │
│             ▼                                                  │
│  ┌──────────────────────┐                                      │
│  │      Slice 7         │ Reporting & Export                   │
│  │ (Requires all)       │                                      │
│  └──────────────────────┘                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Slice Details

| Slice | Name | Dependencies | Estimated Effort |
|-------|------|--------------|------------------|
| 1 | Foundation | None | 2-3 days |
| 2 | Vehicle Intake | Slice 1 | 2-3 days |
| 3 | Fee Management | Slice 2 | 2 days |
| 4 | Release Workflow | Slices 3, 5 | 2-3 days |
| 5 | Compliance Tracking | Slice 2 | 3 days |
| 6 | Auction Management | Slice 4 | 2-3 days |
| 7 | Reporting & Export | Slices 1-6 | 2 days |
| 8 | Agency Portal/API | Slice 2 | 3 days |

---

## Document Index

| Document | Path | Description |
|----------|------|-------------|
| Domain Model | [`docs/domain-model.md`](docs/domain-model.md) | Entities, relationships, Prisma schema |
| API Specification | [`docs/api-spec.md`](docs/api-spec.md) | Internal tRPC/REST API design |
| Agency API | [`docs/agency-api.md`](docs/agency-api.md) | Police agency portal specification |
| UI/UX Flows | [`docs/ui-flows.md`](docs/ui-flows.md) | Screen designs and workflows |
| Compliance Policy | [`docs/compliance-policy.md`](docs/compliance-policy.md) | Michigan MCL compliance rules |
| Test Plan | [`docs/test-plan.md`](docs/test-plan.md) | Testing strategy and scenarios |
| Deployment Guide | [`docs/deployment.md`](docs/deployment.md) | Infrastructure and deployment |
| OpenAPI (Internal) | [`schema/openapi.yaml`](schema/openapi.yaml) | OpenAPI 3.0 specification |
| OpenAPI (Agency) | [`schema/agency-openapi.yaml`](schema/agency-openapi.yaml) | Agency API OpenAPI spec |
| Prisma Schema | [`schema/prisma.schema`](schema/prisma.schema) | Complete database schema |
| Developer Prompt | [`prompts/developer-llm-prompt.md`](prompts/developer-llm-prompt.md) | System prompt for dev LLM |

---

## Quick Start for Developer LLM

When implementing this system, follow these steps:

1. **Read the SDG** (this document) to understand the overall architecture
2. **Review the Domain Model** (`docs/domain-model.md`) for data structures
3. **Check the Implementation Slice** you're working on for specific requirements
4. **Follow the API Spec** (`docs/api-spec.md`) for endpoint design
5. **Implement tests** according to `docs/test-plan.md`
6. **Validate compliance** using `docs/compliance-policy.md`

### Key Principles

- **Type Safety**: Use Zod schemas shared between frontend and backend
- **Audit Everything**: All state changes must be logged to the audit trail
- **Configurable Policies**: Never hardcode compliance timelines or rates
- **Idempotent Jobs**: Background jobs must be safe to re-run
- **Mobile-First**: Yard operations UI must work on tablets/phones

---

## Appendix: Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/cinton_storage"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-secure-secret-key"
JWT_EXPIRES_IN="24h"

# S3 Storage
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="cinton-storage"

# External APIs
VIN_DECODE_API_KEY="your-vin-api-key"

# Feature Flags
ENABLE_AGENCY_PORTAL="true"
ENABLE_PUBLIC_AUCTION="true"
```

---

*End of SDG Master Document*
