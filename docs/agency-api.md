# Police Agency Portal & API Specification

## Version: 1.0.0
## Last Updated: 2026-02-14

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization & Scopes](#authorization--scopes)
4. [API Endpoints](#api-endpoints)
5. [Webhooks](#webhooks)
6. [Rate Limiting](#rate-limiting)
7. [Security Considerations](#security-considerations)
8. [Integration Guide](#integration-guide)

---

## Overview

The Agency API provides secure access for police departments and other authorized agencies to:

- Query vehicle cases by plate, VIN, date range, or status
- Submit clearance requests for held vehicles
- Authorize vehicle releases
- Receive real-time notifications via webhooks
- Generate agency-specific reports

### API Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENCY API LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   API Gateway   │    │  Rate Limiter   │    │   Audit Logger  │         │
│  │   (Express)     │───▶│   (Redis)       │───▶│                 │         │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘         │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Authentication Layer                          │   │
│  │  ┌───────────────────┐         ┌───────────────────┐                │   │
│  │  │   API Key Auth    │   OR    │   OAuth 2.0       │                │   │
│  │  │   (X-API-Key)     │         │   (Bearer Token)  │                │   │
│  │  └───────────────────┘         └───────────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Agency API Router                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Cases     │  │  Clearance  │  │   Release   │  │  Reports   │  │   │
│  │  │   Query     │  │  Submit     │  │   Authorize │  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Webhook Dispatcher                            │   │
│  │                     (BullMQ + Retry Logic)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Base URL

```
Production: https://api.cintonstorage.com/agency/v1
Staging:    https://staging-api.cintonstorage.com/agency/v1
```

---

## Authentication

The Agency API supports two authentication methods:

### 1. API Key Authentication

Simple authentication using a static API key. Best for server-to-server integrations.

```http
GET /agency/v1/cases
X-API-Key: ak_live_abc123def456ghi789
```

#### API Key Management

```typescript
// API Key structure
interface AgencyApiKey {
  id: string;
  agencyId: string;
  keyHash: string;        // SHA-256 hash of key
  prefix: string;         // First 8 chars for identification (ak_live_abc)
  name: string;           // Human-readable name
  scopes: string[];       // Authorized scopes
  ipWhitelist: string[];  // Optional IP restrictions
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}
```

#### Key Format

```
ak_{environment}_{random_32_chars}

Examples:
- ak_live_abc123def456ghi789jkl012mno345
- ak_test_xyz789abc123def456ghi789jkl012
```

### 2. OAuth 2.0 Authentication

Full OAuth 2.0 flow for agencies requiring user-level authentication.

#### Authorization Code Flow

```
┌─────────┐                              ┌─────────────┐
│ Agency  │                              │  Cinton     │
│ App     │                              │  Auth       │
└────┬────┘                              └──────┬──────┘
     │                                          │
     │  1. Redirect to /oauth/authorize         │
     │  ─────────────────────────────────────▶  │
     │                                          │
     │  2. User authenticates & consents        │
     │  ◀─────────────────────────────────────  │
     │                                          │
     │  3. Redirect with authorization code     │
     │  ◀─────────────────────────────────────  │
     │                                          │
     │  4. POST /oauth/token (code exchange)    │
     │  ─────────────────────────────────────▶  │
     │                                          │
     │  5. Return access_token + refresh_token  │
     │  ◀─────────────────────────────────────  │
     │                                          │
```

#### OAuth Endpoints

```
Authorization: GET  /oauth/authorize
Token:         POST /oauth/token
Revoke:        POST /oauth/revoke
Token Info:    GET  /oauth/tokeninfo
```

#### Token Request

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=auth_code_here
&redirect_uri=https://agency-app.com/callback
&client_id=agency_client_id
&client_secret=agency_client_secret
```

#### Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_abc123def456",
  "scope": "cases:read clearance:submit"
}
```

#### Using Bearer Token

```http
GET /agency/v1/cases
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Authorization & Scopes

### Available Scopes

| Scope | Description |
|-------|-------------|
| `cases:read` | Query vehicle cases |
| `cases:write` | Update case metadata (limited fields) |
| `clearance:submit` | Submit police clearance requests |
| `release:authorize` | Authorize vehicle releases |
| `reports:read` | Access agency-specific reports |
| `webhooks:manage` | Configure webhook endpoints |

### Scope Inheritance

```
agency:admin
├── cases:read
├── cases:write
├── clearance:submit
├── release:authorize
├── reports:read
└── webhooks:manage
```

### Role-Based Access

```typescript
// Agency user roles and default scopes
const AGENCY_ROLES = {
  AGENCY_ADMIN: {
    scopes: ['agency:admin'], // All scopes
  },
  OFFICER: {
    scopes: ['cases:read', 'clearance:submit'],
  },
  DISPATCHER: {
    scopes: ['cases:read'],
  },
  RECORDS_CLERK: {
    scopes: ['cases:read', 'reports:read'],
  },
};
```

---

## API Endpoints

### Case Query Endpoints

#### Search Cases

```http
GET /agency/v1/cases
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plate` | string | No | License plate number |
| `plate_state` | string | No | Plate state (2-letter code) |
| `vin` | string | No | Full or partial VIN (min 6 chars) |
| `case_number` | string | No | Case number (YY-NNNNN format) |
| `status` | string[] | No | Filter by status(es) |
| `tow_date_from` | ISO date | No | Start of date range |
| `tow_date_to` | ISO date | No | End of date range |
| `police_hold` | boolean | No | Filter by hold status |
| `police_case_number` | string | No | Agency's case number |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 20, max: 100) |
| `sort_by` | string | No | Sort field (tow_date, case_number) |
| `sort_order` | string | No | asc or desc |

**Required Scope:** `cases:read`

**Example Request:**

```bash
curl -X GET "https://api.cintonstorage.com/agency/v1/cases?plate=ABC123&plate_state=MI" \
  -H "X-API-Key: ak_live_abc123def456ghi789"
```

**Example Response:**

```json
{
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "case_number": "26-00042",
        "status": "HOLD",
        "vin": "1HGBH41JXMN109186",
        "plate": {
          "number": "ABC123",
          "state": "MI"
        },
        "vehicle": {
          "year": 2021,
          "make": "Honda",
          "model": "Accord",
          "color": "Blue"
        },
        "tow_date": "2026-02-10T14:30:00Z",
        "tow_reason": "ABANDONED",
        "tow_location": "123 Main St, Clinton Township, MI",
        "yard_location": "A-15",
        "police_hold": true,
        "hold_expires_at": "2026-02-24T14:30:00Z",
        "police_case_number": "2026-CT-00123",
        "requesting_agency_id": "agency_123",
        "owner": {
          "name": "John Smith",
          "last_known_address": "456 Oak Ave, Detroit, MI"
        },
        "fees": {
          "total_charges": 450.00,
          "total_payments": 0.00,
          "balance": 450.00
        },
        "created_at": "2026-02-10T15:00:00Z",
        "updated_at": "2026-02-12T09:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-14T10:00:00Z"
  }
}
```

#### Get Single Case

```http
GET /agency/v1/cases/{case_id}
```

**Required Scope:** `cases:read`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `case_id` | UUID | Yes | Case ID or case number |

**Example Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "case_number": "26-00042",
    "status": "HOLD",
    "vin": "1HGBH41JXMN109186",
    "plate": {
      "number": "ABC123",
      "state": "MI"
    },
    "vehicle": {
      "year": 2021,
      "make": "Honda",
      "model": "Accord",
      "color": "Blue",
      "type": "SEDAN",
      "class": "STANDARD"
    },
    "tow_date": "2026-02-10T14:30:00Z",
    "intake_date": "2026-02-10T15:00:00Z",
    "tow_reason": "ABANDONED",
    "tow_location": "123 Main St, Clinton Township, MI",
    "yard_location": "A-15",
    "police_hold": true,
    "hold_expires_at": "2026-02-24T14:30:00Z",
    "police_case_number": "2026-CT-00123",
    "requesting_agency_id": "agency_123",
    "owner": {
      "name": "John Smith",
      "address": "456 Oak Ave, Detroit, MI",
      "phone": "555-123-4567"
    },
    "lienholder": {
      "name": "First National Bank",
      "address": "789 Finance Blvd, Detroit, MI"
    },
    "fees": {
      "entries": [
        {
          "type": "TOW",
          "description": "Standard tow",
          "amount": 150.00,
          "date": "2026-02-10"
        },
        {
          "type": "ADMIN",
          "description": "Administrative fee",
          "amount": 50.00,
          "date": "2026-02-10"
        },
        {
          "type": "STORAGE_DAILY",
          "description": "Daily storage (4 days)",
          "amount": 250.00,
          "date": "2026-02-14"
        }
      ],
      "total_charges": 450.00,
      "total_payments": 0.00,
      "balance": 450.00
    },
    "compliance": {
      "notices_sent": [
        {
          "type": "OWNER_INITIAL",
          "sent_at": "2026-02-11T09:00:00Z",
          "delivery_status": "DELIVERED"
        }
      ],
      "auction_eligible_at": null
    },
    "documents": [
      {
        "id": "doc_123",
        "type": "INTAKE_PHOTO",
        "name": "front_view.jpg",
        "thumbnail_url": "https://..."
      }
    ],
    "timeline": [
      {
        "event": "CREATED",
        "timestamp": "2026-02-10T15:00:00Z",
        "actor": "system"
      },
      {
        "event": "HOLD_PLACED",
        "timestamp": "2026-02-10T15:05:00Z",
        "actor": "Officer Smith",
        "details": { "case_number": "2026-CT-00123" }
      }
    ],
    "created_at": "2026-02-10T15:00:00Z",
    "updated_at": "2026-02-12T09:30:00Z"
  }
}
```

### Clearance Endpoints

#### Submit Clearance

Request to clear a police hold on a vehicle.

```http
POST /agency/v1/cases/{case_id}/clearance
```

**Required Scope:** `clearance:submit`

**Request Body:**

```json
{
  "clearance_type": "FULL",
  "officer_name": "Officer Johnson",
  "officer_badge": "CT-4521",
  "notes": "Investigation complete, no evidence retained",
  "effective_date": "2026-02-14T12:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clearance_type` | enum | Yes | FULL, PARTIAL, CONDITIONAL |
| `officer_name` | string | Yes | Authorizing officer name |
| `officer_badge` | string | Yes | Badge/ID number |
| `notes` | string | No | Additional notes |
| `effective_date` | ISO date | No | When clearance takes effect |
| `conditions` | string[] | No | Conditions for CONDITIONAL clearance |

**Response:**

```json
{
  "data": {
    "clearance_id": "clr_abc123",
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "case_number": "26-00042",
    "status": "APPROVED",
    "clearance_type": "FULL",
    "submitted_by": {
      "name": "Officer Johnson",
      "badge": "CT-4521",
      "agency": "Clinton Township PD"
    },
    "submitted_at": "2026-02-14T12:00:00Z",
    "effective_at": "2026-02-14T12:00:00Z",
    "vehicle_status": "STORED",
    "hold_released": true
  },
  "meta": {
    "request_id": "req_xyz789"
  }
}
```

#### Get Clearance Status

```http
GET /agency/v1/clearances/{clearance_id}
```

**Required Scope:** `clearance:submit`

### Release Authorization Endpoints

#### Authorize Release

Direct authorization for vehicle release (e.g., evidence no longer needed).

```http
POST /agency/v1/cases/{case_id}/release-authorization
```

**Required Scope:** `release:authorize`

**Request Body:**

```json
{
  "release_to": {
    "name": "John Smith",
    "relationship": "OWNER",
    "identification_type": "DRIVERS_LICENSE",
    "identification_number": "S***-****-1234"
  },
  "authorization_type": "AGENCY_DIRECT",
  "waive_fees": false,
  "authorized_by": {
    "name": "Sgt. Williams",
    "badge": "CT-1001",
    "rank": "Sergeant"
  },
  "notes": "Owner verified, releasing vehicle"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `release_to` | object | Yes | Person authorized to receive vehicle |
| `authorization_type` | enum | Yes | AGENCY_DIRECT, AGENCY_REFERRAL |
| `waive_fees` | boolean | No | Agency voucher for fees (default: false) |
| `authorized_by` | object | Yes | Authorizing officer details |
| `notes` | string | No | Additional notes |

**Response:**

```json
{
  "data": {
    "authorization_id": "auth_def456",
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "case_number": "26-00042",
    "status": "AUTHORIZED",
    "release_to": {
      "name": "John Smith",
      "relationship": "OWNER"
    },
    "authorization_type": "AGENCY_DIRECT",
    "fees_waived": false,
    "outstanding_balance": 450.00,
    "authorized_by": {
      "name": "Sgt. Williams",
      "badge": "CT-1001",
      "agency": "Clinton Township PD"
    },
    "authorized_at": "2026-02-14T14:30:00Z",
    "valid_until": "2026-02-21T14:30:00Z",
    "release_instructions": "Owner must present valid ID and authorization code at release window",
    "authorization_code": "REL-26-00042-7X9K"
  }
}
```

### Reports Endpoints

#### Agency Activity Report

```http
GET /agency/v1/reports/activity
```

**Required Scope:** `reports:read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | ISO date | Yes | Report start date |
| `end_date` | ISO date | Yes | Report end date |
| `format` | string | No | json (default), csv |

**Response:**

```json
{
  "data": {
    "agency_id": "agency_123",
    "agency_name": "Clinton Township Police Department",
    "report_period": {
      "start": "2026-02-01",
      "end": "2026-02-14"
    },
    "summary": {
      "total_tows_requested": 45,
      "active_holds": 12,
      "clearances_submitted": 8,
      "releases_authorized": 5,
      "total_fees_generated": 15750.00,
      "fees_waived": 250.00
    },
    "by_tow_reason": {
      "ABANDONED": 20,
      "ACCIDENT": 15,
      "ARREST": 7,
      "OTHER": 3
    },
    "cases": [
      {
        "case_number": "26-00042",
        "vin": "1HGBH41JXMN109186",
        "plate": "ABC123",
        "tow_date": "2026-02-10",
        "tow_reason": "ABANDONED",
        "status": "STORED",
        "total_fees": 450.00
      }
    ]
  }
}
```

#### Pending Holds Report

```http
GET /agency/v1/reports/pending-holds
```

**Required Scope:** `reports:read`

Returns all vehicles currently on hold for the requesting agency.

---

## Webhooks

### Webhook Configuration

Agencies can configure webhooks to receive real-time notifications.

```http
POST /agency/v1/webhooks
```

**Required Scope:** `webhooks:manage`

**Request Body:**

```json
{
  "url": "https://agency-system.example.com/webhooks/cinton",
  "events": [
    "case.created",
    "case.status_changed",
    "hold.expiring",
    "clearance.required"
  ],
  "secret": "whsec_your_secret_here"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `case.created` | New case created with this agency as requesting |
| `case.status_changed` | Case status updated |
| `case.released` | Vehicle released |
| `hold.placed` | Police hold placed on case |
| `hold.released` | Police hold removed |
| `hold.expiring` | Hold expiring within 48 hours |
| `clearance.required` | Action needed from agency |
| `notice.sent` | Compliance notice sent |
| `auction.scheduled` | Vehicle scheduled for auction |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "case.status_changed",
  "created": "2026-02-14T15:30:00Z",
  "data": {
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "case_number": "26-00042",
    "previous_status": "HOLD",
    "current_status": "STORED",
    "changed_at": "2026-02-14T15:30:00Z",
    "changed_by": "system"
  },
  "agency_id": "agency_123"
}
```

### Webhook Security

All webhooks are signed using HMAC-SHA256.

```typescript
// Verify webhook signature
const crypto = require('crypto');

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

**Headers:**

```http
X-Cinton-Signature: sha256=abc123...
X-Cinton-Timestamp: 1707920400
X-Cinton-Event-Type: case.status_changed
X-Cinton-Delivery-ID: evt_abc123
```

### Webhook Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours |

After 6 failed attempts, the webhook is marked as failed and an alert is sent.

---

## Rate Limiting

### Limits

| Tier | Requests/min | Requests/day | Burst |
|------|--------------|--------------|-------|
| Standard | 60 | 10,000 | 100 |
| Premium | 300 | 100,000 | 500 |
| Enterprise | 1,000 | Unlimited | 2,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1707920460
X-RateLimit-Retry-After: 15
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 15

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 15 seconds.",
    "retry_after": 15
  }
}
```

---

## Security Considerations

### API Key Security

1. **Key Rotation**: Rotate API keys every 90 days
2. **IP Whitelisting**: Restrict keys to known IP ranges
3. **Scope Limitation**: Use minimum required scopes
4. **Key Storage**: Never store keys in code or version control

```typescript
// Environment variable usage
const apiKey = process.env.CINTON_API_KEY;
```

### Transport Security

- All API calls must use HTTPS
- TLS 1.2+ required
- Certificate pinning recommended for mobile apps

### Request Signing (Optional)

For high-security integrations, requests can be signed:

```http
X-Cinton-Request-Signature: sha256=abc123...
X-Cinton-Request-Timestamp: 1707920400
```

### Data Security

| Data Type | Treatment |
|-----------|-----------|
| VIN | Full access for authorized agencies |
| Owner PII | Masked unless specific scope |
| Payment info | Never exposed via API |
| Photos | Signed URLs with expiration |

### Audit Logging

All API calls are logged:

```json
{
  "timestamp": "2026-02-14T15:30:00Z",
  "request_id": "req_abc123",
  "agency_id": "agency_123",
  "user_id": "user_456",
  "method": "GET",
  "path": "/agency/v1/cases/550e8400...",
  "status_code": 200,
  "response_time_ms": 45,
  "ip_address": "192.168.1.100"
}
```

---

## Integration Guide

### Quick Start

#### 1. Obtain API Credentials

Contact Cinton Storage to:
- Register your agency
- Receive API key or OAuth client credentials
- Configure authorized scopes

#### 2. Test Connectivity

```bash
curl -X GET "https://staging-api.cintonstorage.com/agency/v1/health" \
  -H "X-API-Key: ak_test_your_key_here"
```

#### 3. Query Cases

```bash
curl -X GET "https://staging-api.cintonstorage.com/agency/v1/cases?police_hold=true" \
  -H "X-API-Key: ak_test_your_key_here"
```

### SDK Examples

#### Node.js

```typescript
// npm install @cinton/agency-sdk

import { CintonAgencyClient } from '@cinton/agency-sdk';

const client = new CintonAgencyClient({
  apiKey: process.env.CINTON_API_KEY,
  environment: 'production', // or 'staging'
});

// Search cases
const cases = await client.cases.search({
  plateNumber: 'ABC123',
  plateState: 'MI',
});

// Submit clearance
const clearance = await client.clearances.submit({
  caseId: cases.items[0].id,
  clearanceType: 'FULL',
  officerName: 'Officer Johnson',
  officerBadge: 'CT-4521',
});

// Configure webhooks
await client.webhooks.create({
  url: 'https://my-system.com/webhooks',
  events: ['case.status_changed', 'hold.expiring'],
  secret: 'my_webhook_secret',
});
```

#### Python

```python
# pip install cinton-agency-sdk

from cinton import CintonAgencyClient

client = CintonAgencyClient(
    api_key=os.environ['CINTON_API_KEY'],
    environment='production'
)

# Search cases
cases = client.cases.search(
    plate_number='ABC123',
    plate_state='MI'
)

# Submit clearance
clearance = client.clearances.submit(
    case_id=cases.items[0].id,
    clearance_type='FULL',
    officer_name='Officer Johnson',
    officer_badge='CT-4521'
)
```

### Error Handling

```typescript
try {
  const result = await client.clearances.submit({
    caseId: 'invalid-id',
    // ...
  });
} catch (error) {
  if (error instanceof CintonApiError) {
    switch (error.code) {
      case 'NOT_FOUND':
        console.error('Case not found');
        break;
      case 'UNAUTHORIZED':
        console.error('Invalid or expired API key');
        break;
      case 'FORBIDDEN':
        console.error('Insufficient permissions');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.error(`Retry after ${error.retryAfter} seconds`);
        break;
      default:
        console.error('API error:', error.message);
    }
  }
}
```

### Testing

#### Sandbox Environment

- Use `ak_test_*` API keys
- Test data is isolated from production
- Webhooks can be tested with requestbin.com

#### Test Cases

Pre-created test cases in sandbox:

| Case Number | VIN | Status | Notes |
|-------------|-----|--------|-------|
| 99-00001 | 1HGTEST123456789 | HOLD | Active hold |
| 99-00002 | 2HGTEST987654321 | STORED | No hold |
| 99-00003 | 3HGTEST456789123 | RELEASED | Already released |

### Support

- API Status: https://status.cintonstorage.com
- Documentation: https://docs.cintonstorage.com/agency-api
- Support Email: api-support@cintonstorage.com
- Emergency: (586) 555-0100 (24/7)
