# Deployment & Infrastructure Configuration

**Project**: Family Finance Ledger (Billetera Digital)  
**Environments**: Development, Staging, Production  
**Date**: 2025-05-29

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Heroku)                         │
├─────────────────────────────────────────────────────────────────┤
│  Node.js 18 LTS + Express + React + TailwindCSS                │
│  Region: US or EU (based on user preference)                    │
│  Auto-scaling: 1-3 dynos (based on traffic)                    │
│  Health Check: GET /health → { status: "ok" }                  │
│  Logs: Heroku → CloudWatch (optional)                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTPS + CORS
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              BACKEND (AWS API Gateway + Lambda)                 │
├─────────────────────────────────────────────────────────────────┤
│  REST API: {API_ID}.execute-api.us-east-1.amazonaws.com        │
│  Throttling: 10,000 requests/sec per user                      │
│  Authorization: JWT token (custom authorizer)                  │
│  Logging: CloudWatch Logs (/aws/apigateway/*)                  │
│  Cache: Optional (60s TTL for read endpoints)                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐   ┌─────▼──────┐  ┌──▼──────────┐
│ Lambda     │   │ Lambda     │  │ Lambda      │
│ Auth       │   │ Categories │  │ Transactions│
│ 512MB, 60s │   │ 512MB, 30s │  │ 512MB, 60s  │
└───────┬────┘   └─────┬──────┘  └──┬──────────┘
        │              │            │
        │ (triggered by events or direct invocation)
        │              │            │
┌───────▼──────────────▼────────────▼──────────────┐
│               DYNAMODB (On-demand)               │
├─────────────────────────────────────────────────────┤
│  Tables:                                          │
│  - Users (userId PK)                             │
│  - Categories (userId#categoryId PK)             │
│  - Transactions (userId#transactionId PK)        │
│  - RefreshTokens (tokenId PK, TTL auto-cleanup)  │
│  Encryption: AWS managed keys (at rest)         │
│  Backups: Point-in-time recovery (7-day window) │
└─────────────────────────────────────────────────────┘
        │
        │
┌───────▼──────────────┐   ┌────────────────────┐
│       S3 Bucket      │   │  CloudWatch Logs   │
├──────────────────────┤   ├────────────────────┤
│ Receipts storage:    │   │ Log Group:         │
│ /uploads/{userId}/   │   │ /aws/lambda/*      │
│ Encryption: AES-256  │   │ Retention: 7 days  │
│ TTL: Move to         │   │ CloudWatch Alarms  │
│      Glacier @90d    │   │ for errors         │
└──────────────────────┘   └────────────────────┘
```

---

## Environment Configuration

### Development Environment

**Heroku App**: `family-ledger-dev`

```bash
# Deploy
git push heroku main:main

# Logs
heroku logs --tail --app family-ledger-dev

# Config Variables
heroku config:set \
  JWT_SECRET="<dev-secret>" \
  AWS_REGION="us-east-1" \
  ENVIRONMENT="development" \
  --app family-ledger-dev

# Database: Local DynamoDB (docker-compose)
```

**AWS Resources**:
- DynamoDB: On-demand, no auto-backup
- S3: `family-ledger-receipts-dev` (lifecycle: delete after 90 days)
- Lambda: Development tier (128-512MB memory)
- CloudWatch: 1-day log retention

**Developer Access**:
- Local AWS credentials (IAM user with dev permissions)
- No database snapshots

---

### Staging Environment

**Heroku App**: `family-ledger-staging`

```bash
# Deploy
git push staging main:main  # or heroku git:remote -r staging

# Logs
heroku logs --tail --app family-ledger-staging

# Config: Production-like but with test data
```

**AWS Resources**:
- DynamoDB: On-demand with point-in-time recovery
- S3: `family-ledger-receipts-staging` (lifecycle: delete after 30 days)
- Lambda: Production spec (512MB memory, 60s timeout)
- CloudWatch: 3-day log retention

**Testing**:
- Run integration tests against staging API
- Load testing (simulated user traffic)
- Security scanning (OWASP vulnerability scans)

**Deployment Gate**:
- All tests pass
- No security vulnerabilities
- Performance benchmarks met

---

### Production Environment

**Heroku App**: `family-ledger-prod` or customer's own domain

```bash
# Deploy: Manual approval required
# 1. Merge PR to main
# 2. Tag release: git tag v1.0.0
# 3. Deploy: heroku deploy:war -r production (or GitHub Actions)

# Logs (real-time monitoring)
heroku logs --tail --app family-ledger-prod

# Metrics
heroku apps:info --app family-ledger-prod
```

**AWS Resources** (Production-grade):
- DynamoDB: On-demand, point-in-time recovery 35-day window, auto-backups
- S3: `family-ledger-receipts-prod` (lifecycle: Archive to Glacier after 90 days)
- Lambda: 512MB memory, 60s timeout, concurrent execution limit 1000
- CloudWatch: 7-day log retention, detailed metrics, alarms

**Deployment Gate**:
- All tests pass (unit, integration, e2e)
- Security audit passed
- Load testing completed
- Staging environment verification
- Rollback plan documented
- Manual sign-off by product lead

**Monitoring & Alerting**:
- CloudWatch Alarms:
  - Lambda error rate > 1% (alert DevOps)
  - API Gateway 5xx errors > 10/min (alert DevOps)
  - DynamoDB write throttling (alert to scale)
  - Heroku dyno memory > 90% (scale up)
- PagerDuty integration (optional)

---

## Heroku Deployment Configuration

### Multi-App Deployment Strategy

The project uses a **monorepo structure** with two separate Heroku apps:

1. **Frontend App** (`family-ledger-frontend`): React web application
   - Process: `web` (user-facing)
   - Port: Listens on `$PORT` environment variable
   - Build: `npm start` (or `serve -s build` for production)

2. **Backend App** (`family-ledger-backend`): Node.js + Express REST API
   - Process: `api` (API server)
   - Port: Listens on `$PORT` environment variable
   - Build: TypeScript compilation + Node.js runtime

### Buildpack Configuration

Each app uses the Node.js buildpack:

```bash
# Frontend
heroku buildpacks:set heroku/nodejs --app family-ledger-frontend

# Backend
heroku buildpacks:set heroku/nodejs --app family-ledger-backend

# Verify
heroku buildpacks --app family-ledger-frontend
heroku buildpacks --app family-ledger-backend
# == Buildpack URLs
# 1. heroku/nodejs
```

### Procfile (Monorepo Root)

The root Procfile coordinates both apps:

```
web: cd src/frontend && npm start
api: cd src/backend && npm start
```

**Deployment Flow**:

**Frontend App**:
1. Heroku detects `src/frontend/package.json`
2. Installs dependencies: `npm ci --production`
3. Runs build script: `npm run build` (if defined)
4. Starts process: `cd src/frontend && npm start` (from Procfile)

**Backend App** (separate app):
1. Heroku detects `src/backend/package.json`
2. Installs dependencies: `npm ci --production`
3. Runs build script: `npm run build` (TypeScript compilation)
4. Starts process: `cd src/backend && npm start` (from Procfile)

### Frontend package.json Scripts

```json
{
  "name": "family-ledger-frontend",
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "start": "serve -s build -l $PORT",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "axios": "^1.6.0",
    "react-scripts": "5.0.1",
    "serve": "^14.0.0"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

**Key Points**:
- `npm start` uses `serve` to serve the built React app (production-friendly)
- Listens on `$PORT` (set by Heroku, defaults to 5000)
- `build` script runs during `npm run build` (compile React)

### Backend package.json Scripts

```json
{
  "name": "family-ledger-backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "postinstall": "npm run build"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "uuid": "^9.0.0",
    "aws-sdk": "^2.1400.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.2.2",
    "ts-node": "^10.9.0"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

**Key Points**:
- `npm run build` compiles TypeScript to `dist/`
- `postinstall` hook automatically builds after `npm install`
- `npm start` runs the compiled Node.js server
- Listens on `$PORT` (set by Heroku)

### Environment Variables

**Frontend Heroku Config Vars** (set via `heroku config:set --app family-ledger-frontend`):

```bash
# Node environment
NODE_ENV=production
PORT=5000                                  # Heroku assigns dynamically

# API Configuration
REACT_APP_API_BASE_URL=https://family-ledger-backend.herokuapp.com
REACT_APP_API_TIMEOUT=10000
```

**Backend Heroku Config Vars** (set via `heroku config:set --app family-ledger-backend`):

```bash
# Node environment
NODE_ENV=production
PORT=5000                                  # Heroku assigns dynamically

# Authentication
JWT_SECRET=<generated-secret>              # 32+ byte random string
JWT_ACCESS_EXPIRY=3600                     # 1 hour in seconds
JWT_REFRESH_EXPIRY=604800                  # 7 days in seconds

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<IAM-user-key>
AWS_SECRET_ACCESS_KEY=<IAM-user-secret>

# DynamoDB
DYNAMODB_TABLE_USERS=Users
DYNAMODB_TABLE_CATEGORIES=Categories
DYNAMODB_TABLE_TRANSACTIONS=Transactions
DYNAMODB_TABLE_REFRESH_TOKENS=RefreshTokens

# S3
S3_BUCKET=family-ledger-receipts-prod

# Logging
LOG_LEVEL=info
ENVIRONMENT=production
```

**How to Set Variables**:

```bash
# Frontend
heroku config:set NODE_ENV=production REACT_APP_API_BASE_URL="https://family-ledger-backend.herokuapp.com" --app family-ledger-frontend

# Backend
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET="<generated-secret>" \
  AWS_REGION="us-east-1" \
  AWS_ACCESS_KEY_ID="<key>" \
  AWS_SECRET_ACCESS_KEY="<secret>" \
  DYNAMODB_TABLE_USERS="Users" \
  DYNAMODB_TABLE_CATEGORIES="Categories" \
  DYNAMODB_TABLE_TRANSACTIONS="Transactions" \
  DYNAMODB_TABLE_REFRESH_TOKENS="RefreshTokens" \
  S3_BUCKET="family-ledger-receipts-prod" \
  --app family-ledger-backend
```

### Deployment Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (Heroku: family-ledger-frontend)          │
├─────────────────────────────────────────────────────────────────┤
│  Node.js 18 LTS + React + TailwindCSS                          │
│  Buildpack: heroku/nodejs                                      │
│  Process: web (npm start → serve -s build -l $PORT)            │
│  Scale: 1-3 dynos (based on traffic)                           │
│  Health Check: GET /health or index page                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTPS + CORS (Origin: https://family-ledger-backend.herokuapp.com)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              BACKEND (Heroku: family-ledger-backend)            │
├─────────────────────────────────────────────────────────────────┤
│  Node.js 18 LTS + Express.js                                   │
│  Buildpack: heroku/nodejs                                      │
│  Process: api (npm start → node dist/server.js -l $PORT)       │
│  Scale: 1-3 dynos (based on traffic)                           │
│  Health Check: GET /health → { status: "ok" }                  │
│  Logging: Heroku → CloudWatch (optional)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌──▼──┐      ┌─────▼──────┐  ┌───▼────────┐
    │ JWT │      │ Categories │  │Transactions│
    │Auth │      │  Endpoints │  │ Endpoints  │
    └──┬──┘      └─────┬──────┘  └───┬────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼──────────┐
│        AWS SERVICES (External)                │
├───────────────────────────────────────────────┤
│  DynamoDB (On-demand):                       │
│  - Users, Categories, Transactions           │
│  - RefreshTokens (with TTL)                  │
│                                              │
│  S3 (Receipts storage):                      │
│  - family-ledger-receipts-prod               │
│  - Encryption: AES-256                       │
│  - Lifecycle: Archive to Glacier @90d        │
│                                              │
│  CloudWatch Logs:                            │
│  - /aws/lambda/* (7-day retention)          │
│  - Monitoring & alarms                      │
└──────────────────────────────────────────────┘
```

### Health Check

```javascript
// src/server.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**Heroku Health Check Configuration**:
```bash
heroku apps:info --app family-ledger-prod
# Check: health_check_url
```

### Scaling

```bash
# Single dyno (development)
heroku ps:type eco --app family-ledger-dev

# Standard-1x for production (2 dynos minimum)
heroku ps:type standard-1x --app family-ledger-prod
heroku ps:scale web=2 --app family-ledger-prod

# Auto-scaling (optional, via Heroku Autoscale add-on)
heroku addons:create autoscale --app family-ledger-prod
```

---

## CI/CD Pipeline (GitHub Actions)

### Workflow: Deploy to Heroku

**File**: `.github/workflows/deploy-heroku.yml`

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run test:integration

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "family-ledger-staging"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
      - name: Run smoke tests
        run: |
          curl -f https://family-ledger-staging.herokuapp.com/health || exit 1

  deploy-production:
    needs: [test, deploy-staging]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Manual approval required
        run: echo "Waiting for production approval..."
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "family-ledger-prod"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
      - name: Verify deployment
        run: |
          curl -f https://family-ledger-prod.herokuapp.com/health || exit 1
```

---

## Database Initialization

### DynamoDB Tables (AWS CLI)

```bash
# Users Table
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Categories Table
aws dynamodb create-table \
  --table-name Categories \
  --attribute-definitions \
    AttributeName=userId#categoryId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=userId#categoryId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Transactions Table (with GSI)
aws dynamodb create-table \
  --table-name Transactions \
  --attribute-definitions \
    AttributeName=userId#transactionId,AttributeType=S \
    AttributeName=transactionDate,AttributeType=S \
    AttributeName=userId#transactionMonth,AttributeType=S \
    AttributeName=categoryId,AttributeType=S \
  --key-schema \
    AttributeName=userId#transactionId,KeyType=HASH \
    AttributeName=transactionDate,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=GSI1 \
    KeySchema=AttributeName=userId#transactionMonth,KeyType=HASH \
             AttributeName=transactionDate,KeyType=RANGE \
    Projection=ProjectionType=ALL \
    ProvisionedThroughput=ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# RefreshTokens Table (with TTL)
aws dynamodb create-table \
  --table-name RefreshTokens \
  --attribute-definitions \
    AttributeName=tokenId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=tokenId,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=GSI1-userId \
    KeySchema=AttributeName=userId,KeyType=HASH \
    Projection=ProjectionType=ALL \
    ProvisionedThroughput=ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --billing-mode PAY_PER_REQUEST \
  --time-to-live-specification AttributeName=expiresAt,Enabled=true \
  --region us-east-1
```

### S3 Bucket Configuration

```bash
# Create bucket (if not already done)
aws s3 mb s3://family-ledger-receipts-prod --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket family-ledger-receipts-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket family-ledger-receipts-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Add lifecycle policy (archive to Glacier after 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket family-ledger-receipts-prod \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json**:
```json
{
  "Rules": [
    {
      "Id": "ArchiveOldReceipts",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

## Monitoring & Observability

### CloudWatch Alarms

```bash
# Lambda Error Rate
aws cloudwatch put-metric-alarm \
  --alarm-name receipt-processor-errors \
  --alarm-description "Alert if receipt processor errors exceed 1%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alerts

# DynamoDB Throttling
aws cloudwatch put-metric-alarm \
  --alarm-name dynamodb-write-throttle \
  --metric-name ConsumedWriteCapacityUnits \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

### Logs Retention

```bash
# Set CloudWatch log retention to 7 days
aws logs put-retention-policy \
  --log-group-name /aws/lambda/receipt-processor \
  --retention-in-days 7
```

---

## Rollback Strategy

### Heroku Releases

```bash
# View release history
heroku releases --app family-ledger-prod

# Rollback to previous release
heroku rollback v123 --app family-ledger-prod

# Verify rollback
heroku logs --tail --app family-ledger-prod
```

### Database Rollback

```bash
# DynamoDB point-in-time recovery
aws dynamodb describe-continuous-backups \
  --table-name Transactions \
  --region us-east-1

# Restore to point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name Transactions \
  --target-table-name Transactions-Restored \
  --use-latest-restorable-time \
  --region us-east-1
```

---

## Deployment Steps for Both Apps

### Step 1: Create Heroku Apps

```bash
# Create frontend app
heroku create family-ledger-frontend

# Create backend app
heroku create family-ledger-backend

# Verify apps created
heroku apps
```

### Step 2: Set Environment Variables

**Backend (required before deployment)**:
```bash
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET="$(openssl rand -base64 32)" \
  AWS_REGION="us-east-1" \
  AWS_ACCESS_KEY_ID="<your-aws-key>" \
  AWS_SECRET_ACCESS_KEY="<your-aws-secret>" \
  DYNAMODB_TABLE_USERS="Users" \
  DYNAMODB_TABLE_CATEGORIES="Categories" \
  DYNAMODB_TABLE_TRANSACTIONS="Transactions" \
  DYNAMODB_TABLE_REFRESH_TOKENS="RefreshTokens" \
  S3_BUCKET="family-ledger-receipts-prod" \
  LOG_LEVEL="info" \
  ENVIRONMENT="production" \
  --app family-ledger-backend
```

**Frontend (required before deployment)**:
```bash
heroku config:set \
  NODE_ENV=production \
  REACT_APP_API_BASE_URL="https://family-ledger-backend.herokuapp.com" \
  REACT_APP_API_TIMEOUT="10000" \
  --app family-ledger-frontend
```

### Step 3: Deploy Both Apps

**Deploy Frontend**:
```bash
# Set git remote for frontend
heroku git:remote -a family-ledger-frontend -r frontend

# Deploy (pushes src/frontend to Heroku)
git subtree push --prefix src/frontend frontend main
```

**Deploy Backend**:
```bash
# Set git remote for backend
heroku git:remote -a family-ledger-backend -r backend

# Deploy (pushes src/backend to Heroku)
git subtree push --prefix src/backend backend main
```

### Step 4: Verify Deployments

```bash
# Check frontend status
heroku ps --app family-ledger-frontend
# Output: one 'web' dyno running

# Check backend status
heroku ps --app family-ledger-backend
# Output: one 'api' dyno running

# View frontend logs
heroku logs --tail --app family-ledger-frontend

# View backend logs
heroku logs --tail --app family-ledger-backend

# Test frontend health
curl https://family-ledger-frontend.herokuapp.com/

# Test backend health
curl https://family-ledger-backend.herokuapp.com/health
```

### Step 5: Enable CORS (Backend)

The backend needs CORS configured to accept requests from the frontend:

**Backend code (src/backend/src/server.ts)**:
```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://family-ledger-frontend.herokuapp.com'
    : 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
```

### Step 6: Database Setup

Ensure AWS DynamoDB tables and S3 bucket are created (see Database Initialization section above).

### Step 7: Monitor & Scale (if needed)

```bash
# View app info
heroku apps:info --app family-ledger-frontend
heroku apps:info --app family-ledger-backend

# Scale to multiple dynos (optional)
heroku ps:scale web=2 --app family-ledger-frontend
heroku ps:scale api=2 --app family-ledger-backend

# View metrics
heroku metrics --app family-ledger-frontend
heroku metrics --app family-ledger-backend
```

---

## Alternative: Using Heroku Git vs Subtree

### Option A: Subtree Push (Recommended for Monorepo)

Deploy specific subdirectories without creating separate repos:

```bash
# Frontend
heroku git:remote -a family-ledger-frontend -r frontend
git subtree push --prefix src/frontend frontend main

# Backend
heroku git:remote -a family-ledger-backend -r backend
git subtree push --prefix src/backend backend main
```

### Option B: Separate Git Repositories

Create separate repos for each app (more complex but standard practice):

```bash
# In a separate directory for frontend
git clone git@github.com:user/digital-wallet.git frontend-app
cd frontend-app
git filter-branch --subdirectory-filter src/frontend -- main
heroku git:remote -a family-ledger-frontend
git push heroku main

# Same for backend
```

### Option C: Using GitHub Actions for CI/CD

Automate deployments via Git push:

**File**: `.github/workflows/deploy-heroku.yml`

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [main]
    paths:
      - 'src/frontend/**'
      - 'src/backend/**'

jobs:
  deploy-frontend:
    if: contains(github.event.head_commit.modified, 'src/frontend/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: family-ledger-frontend
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          appdir: src/frontend

  deploy-backend:
    if: contains(github.event.head_commit.modified, 'src/backend/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: family-ledger-backend
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          appdir: src/backend
```

---

## Troubleshooting

### Build Failures

**TypeScript Compilation Errors**:
- Ensure all `@types/*` packages are in `devDependencies`
- Check `tsconfig.json` for correct settings
- Verify Node version matches `engines` in `package.json`

```bash
# Check Node version on Heroku
heroku run node --version --app family-ledger-backend
```

**Missing Dependencies**:
```bash
# Verify all dependencies are listed
npm ls --all --app family-ledger-backend

# Reinstall locally to test
rm -rf node_modules package-lock.json
npm ci
```

### Runtime Failures

**Port Not Listening**:
- Ensure app listens on `$PORT` environment variable
- Heroku assigns a random port; app must be flexible

```typescript
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on ${port}`));
```

**Module Not Found**:
- Check imports match file structure
- Verify `package.json` paths are correct
- Run `npm ls` to check installed packages

```bash
heroku logs --tail --app family-ledger-backend | grep -i "cannot find"
```

### CORS Issues

**Frontend Can't Reach Backend**:
- Verify backend `CORS` configuration
- Check frontend `REACT_APP_API_BASE_URL` env var
- Test with `curl`:

```bash
curl -H "Origin: https://family-ledger-frontend.herokuapp.com" \
     -H "Access-Control-Request-Method: GET" \
     https://family-ledger-backend.herokuapp.com/health
```

---

## Rollback Procedures

### Heroku Releases

```bash
# View release history
heroku releases --app family-ledger-frontend
heroku releases --app family-ledger-backend

# Rollback to previous version
heroku rollback --app family-ledger-frontend
heroku rollback --app family-ledger-backend

# Check status
heroku logs --tail --app family-ledger-frontend
```

### Database Rollback (AWS)

```bash
# For DynamoDB point-in-time recovery
aws dynamodb describe-continuous-backups \
  --table-name Transactions \
  --region us-east-1

aws dynamodb restore-table-to-point-in-time \
  --source-table-name Transactions \
  --target-table-name Transactions-Restored \
  --use-latest-restorable-time \
  --region us-east-1
```

---

## Deployment Checklist

- [ ] Backend environment variables set
- [ ] Frontend environment variables set  
- [ ] TypeScript compiles locally (`npm run build`)
- [ ] All tests pass locally
- [ ] Security audit completed
- [ ] DynamoDB tables created
- [ ] S3 bucket created and configured
- [ ] CORS headers configured in backend
- [ ] Procfile updated for both apps
- [ ] Frontend deployed successfully
- [ ] Backend deployed successfully
- [ ] Health checks pass
- [ ] Frontend can connect to backend
- [ ] User can log in and create transactions
- [ ] Logs are being collected
- [ ] Monitoring alerts are configured

---

**Deployment Configuration Version**: 1.0  
**Last Updated**: 2025-05-29  
**Owner**: DevOps Team
