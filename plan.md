# Implementation Plan - Digital Wallet & Expense Ledger

**Project**: Family Finance Ledger (Billetera Digital)  
**Branch**: copilot/software-design-guidelines  
**Last Updated**: 2025-05-29  
**Status**: Phase 0 (Research) → Phase 1 (Design) in progress

---

## Technical Context

### Known Requirements (from spec.md)
- **Frontend**: React + TailwindCSS, mobile-first responsive, Heroku deployment
- **Backend**: Node.js + Express/NestJS, AWS Lambda, API Gateway
- **Storage**: DynamoDB (multi-tenancy, ACID), S3 (receipt images)
- **OCR/Extraction**: Amazon Comprehend (≥90% confidence threshold)
- **Auth**: Stateless JWT (1-hour access, 7-day refresh tokens)
- **Image Compression**: 60-70% JPEG quality pre-upload
- **Logging**: CloudWatch (7-day TTL)
- **Transaction Types**: DEPOSIT and PAYMENT only
- **SLA**: Best-effort (no specific uptime target)

### Unknowns & Clarification Gaps

#### NEEDS CLARIFICATION: Receipt Image Processing Flow
- **Question**: Should image compression happen client-side or server-side?
- **Impact**: Affects frontend complexity, Lambda processing time
- **Decision Path**: 
  - Option A: Client-side compression (React image library)
  - Option B: Server-side compression (Lambda pre-processing)
  - Recommendation: Client-side (reduces Lambda cost, faster UX feedback)

#### NEEDS CLARIFICATION: Comprehend Confidence Handling for Edge Cases
- **Question**: What happens if Comprehend fails entirely (timeout, error)?
- **Impact**: Transaction recovery, user experience on failures
- **Decision Path**:
  - Fallback to manual entry UI
  - Store raw image reference for manual review
  - Log to CloudWatch with retry strategy

#### NEEDS CLARIFICATION: Category Permissions & Sharing
- **Question**: Can categories be shared between users, or strictly per-user?
- **Impact**: Data model, API design, multi-tenancy implementation
- **Assumption**: Strictly per-user (no sharing in Phase 1)

#### NEEDS CLARIFICATION: Frontend State Management
- **Question**: Redux vs. Context API vs. lightweight solution?
- **Impact**: Bundle size, learning curve, maintainability
- **Decision Path**:
  - Start with Context API (simpler)
  - Migrate to Redux if complexity warrants
  - Recommendation: Context API for Phase 1

#### NEEDS CLARIFICATION: API Error Handling & Retry Logic
- **Question**: Which endpoints are idempotent? Retry strategy for transient failures?
- **Impact**: Transaction safety, DynamoDB write patterns
- **Decision Path**:
  - POST /api/transactions: Idempotent (via transactionId)
  - Rate limiting: 10 req/min per user (implementable in API Gateway)
  - Retry strategy: Exponential backoff (client-side)

#### NEEDS CLARIFICATION: User Profile & Multi-Device Support
- **Question**: Can a user be logged into multiple devices simultaneously? Token invalidation strategy?
- **Impact**: RefreshToken table design, logout behavior
- **Assumption**: Multiple device support allowed; logout from one device doesn't affect others

#### NEEDS CLARIFICATION: Internationalization (i18n) Scope
- **Question**: Which languages to support in Phase 1? RTL language support?
- **Impact**: UI/UX complexity, frontend tooling
- **Assumption**: English + Spanish (mentioned in user context)

#### NEEDS CLARIFICATION: Mobile Responsiveness Testing
- **Question**: Minimum iOS/Android browser versions to support?
- **Impact**: CSS, JavaScript feature compatibility
- **Assumption**: iOS 12+, Android 8+ (modern browsers)

---

## Constitution Check

**Status**: Template (not yet finalized by user)

### Expected Principles (to be validated with user)
- [ ] **Security-First**: All data encrypted, JWT auth mandatory, OWASP compliance
- [ ] **Multi-Tenancy**: Strict data isolation via userId, no data leakage between users
- [ ] **Simplicity**: Clean code, modular architecture, minimal dependencies
- [ ] **Testability**: Unit tests for business logic, integration tests for AWS integration
- [ ] **Maintainability**: Clear separation of concerns, documented error handling
- [ ] **Scalability**: Serverless architecture, pay-per-use, horizontal scaling

**Post-Clarification Check**: Verify no constitution violations in design phase.

---

## Phase 0: Research & Unknowns Resolution

### Research Tasks

#### R1: Image Compression Implementation Strategy
- **Research Goal**: Determine optimal client-side vs. server-side compression
- **Key Questions**:
  - Browser support for HTML5 Canvas compression
  - React libraries for client-side image handling (react-image-crop, react-easy-crop)
  - File size vs. OCR accuracy tradeoff
