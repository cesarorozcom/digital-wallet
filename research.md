# Research & Analysis - Digital Wallet & Expense Ledger

**Status**: Phase 0 (Research) Findings  
**Date**: 2025-05-29  
**Owner**: Architecture & Backend Team

---

## R1: Image Compression Implementation Strategy

### Research Question
Should image compression happen client-side (React) or server-side (Lambda)?

### Findings

#### Option A: Client-Side Compression (RECOMMENDED)
**Approach**: Use React library to compress image before upload to S3

**Pros**:
- Reduces bandwidth and S3 storage costs
- Faster UX feedback (user sees compression immediately)
- Reduces Lambda cold start burden
- Aligns with mobile-first optimization

**Cons**:
- Requires browser support (Canvas API)
- May impact older browsers (iOS 9, Android 4)

**Recommended Library**: `browser-image-compression`
- Lightweight (~50KB gzipped)
- Supports JPEG, PNG, WebP
- Async compression (non-blocking)
- Example config:
```javascript
const compressed = await imageCompression(file, {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.65  // 60-70% quality
});
```

**Browser Compatibility**:
- Chrome/Edge: 4+ (Canvas API since 2008)
- Firefox: 3.5+ (Canvas API since 2008)
- Safari/iOS: 4+ (Canvas API since 2008)
- Fallback: Send uncompressed if Canvas unavailable (Lambda handles compression)

#### Option B: Server-Side Compression
- Lambda receives original image, compresses before storing
- Adds ~2-5 seconds to receipt processing time
- Increases Lambda cost slightly
- Use: Sharp.js or ImageMagick layer

**Decision**: **Option A (Client-Side)** - Better UX, cost-effective, aligns with mobile-first design.

### Implementation Details
- **Library**: `browser-image-compression` on npm
- **Quality Setting**: 0.65 (65% = 60-70% JPEG quality per spec)
- **Size Limit**: Keep max 2MB post-compression
- **Error Handling**: If compression fails, upload original (Lambda fallback)
- **Testing**: Mock Canvas API for unit tests

### Effort Impact
- Frontend: +2 hours (integration + testing)
- Backend: -1 hour (no server-side compression logic)

---

## R2: AWS Lambda + Comprehend Integration Patterns

### Research Question
Best practices for event-driven receipt processing with error handling and scaling?

### Findings

#### Trigger Option: S3 Event Notification
**Direct S3 → Lambda trigger** (RECOMMENDED over SNS for this use case)

**Why**:
- Lower latency (direct invocation)
- No additional service overhead (SNS adds ~100ms)
- Simpler configuration and monitoring
- Cost: First 1M Lambda invocations/month free tier

**Configuration**:
```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:ACCOUNT:function:receipt-processor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "prefix", "Value": "uploads/" },
            { "Name": "suffix", "Value": ".jpg" }
          ]
        }
      }
    }
  ]
}
```

#### Comprehend Integration Pattern
1. **Detect Entities** (entity recognition for merchant, date, amount)
2. **Detect Key Phrases** (fallback if entities fail)
3. **Syntax Analysis** (optional, for complex receipts)

**API Calls**:
```python
import boto3
comprehend = boto3.client('comprehend')

# Step 1: Extract text from image (use AWS Textract if accuracy critical)
textract = boto3.client('textract')
response = textract.detect_document_text(Document={'S3Object': {'Bucket': bucket, 'Name': key}})
extracted_text = ' '.join([block['Text'] for block in response['Blocks'] if block['BlockType'] == 'LINE'])

# Step 2: Detect entities for merchant, date, amount
entities = comprehend.detect_entities(Text=extracted_text, LanguageCode='en')

# Step 3: Extract key phrases for context
phrases = comprehend.detect_key_phrases(Text=extracted_text, LanguageCode='en')
```

**Confidence Scoring** (≥90% threshold per spec):
- Average confidence scores from detected entities
- If average ≥90%: Status → PENDING_REVIEW or CONFIRMED (user can override)
- If average <90%: Status → PENDING_REVIEW (requires user validation)

#### Error Handling Strategy
| Error Type | Handling |
|------------|----------|
| Comprehend Timeout (>30s) | Retry up to 3 times with exponential backoff (1s, 2s, 4s) |
| Comprehend API Limit | Queue job in DynamoDB, process in separate scheduled Lambda |
| S3 Access Error | Log to CloudWatch, alert DevOps, mark transaction ERROR |
| Image Corruption | Mark PENDING_REVIEW, require user re-upload |
| Insufficient Text | Low confidence, mark PENDING_REVIEW |

