# Deployment Guide

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Environment Configuration](#environment-configuration)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Database Management](#database-management)
5. [Monitoring & Logging](#monitoring--logging)
6. [Backup & Recovery](#backup--recovery)
7. [Security Hardening](#security-hardening)
8. [Scaling Considerations](#scaling-considerations)

---

## Infrastructure Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ENVIRONMENT                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   CloudFlare    │
                              │   (CDN + WAF)   │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  Load Balancer  │
                              │    (HAProxy)    │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
    ┌──────▼──────┐             ┌──────▼──────┐             ┌──────▼──────┐
    │   Web App   │             │   Web App   │             │   Web App   │
    │  (Node.js)  │             │  (Node.js)  │             │  (Node.js)  │
    │  Instance 1 │             │  Instance 2 │             │  Instance 3 │
    └──────┬──────┘             └──────┬──────┘             └──────┬──────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
   ┌─────▼─────┐                ┌──────▼──────┐               ┌──────▼──────┐
   │ PostgreSQL│                │    Redis    │               │     S3      │
   │  Primary  │◄──────────────▶│   Cluster   │               │   Storage   │
   │           │                │             │               │             │
   └─────┬─────┘                └─────────────┘               └─────────────┘
         │
   ┌─────▼─────┐
   │ PostgreSQL│
   │  Replica  │
   │  (Read)   │
   └───────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKGROUND SERVICES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐             │
│   │  BullMQ Worker │   │  BullMQ Worker │   │  Cron Service  │             │
│   │  (Fee Accrual) │   │  (Webhooks)    │   │  (Scheduled)   │             │
│   └────────────────┘   └────────────────┘   └────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resource Requirements

#### Minimum (Development/Staging)

| Component | Specification |
|-----------|--------------|
| API Server | 2 vCPU, 4GB RAM |
| PostgreSQL | 2 vCPU, 4GB RAM, 100GB SSD |
| Redis | 1 vCPU, 2GB RAM |
| S3 Storage | 100GB |

#### Production (Recommended)

| Component | Specification |
|-----------|--------------|
| API Server (x3) | 4 vCPU, 8GB RAM each |
| PostgreSQL Primary | 4 vCPU, 16GB RAM, 500GB SSD |
| PostgreSQL Replica | 4 vCPU, 16GB RAM, 500GB SSD |
| Redis Cluster (3 nodes) | 2 vCPU, 4GB RAM each |
| S3 Storage | 1TB+ |
| Load Balancer | Managed service |

---

## Environment Configuration

### Environment Variables

```bash
# .env.production.example

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@db-host:5432/cinton_storage?sslmode=require"
DATABASE_POOL_SIZE=20
DATABASE_READ_REPLICA_URL="postgresql://user:password@db-replica:5432/cinton_storage?sslmode=require"

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://:password@redis-cluster:6379"
REDIS_TLS=true

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET="your-256-bit-secret-key-here"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Password hashing (bcrypt rounds)
BCRYPT_ROUNDS=12

# Session
SESSION_SECRET="your-session-secret-here"

# ============================================
# S3 STORAGE
# ============================================
S3_ENDPOINT="https://s3.us-east-1.amazonaws.com"
S3_REGION="us-east-1"
S3_ACCESS_KEY="AKIAIOSFODNN7EXAMPLE"
S3_SECRET_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
S3_BUCKET="cinton-storage-prod"
S3_CDN_URL="https://cdn.cintonstorage.com"

# ============================================
# EXTERNAL SERVICES
# ============================================
# VIN Decode API
VIN_DECODE_API_URL="https://vpic.nhtsa.dot.gov/api"
VIN_DECODE_API_KEY=""

# Email (SMTP)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
SMTP_FROM="noreply@cintonstorage.com"

# ============================================
# SECURITY
# ============================================
# CORS origins (comma-separated)
CORS_ORIGINS="https://app.cintonstorage.com,https://agency.cintonstorage.com"

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# MONITORING
# ============================================
SENTRY_DSN="https://xxx@sentry.io/project"
DATADOG_API_KEY=""

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_AGENCY_PORTAL=true
ENABLE_PUBLIC_AUCTION=true
ENABLE_VIN_DECODE=true
```

### Secrets Management

```yaml
# Using AWS Secrets Manager or similar

# secrets/production/database.json
{
  "DATABASE_URL": "postgresql://...",
  "DATABASE_READ_REPLICA_URL": "postgresql://..."
}

# secrets/production/auth.json
{
  "JWT_SECRET": "...",
  "SESSION_SECRET": "..."
}

# secrets/production/services.json
{
  "S3_ACCESS_KEY": "...",
  "S3_SECRET_KEY": "...",
  "SMTP_PASSWORD": "..."
}
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER api

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 2G

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: cinton_storage
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 16G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

volumes:
  postgres_data:
  redis_data:
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
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
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.event.inputs.environment == 'staging'
    environment: staging

    steps:
      - name: Deploy to Staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: deploy
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/cinton-storage
            docker compose pull
            docker compose up -d --remove-orphans
            docker compose exec -T api npx prisma migrate deploy

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.event.inputs.environment == 'production'
    environment: production

    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: deploy
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/cinton-storage

            # Blue-green deployment
            export NEW_VERSION=${{ github.sha }}

            # Pull new image
            docker compose -f docker-compose.production.yml pull

            # Start new containers
            docker compose -f docker-compose.production.yml up -d --no-deps --scale api=6 api

            # Wait for health checks
            sleep 30

            # Run migrations
            docker compose -f docker-compose.production.yml exec -T api npx prisma migrate deploy

            # Scale down to target replicas
            docker compose -f docker-compose.production.yml up -d --no-deps --scale api=3 api

            # Clean up old containers
            docker image prune -f
```

### Database Migrations

```yaml
# .github/workflows/migrations.yml
name: Database Migrations

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production
      action:
        description: 'Migration action'
        required: true
        type: choice
        options:
          - deploy
          - rollback
          - status

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: Check Migration Status
        if: github.event.inputs.action == 'status'
        run: npx prisma migrate status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy Migrations
        if: github.event.inputs.action == 'deploy'
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Rollback Migration
        if: github.event.inputs.action == 'rollback'
        run: |
          echo "Manual rollback required - see docs/deployment.md"
          exit 1
```

---

## Database Management

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30

# Create backup
pg_dump \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/cinton_storage_${TIMESTAMP}.dump" \
  "${DATABASE_URL}"

# Upload to S3
aws s3 cp \
  "${BACKUP_DIR}/cinton_storage_${TIMESTAMP}.dump" \
  "s3://${BACKUP_BUCKET}/postgres/cinton_storage_${TIMESTAMP}.dump" \
  --storage-class STANDARD_IA

# Cleanup old local backups
find "${BACKUP_DIR}" -name "*.dump" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: cinton_storage_${TIMESTAMP}.dump"
```

### Automated Backups (Cron)

```yaml
# kubernetes/cronjob-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - /scripts/backup-database.sh
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: database-credentials
                      key: url
                - name: BACKUP_BUCKET
                  value: cinton-backups
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                - name: backups
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: scripts
              configMap:
                name: backup-scripts
            - name: backups
              persistentVolumeClaim:
                claimName: backup-storage
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: restore-database.sh <backup-file>"
  exit 1
fi

# Download from S3 if needed
if [[ "$BACKUP_FILE" == s3://* ]]; then
  LOCAL_FILE="/tmp/restore_$(date +%s).dump"
  aws s3 cp "$BACKUP_FILE" "$LOCAL_FILE"
  BACKUP_FILE="$LOCAL_FILE"
fi

# Create new database
psql "${DATABASE_URL}" -c "CREATE DATABASE cinton_storage_restore;"

# Restore
pg_restore \
  --dbname="cinton_storage_restore" \
  --jobs=4 \
  --verbose \
  "$BACKUP_FILE"

# Verify
psql "${DATABASE_URL/cinton_storage/cinton_storage_restore}" -c "SELECT COUNT(*) FROM vehicle_cases;"

echo "Restore completed. Verify data, then rename databases to swap."
```

### Migration Best Practices

```typescript
// packages/db/prisma/migrations/YYYYMMDDHHMMSS_example/migration.sql

-- Migration: Add auction_lot_status column
-- Safe: Yes (additive change)
-- Rollback: DROP COLUMN

-- Step 1: Add column as nullable
ALTER TABLE auction_lots ADD COLUMN new_status VARCHAR(50);

-- Step 2: Backfill data
UPDATE auction_lots SET new_status = status WHERE new_status IS NULL;

-- Step 3: Add NOT NULL constraint (after backfill verified)
-- Run in separate migration after confirming backfill
-- ALTER TABLE auction_lots ALTER COLUMN new_status SET NOT NULL;
```

---

## Monitoring & Logging

### Logging Configuration

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }),
});

// Request logging middleware
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customProps: (req) => ({
    requestId: req.id,
    userId: req.user?.id,
  }),
});
```

### Health Check Endpoints

```typescript
// apps/api/src/routes/health.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health/ready', async (req, res) => {
  const checks: Record<string, boolean> = {};

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    // Redis check
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  try {
    // S3 check
    await s3.headBucket({ Bucket: process.env.S3_BUCKET });
    checks.storage = true;
  } catch {
    checks.storage = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});
```

### Metrics Collection

```typescript
// apps/api/src/lib/metrics.ts
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const jobProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});
```

### Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: cinton-storage
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is above 5% for the last 5 minutes

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High API latency detected
          description: 95th percentile latency is above 1 second

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > pg_settings_max_connections * 0.8
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Database connection pool nearly exhausted
          description: More than 80% of database connections are in use

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Low disk space
          description: Less than 10% disk space remaining

      - alert: JobQueueBacklog
        expr: bullmq_queue_waiting > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Job queue backlog growing
          description: More than 1000 jobs waiting in queue
```

---

## Backup & Recovery

### Backup Schedule

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| PostgreSQL (full) | Daily 2AM | 30 days | S3 Standard-IA |
| PostgreSQL (incremental) | Every 6 hours | 7 days | S3 Standard |
| Redis (RDB) | Every hour | 24 hours | S3 Standard |
| S3 Documents | Versioned | 90 days | S3 with versioning |
| Audit Logs | Daily archive | 7 years | S3 Glacier |

### Disaster Recovery Plan

```markdown
## Recovery Time Objectives (RTO/RPO)

| Scenario | RPO | RTO | Procedure |
|----------|-----|-----|-----------|
| Instance failure | 0 | 5 min | Auto-scaling replaces |
| Database corruption | 6 hours | 2 hours | Restore from backup |
| Region failure | 24 hours | 4 hours | Cross-region restore |
| Complete data loss | 24 hours | 8 hours | Full restore from S3 |

## Recovery Steps

### 1. Database Recovery

1. Identify most recent valid backup
2. Provision new RDS instance
3. Restore from backup
4. Verify data integrity
5. Update connection strings
6. Resume services

### 2. Application Recovery

1. Confirm infrastructure availability
2. Deploy latest stable image
3. Verify database connectivity
4. Run health checks
5. Enable traffic

### 3. Data Verification

1. Compare record counts
2. Verify recent transactions
3. Check audit log continuity
4. Validate financial totals
```

### Point-in-Time Recovery

```bash
#!/bin/bash
# scripts/pitr-restore.sh

TARGET_TIME=$1  # Format: YYYY-MM-DD HH:MM:SS

# For AWS RDS
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier cinton-storage-prod \
  --target-db-instance-identifier cinton-storage-pitr \
  --restore-time "$TARGET_TIME" \
  --db-instance-class db.r6g.large \
  --vpc-security-group-ids sg-xxx

# Wait for instance
aws rds wait db-instance-available \
  --db-instance-identifier cinton-storage-pitr

echo "PITR restore complete. New instance: cinton-storage-pitr"
```

---

## Security Hardening

### Network Security

```yaml
# terraform/security.tf (conceptual)

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# Private subnets for application
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# Security group for API servers
resource "aws_security_group" "api" {
  name   = "cinton-api"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for database
resource "aws_security_group" "database" {
  name   = "cinton-database"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }
}
```

### SSL/TLS Configuration

```nginx
# nginx/ssl.conf

ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

ssl_certificate /etc/ssl/certs/cinton-storage.crt;
ssl_certificate_key /etc/ssl/private/cinton-storage.key;

ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

ssl_stapling on;
ssl_stapling_verify on;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### Security Headers Middleware

```typescript
// apps/api/src/middleware/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://cdn.cintonstorage.com'],
      connectSrc: ["'self'", 'https://api.cintonstorage.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});
```

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinton-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cinton-api
  template:
    metadata:
      labels:
        app: cinton-api
    spec:
      containers:
        - name: api
          image: ghcr.io/cinton/api:latest
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cinton-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cinton-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Database Read Replicas

```typescript
// apps/api/src/lib/db.ts
import { PrismaClient } from '@prisma/client';

// Primary for writes
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Replica for reads
export const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_REPLICA_URL || process.env.DATABASE_URL,
    },
  },
});

// Usage in services
export class VehicleCaseService {
  async search(filters: SearchFilters) {
    // Use read replica for search
    return prismaRead.vehicleCase.findMany({
      where: buildWhereClause(filters),
      // ...
    });
  }

  async create(data: CreateInput) {
    // Use primary for writes
    return prisma.vehicleCase.create({
      data,
    });
  }
}
```

### Caching Strategy

```typescript
// apps/api/src/lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Usage with cache-aside pattern
export async function getFeeSchedule(): Promise<FeeScheduleConfig> {
  const cacheKey = 'policy:fee-schedule:current';

  let schedule = await cache.get<FeeScheduleConfig>(cacheKey);
  if (schedule) {
    return schedule;
  }

  schedule = await prisma.policyConfig.findFirst({
    where: { policyType: 'FEE_SCHEDULE', effectiveTo: null },
  });

  await cache.set(cacheKey, schedule, 3600); // 1 hour
  return schedule;
}
```

---

## Runbooks

### Common Operations

#### Deploy New Version

```bash
# 1. Tag release
git tag v1.2.3
git push origin v1.2.3

# 2. Trigger deployment
gh workflow run deploy.yml -f environment=production

# 3. Monitor rollout
kubectl rollout status deployment/cinton-api

# 4. Verify health
curl https://api.cintonstorage.com/health/ready
```

#### Scale Workers

```bash
# Scale BullMQ workers
kubectl scale deployment cinton-worker --replicas=5

# Verify queue processing
curl https://api.cintonstorage.com/admin/queues
```

#### Emergency Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/cinton-api

# Or rollback to specific revision
kubectl rollout undo deployment/cinton-api --to-revision=3

# Verify
kubectl rollout status deployment/cinton-api
```

#### Database Maintenance

```bash
# Run VACUUM ANALYZE
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Reindex tables
psql $DATABASE_URL -c "REINDEX TABLE vehicle_cases;"

# Check table bloat
psql $DATABASE_URL -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
"
```