- **Deliverable**: Compression strategy documented in data-model.md
- **Owner**: Frontend Lead
- **Effort**: 4 hours

#### R2: AWS Lambda + Comprehend Integration Patterns
- **Research Goal**: Best practices for event-driven receipt processing
- **Key Questions**:
  - S3 event notification configuration (SNS vs. direct Lambda trigger)
  - Comprehend API rate limits and batching strategies
  - Error handling for extraction failures
  - Timeout and retry configuration
- **Deliverable**: Lambda integration contract in /contracts/lambda-receipt-processor.json
- **Owner**: Backend Lead
- **Effort**: 6 hours

#### R3: DynamoDB Multi-Tenancy Query Patterns
- **Research Goal**: Efficient GSI design for monthly/category filtering
- **Key Questions**:
  - Optimal partition key design for hot partitions
  - Query cost estimation (monthly reports)
  - Scan vs. query performance for analytics
- **Deliverable**: DynamoDB schema with access patterns in data-model.md
- **Owner**: Backend Lead
- **Effort**: 5 hours

#### R4: JWT Token Refresh Flow Security
- **Research Goal**: Stateless refresh token implementation with TTL
- **Key Questions**:
  - RefreshToken table indexing strategy
  - Token rotation on refresh (or reuse)
  - Logout recovery (how to invalidate all tokens for a user)
  - Rate limiting on refresh endpoint
- **Deliverable**: JWT flow diagram and code example in /contracts/auth-flow.md
- **Owner**: Security Lead
- **Effort**: 4 hours

#### R5: Heroku + React Deployment Pipeline
- **Research Goal**: CI/CD setup for Node.js + React on Heroku
- **Key Questions**:
  - Build pack configuration (Node.js buildpack)
  - Environment variables and secrets management
  - Health checks and app crashing recovery
- **Deliverable**: Deployment configuration checklist in /contracts/deployment.md
- **Owner**: DevOps Lead
- **Effort**: 3 hours

---

## Phase 1: Design & Data Contracts

### P1.1: Data Model Design (data-model.md)

**Deliverable**: `data-model.md` with:

#### Entities & Relationships
- **User** (PK: userId)
  - Fields: email, passwordHash, firstName, lastName, createdAt, updatedAt
  - Validation: email unique, password min 8 chars + complexity rules
  - State transitions: ACTIVE → (logout deletes refresh tokens)

- **RefreshToken** (PK: tokenId, SK: userId)
  - Fields: hashedToken, expiresAt (TTL), createdAt, revokedAt
  - Validation: expiresAt must be ≤ 7 days from now
  - State transitions: ACTIVE → REVOKED (on logout)