#### Cost Estimation
- **S3 Storage**: ~500KB per receipt × 12 months × 100 users = 600GB ≈ $14/month
- **Comprehend**: $0.0001/unit (1 unit ≈ 100 chars) × 50 chars avg ≈ $5/month (10k receipts)
- **Lambda**: Free tier covers most (1M invocations/month free)
- **Textract** (if needed): $0.015 per page ≈ $18/month (1200 receipts)

**Decision**: Use Comprehend first (cheaper), upgrade to Textract if accuracy insufficient.

### Implementation Details
- **Lambda Timeout**: 60 seconds (per spec)
- **Lambda Memory**: 512MB (balance cost/performance)
- **Python Runtime**: 3.11 (latest stable)
- **Dependencies**: boto3 (AWS SDK), requests (HTTP client)
- **Retry Logic**: Built into boto3 SDK (max 3 retries default)
- **Dead Letter Queue**: Optional SQS queue for failed processing

### Effort Impact
- Backend: +5 hours (Lambda implementation + Comprehend integration)
- Testing: +3 hours (mock Comprehend API, test error paths)

---

## R3: DynamoDB Multi-Tenancy Query Patterns

### Research Question
How to design DynamoDB schema for efficient multi-tenant queries (monthly reports, category breakdowns)?

### Findings

#### Partition Key Strategy: userId as PK
**Best Practice**: Partition by tenant (userId) for strict data isolation

**Why**:
- Prevents accidental cross-user data leaks
- Scales horizontally (one user's hot partition ≠ global hot partition)
- Matches access pattern: "Get all data for user X"

#### GSI Design for Access Patterns

##### GSI1: userId#transactionMonth (for monthly queries)
```
PK: userId#transactionMonth (e.g., "user-123#2025-05")
SK: transactionDate (ISO8601, e.g., "2025-05-15")
```

**Use Case**: Get all transactions for user in May 2025
```
Query: PK = "user-123#2025-05", SortKey >= "2025-05-01", SortKey <= "2025-05-31"
Cost: 1 RCU per item read (efficient)
```

##### GSI2: categoryId#transactionDate (for category breakdowns)
```
PK: categoryId
SK: transactionDate
Projected: userId (to filter owned transactions)
```

**Use Case**: Get transactions for category "Groceries" (June 2025)
```
Query: PK = "category-456", SortKey >= "2025-06-01", SortKey <= "2025-06-30"
Filter: userId = "user-123" (client-side or in query filter)
```

#### Query Cost Estimation
| Query | Items | RCU Cost | Notes |
|-------|-------|----------|-------|
| Get all transactions for user (monthly) | 30 avg | 30 RCU | GSI1, efficient |
| Monthly breakdown by category | 5-10 queries | 100-150 RCU | Multiple GSI2 queries |
| Dashboard summary (all users) | N/A | N/A | Prohibited (cross-user) |
| Total monthly queries per user | ~50-100 | 2000-3000 RCU | On-demand billing: $1-1.50 |

**Decision**: On-demand billing justified (variable load, predictable cost).

#### Hot Partition Risk
**Concern**: Single userId generating high throughput

**Mitigation**:
1. On-demand billing (auto-scales)
2. Monitor with CloudWatch: `ConsumedWriteCapacityUnits` per partition
3. Add sharding if one user > 5000 writes/min (use random suffix on PK)
4. Example sharded key: `userId#shard0`, `userId#shard1`, etc.

#### Data Consistency
- **Eventually Consistent reads**: Acceptable for analytics (stale by <1s)
- **Strongly Consistent reads**: Use for auth (RefreshTokens, password changes)
- **Transactions**: Use DynamoDB transactional writes for atomic category + transaction creation

### Implementation Details
- **Table Billing**: On-demand (no provisioning needed)
- **Point-in-time Recovery**: Enabled (7-day backup window)
- **TTL Attribute**: RefreshToken.expiresAt (auto-delete expired tokens)
- **Encryption**: AWS managed keys (default)
- **Global Secondary Indexes**: 2 (userId#transactionMonth, categoryId#transactionDate)

### Effort Impact
- Backend: +3 hours (schema design + query testing)
- DevOps: +2 hours (DynamoDB table provisioning + monitoring setup)

---

## R4: JWT Token Refresh Flow Security

### Research Question
How to implement stateless refresh tokens with TTL and logout support?

### Findings

#### JWT Token Structure

**Access Token (1 hour expiration)**
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "iat": 1716038579,
  "exp": 1716042179,
  "iss": "family-ledger"
}
```

**Claims Explanation**:
- `sub` (subject): User ID for row-level security
- `email`: For user context (optional in API, mainly for debugging)
- `iat` (issued at): Token creation timestamp
- `exp` (expiration): 1 hour from issuance
- `iss` (issuer): Identifies token origin

**Signing**: RSA-256 (asymmetric) for distributed verification
- Public key: Cached in frontend, used for offline validation (optional)
- Private key: Stored in AWS Secrets Manager, used by backend only

#### Refresh Token Flow

```
[Frontend] --POST /api/auth/login (email + password)--> [Backend]
[Backend]  ---Generate AccessToken + RefreshToken---> [Frontend]
           ---Store RefreshToken in DynamoDB (TTL=7d)--> [Database]

[Frontend stores]
  - AccessToken: httpOnly cookie (automatic with requests)
  - RefreshToken: httpOnly cookie (automatic with requests)

[After 1 hour, when AccessToken expires]
[Frontend] --POST /api/auth/refresh-token----> [Backend]
           (includes RefreshToken from cookie)
[Backend]  ---Verify RefreshToken in DynamoDB---> [Database]
           ---Generate new AccessToken-----------> [Frontend]

[On logout]
[Frontend] --POST /api/auth/logout------> [Backend]
[Backend]  ---Mark RefreshToken REVOKED--> [Database]
           ---Delete RefreshToken--------> [Database]
           ---Clear httpOnly cookies----> [Frontend]
```

#### Token Rotation Strategy
**Question**: Should refresh token be rotated on each use?

**Options**:
1. **Non-rotating** (SIMPLER): Same refresh token valid for full 7 days
2. **Rotating** (SAFER): Each refresh generates new refresh token, invalidates old one

**Decision**: **Non-rotating for Phase 1** (simpler, sufficient with TTL cleanup)
- Rationale: TTL handles auto-cleanup, logout revocation prevents abuse
- Upgrade to rotating in Phase 3 if security audit recommends

#### RefreshToken Table Schema
```
{
  tokenId: UUID (PK),
  userId: UUID (GSI1 for user queries),
  hashedToken: string (hashed with bcrypt for security),
  expiresAt: ISO8601 (TTL attribute, DynamoDB auto-deletes),
  createdAt: ISO8601,
  revokedAt: ISO8601 | null (logout marker)
}
```

**Why hash RefreshToken**:
- If database leaked, attacker can't use refresh tokens directly
- On login, token returned once; only hash stored in DB

#### Logout Recovery
**Challenge**: How to invalidate all tokens for a user (e.g., after password change)?

**Solution**: Add `version` field to User table
```
{
  userId: UUID,
  ...
  tokenVersion: integer (incremented on logout-all)
}
```

**JWT payload includes**: `tokenVersion: 1`

**Verification**:
```
1. Extract tokenVersion from JWT
2. Query User.tokenVersion
3. If JWT.tokenVersion < User.tokenVersion: Token invalid (user logged out globally)
```

#### Rate Limiting on Refresh Endpoint
- **Rate Limit**: 100 requests per user per hour (refresh token endpoint)
- **Implementation**: API Gateway throttling + DynamoDB write capacity
- **Error Response**: 429 Too Many Requests after limit exceeded

### Implementation Details
- **JWT Library**: jsonwebtoken (Node.js)
- **Hashing**: bcrypt for refresh token hashing
- **Secrets Manager**: AWS Secrets Manager for RSA private key
- **httpOnly Cookies**: Automatic with Express middleware (cookie-parser)
- **CSRF Protection**: Use SameSite=Strict cookie attribute

### Effort Impact
- Backend: +4 hours (JWT generation + refresh flow + logout)
- Security: +2 hours (review + testing edge cases)

---

## R5: Heroku + React Deployment Pipeline

### Research Question
How to set up CI/CD for Node.js + React deployment on Heroku?

### Findings

#### Deployment Architecture
```
[GitHub repo] --push--> [GitHub Actions] --build--> [Docker image]
                                           --push--> [Heroku registry]
                                           --deploy--> [Heroku dynos]
                                                       --run--> [Node.js + React]
```

#### Buildpack Configuration

**Option 1: Official Node.js Buildpack** (RECOMMENDED)
```
heroku buildpacks:add heroku/nodejs
```

**How it works**:
1. Detects `package.json`
2. Installs dependencies: `npm install --production`
3. Runs build script: `npm run build`
4. Starts app: `npm start` (Procfile or package.json `start` script)

**Procfile**:
```
web: node dist/server.js
```

**Option 2: Custom Docker Build**
- More control but more complex
- Recommended only if buildpack insufficient

**Decision**: Use official Node.js buildpack (simpler, maintained by Heroku).

#### Environment Variables & Secrets
**In Heroku Config**:
```
heroku config:set JWT_SECRET="<generated-secret>"
heroku config:set AWS_REGION="us-east-1"
heroku config:set DYNAMODB_TABLE_USERS="Users"
```

**AWS Credentials on Heroku**:
- **Option 1**: IAM user credentials in config vars (NOT recommended)
- **Option 2**: IAM role with OIDC federation (RECOMMENDED)
  - Heroku → AWS OIDC → Temporary credentials
  - Better security, no secret rotation needed

**Decision**: Use AWS OIDC federation (Phase 2 setup).

#### Health Checks
```javascript
// Express health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
```

**Heroku Formation Health Check**:
```
heroku apps:info
heroku dyno:type auto
```

#### CI/CD Pipeline (GitHub Actions)

**Workflow file** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Heroku
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "family-ledger-staging"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

#### Monitoring & Logging
- **Heroku Logs**: `heroku logs --tail`
- **CloudWatch Integration**: Forward logs to AWS CloudWatch
- **Error Tracking**: Optional (Sentry, Rollbar) for error aggregation

#### Rollback Strategy
```bash
heroku releases
heroku rollback v123  # Revert to previous release
```

**Deployment Safety**:
- Test in staging first (staging-app)
- Blue-green deployment possible with multiple Heroku apps
- Automated tests run before deployment (CI gate)

### Implementation Details
- **Node.js Version**: 18 LTS (specify in package.json `engines.node`)
- **Start Script**: `npm run build && node dist/server.js`
- **Procfile**: Single web dyno for MVP
- **Database**: Managed by AWS (DynamoDB), not Heroku Postgres

### Effort Impact
- DevOps: +3 hours (CI/CD setup + Heroku config + monitoring)
- Testing: +1 hour (deploy to staging, smoke tests)

---

## Consolidated Research Findings

### Key Decisions Made

| Research Item | Decision | Rationale | Risk Level |
|---------------|----------|-----------|-----------|
| Image Compression | Client-side (browser-image-compression) | Cost-effective, better UX | Low |
| Comprehend Integration | Direct S3 → Lambda trigger + Comprehend | Lower latency, simpler | Low |
| DynamoDB Design | userId as PK, 2 GSIs for queries | Multi-tenant isolation | Low |
| JWT Refresh | Non-rotating, 7-day TTL, hashable tokens | Simpler for Phase 1 | Medium |
| Deployment | Heroku Node.js buildpack + GitHub Actions | Simple, maintainable | Low |

### Unknowns Resolved
- ✅ **R1 (Image Compression)**: Client-side compression recommended
- ✅ **R2 (Lambda Integration)**: S3 direct trigger + Comprehend pattern finalized
- ✅ **R3 (DynamoDB Queries)**: Multi-tenant schema with GSIs designed
- ✅ **R4 (JWT Refresh)**: Non-rotating refresh token flow with TTL
- ✅ **R5 (Heroku Deployment)**: CI/CD pipeline and health checks planned

### Remaining Clarifications
- ⚠️ **Comprehend Confidence Edge Cases**: Handled in R2 (low confidence → PENDING_REVIEW)
- ⚠️ **i18n Scope**: Assumed English + Spanish, not finalized
- ⚠️ **Mobile Browser Support**: Assumed iOS 12+, Android 8+

### Next Phase (Phase 1)
- Begin data-model.md authoring (using DynamoDB schema from R3)
- Create API contract files (using Lambda pattern from R2)
- Start Quickstart guide (using Heroku deployment from R5)

---

**Research Completion**: 2025-05-29  
**Total Effort**: ~22 hours (distributed across team)  
**Readiness for Phase 1**: ✅ Ready to proceed