- **Category** (PK: userId#categoryId, SK: createdAt)
  - Fields: name, color (hex), icon (string/URL), updatedAt
  - Validation: name required, max 50 chars, color valid hex
  - State transitions: ACTIVE → DELETED (soft delete tracked in updatedAt)

- **Transaction** (PK: userId#transactionId, SK: transactionDate)
  - Fields: categoryId, amount, type (DEPOSIT|PAYMENT), merchantName, receiptImageUrl, status, extractedData
  - GSI1: userId#transactionMonth (for monthly queries)
  - Validation: amount non-zero, date ≤ today, status in {PENDING, PENDING_REVIEW, CONFIRMED}
  - State transitions: PENDING → PENDING_REVIEW → CONFIRMED (or back to PENDING if user requests reprocessing)

#### Access Patterns
1. Get all categories for user
2. Get all transactions for user in month
3. Get transactions by category
4. Get transaction details with receipt data
5. Monthly spending summary (aggregate by category)

#### DynamoDB Schema Details
- Billing: On-demand (auto-scaling)
- Backup: Point-in-time recovery enabled
- TTL Attribute: RefreshToken.expiresAt (auto-delete after 7 days)
- Encryption: At rest (default AWS managed keys)

**Owner**: Backend Lead  
**Effort**: 8 hours

---

### P1.2: API Contracts (contracts/)

**Deliverable**: JSON contract files for:

#### contracts/auth-endpoints.json
```json
{
  "description": "Authentication API endpoints",
  "endpoints": [
    {
      "path": "/api/auth/register",
      "method": "POST",
      "input": { "email": "string", "password": "string", "firstName": "string", "lastName": "string" },
      "output": { "userId": "UUID", "email": "string", "accessToken": "JWT", "refreshToken": "opaque string" },
      "errors": { "400": "Invalid email/password", "409": "Email already exists" }
    },
    {
      "path": "/api/auth/login",
      "method": "POST",
      "input": { "email": "string", "password": "string" },
      "output": { "userId": "UUID", "accessToken": "JWT", "refreshToken": "opaque string" },
      "errors": { "401": "Invalid credentials" }
    },
    {
      "path": "/api/auth/logout",
      "method": "POST",
      "input": {},
      "output": { "success": "boolean" },
      "errors": {}
    },
    {
      "path": "/api/auth/refresh-token",
      "method": "POST",
      "input": { "refreshToken": "opaque string" },
      "output": { "accessToken": "JWT" },
      "errors": { "401": "Invalid/expired refresh token" }
    }
  ]
}
```

#### contracts/transaction-endpoints.json
```json
{
  "description": "Transaction management endpoints",
  "endpoints": [
    {
      "path": "/api/transactions",
      "method": "GET",
      "query": { "month": "YYYY-MM", "categoryId": "optional UUID" },
      "output": { "transactions": "[{ transactionId, amount, merchantName, status, transactionDate }]" },
      "errors": { "401": "Unauthorized" }
    },
    {
      "path": "/api/transactions",
      "method": "POST",
      "input": "multipart/form-data: { categoryId, receiptImage (file) }",
      "output": { "transactionId": "UUID", "status": "PENDING|PENDING_REVIEW", "extractedData": "{ merchantName, amount, transactionDate }" },
      "errors": { "400": "Invalid category/image", "413": "Image too large (>5MB)" }
    }
  ]
}
```

#### contracts/lambda-receipt-processor.json
```json
{
  "description": "Lambda receipt processing flow",
  "trigger": "S3:ObjectCreated event",
  "input": { "bucket": "family-ledger-receipts-{env}", "key": "{userId}/{year}/{month}/{transactionId}.jpg" },
  "process": [
    "1. Download image from S3",
    "2. Call Amazon Comprehend (DetectEntities + ExtractKeyPhrases)",
    "3. Parse merchant, date, amount from entities",
    "4. Calculate confidence score (average entity confidence)",
    "5. Update Transaction in DynamoDB with extractedData"
  ],
  "output": { "transactionId": "UUID", "confidence": "0-100", "merchantName": "string", "status": "PENDING_REVIEW|CONFIRMED" },
  "error_handling": [
    "Timeout (>60s): Log error, mark transaction PENDING_REVIEW",
    "Comprehend API error: Retry with exponential backoff, max 3 retries",
    "S3 access error: Log to CloudWatch, alert DevOps"
  ]
}
```

#### contracts/auth-flow.md
- JWT token structure (payload claims)
- Refresh token rotation strategy
- Logout recovery (RefreshToken revocation)
- Rate limiting on /api/auth/refresh-token

**Owner**: Backend Lead + Security Lead  
**Effort**: 10 hours

---

### P1.3: Quickstart Guide (quickstart.md)

**Deliverable**: `quickstart.md` with:

#### Local Development Setup
1. Prerequisites: Node.js 18+, Python 3.9+, AWS CLI, Docker (optional)
2. Clone repo and install dependencies
3. Configure AWS credentials (local IAM user or assume role)
4. Create local DynamoDB tables (via SAM or AWS CDK)
5. Start backend API server (Express dev mode)
6. Start frontend dev server (React webpack dev server)
7. Test receipt upload flow (mock S3 event for Lambda)

#### Environment Variables Template
```
# Backend
AWS_REGION=us-east-1
DYNAMODB_TABLE_USERS=Users
DYNAMODB_TABLE_CATEGORIES=Categories
DYNAMODB_TABLE_TRANSACTIONS=Transactions
DYNAMODB_TABLE_REFRESH_TOKENS=RefreshTokens
S3_BUCKET=family-ledger-receipts-dev
JWT_SECRET=<generated-secret>
JWT_ACCESS_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# Frontend
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_AWS_REGION=us-east-1
```

#### First Transaction Walk-Through
1. Register user → Login → JWT token exchange
2. Create category (e.g., "Groceries")
3. Capture receipt photo → Upload to S3
4. Lambda processes image → Comprehend extraction
5. Transaction appears in /api/transactions with status PENDING_REVIEW
6. User confirms transaction → Status → CONFIRMED
7. View monthly report with transaction totals

**Owner**: DevOps Lead + Frontend Lead  
**Effort**: 6 hours

---

### P1.4: Agent Context Update

**File**: `.github/copilot-instructions.md`

Update the section between `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers to:

```markdown
<!-- SPECKIT START -->
For context about technologies, project structure, and design decisions, refer to:
- **Specification**: /specs/software-design-guidelines/spec.md
- **Implementation Plan**: /specs/software-design-guidelines/plan.md
- **Data Model**: /specs/software-design-guidelines/data-model.md
- **API Contracts**: /specs/software-design-guidelines/contracts/
- **Quickstart**: /specs/software-design-guidelines/quickstart.md

Key decisions:
- Stateless JWT auth with 1-hour access, 7-day refresh tokens in DynamoDB
- React + TailwindCSS frontend (mobile-first) on Heroku
- Node.js + Express backend with Lambda for receipt processing
- DynamoDB for multi-tenant ACID compliance, S3 for receipt images
- Comprehend OCR with ≥90% confidence threshold
- Image compression to 60-70% JPEG quality pre-upload

See plan.md for phases and dependencies.
<!-- SPECKIT END -->
```

**Owner**: DevOps Lead  
**Effort**: 1 hour

---

## Phase 1 Dependencies & Critical Path

```
┌─────────────────────────────────────────────┐
│ P1.1: Data Model (8h)                       │
│ - DynamoDB schema, access patterns          │
│ - Entity definitions, validation rules      │
└────────────┬────────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │ P1.2: API Contracts (10h)             │
    │ - Auth endpoints                      │
    │ - Transaction endpoints               │
    │ - Lambda receipt processor             │
    │ - Auth flow diagram                   │
    └────────┬──────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │ P1.3: Quickstart Guide (6h)           │
    │ - Dev setup instructions              │
    │ - Environment template                │
    │ - First transaction walkthrough       │
    └────────┬──────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │ P1.4: Agent Context Update (1h)       │
    │ - Update .github/copilot-instructions │
    └────────────────────────────────────────┘
```

**Phase 1 Total Effort**: 25 hours (Frontend Lead: 8h, Backend Lead: 18h, DevOps Lead: 7h)

---

## Post-Phase 1 Handoff

After Phase 1 completion, the team has:
- ✅ Clear data model with DynamoDB schema
- ✅ API contracts for all endpoints
- ✅ JWT auth flow documented
- ✅ Local development setup guide
- ✅ Agent context updated for Phase 2 (Core Features)

### Phase 2 Dependencies (Weeks 3-4 from original tasks.md)
- Implement auth endpoints (using contracts from P1.2)
- Build category CRUD (using data model from P1.1)
- Build transaction creation + receipt upload
- Integrate Lambda + Comprehend for extraction
- Unit test all API endpoints

---

## Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Comprehend confidence threshold too low (missing extraction) | Medium | Medium | Add user review + manual override flow in Phase 2 |
| DynamoDB hot partition (userId) scales poorly | Low | High | Use on-demand billing + monitor with CloudWatch metrics |
| Lambda timeout on complex receipts | Low | Medium | Set timeout to 60s, add async processing fallback |
| JWT secret key exposure | Low | Critical | Use AWS Secrets Manager, rotate keys on schedule |
| S3 object permissions leak (public receipts) | Low | Critical | Block all public access, use signed URLs for download |

---

## Success Criteria (Phase 1)

- [ ] `data-model.md` completed with all entities, access patterns, DynamoDB schema
- [ ] All API contracts defined and approved by team
- [ ] `quickstart.md` tested by team member (full local dev flow works)
- [ ] `.github/copilot-instructions.md` updated with plan references
- [ ] No security vulnerabilities in JWT or data model design
- [ ] All research tasks (R1-R5) completed and documented

---

## Timeline

| Phase | Weeks | Start Date | End Date | Status |
|-------|-------|-----------|----------|--------|
| Phase 0 (Research) | 0.5 | 2025-05-29 | 2025-05-31 | In Progress |
| Phase 1 (Design) | 1 | 2025-06-01 | 2025-06-07 | Planned |
| Phase 2 (Core Features) | 2 | 2025-06-08 | 2025-06-21 | Planned |
| Phase 3 (Analytics) | 2 | 2025-06-22 | 2025-07-05 | Planned |
| Phase 4 (Refinement) | 2 | 2025-07-06 | 2025-07-19 | Planned |

---

## Next Steps

1. **Immediate** (Today):
   - [ ] Review this plan.md with team
   - [ ] Confirm research task assignments (R1-R5)
   - [ ] Start research phase in parallel

2. **End of Research Phase** (May 31):
   - [ ] Consolidate findings in research.md
   - [ ] Resolve NEEDS CLARIFICATION items
   - [ ] Approve design approach

3. **Phase 1 Kickoff** (June 1):
   - [ ] Begin data-model.md authoring
   - [ ] Finalize API contract schemas
   - [ ] Start Quickstart guide draft

4. **Phase 1 Completion** (June 7):
   - [ ] All design artifacts ready for Phase 2
   - [ ] Team reviews and approves
   - [ ] Phase 2 tasks can start immediately

---

**Plan Owner**: Copilot (Architecture Lead)  
**Last Review**: 2025-05-29  
**Next Review**: 2025-05-31 (end of Phase 0)
