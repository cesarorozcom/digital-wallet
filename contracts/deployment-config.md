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

### Buildpack

```bash
# Setup buildpacks (Node.js + optional multi-buildpack)
heroku buildpacks:set heroku/nodejs --app family-ledger-prod

# Verify
heroku buildpacks --app family-ledger-prod
# == family-ledger-prod Buildpack URLs
# 1. heroku/nodejs
```

### Procfile

```
web: npm run build && node dist/server.js
```

**What Heroku Does**:
1. Detects `package.json` (Node.js buildpack)
2. Installs dependencies: `npm ci --production`
3. Runs build script: `npm run build` (compile React, TypeScript)
4. Starts app: `node dist/server.js`

### package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently 'npm:server:dev' 'npm:client:dev'",
    "server:dev": "nodemon src/server.ts",
    "client:dev": "react-scripts start",
    "build": "npm run build:server && npm run build:client",
    "build:server": "tsc src/server.ts --outDir dist --declaration",
    "build:client": "react-scripts build",
    "start": "node dist/server.js",
    "test": "jest",
    "test:integration": "jest --config jest.integration.js",
    "test:e2e": "cypress run"
  },
  "engines": {
    "node": "18.19.0",
    "npm": "9.x"
  }
}
```

### Environment Variables

**Heroku Config Vars** (set via `heroku config:set`):

```bash
# Authentication
JWT_SECRET=<generated-secret>               # 32+ byte random string
JWT_ACCESS_EXPIRY=3600                     # 1 hour in seconds
JWT_REFRESH_EXPIRY=604800                  # 7 days in seconds

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<IAM-user-key>          # Or use OIDC federation
AWS_SECRET_ACCESS_KEY=<IAM-user-secret>   # Or use OIDC federation

# DynamoDB
DYNAMODB_TABLE_USERS=Users
DYNAMODB_TABLE_CATEGORIES=Categories
DYNAMODB_TABLE_TRANSACTIONS=Transactions
DYNAMODB_TABLE_REFRESH_TOKENS=RefreshTokens

# S3
S3_BUCKET=family-ledger-receipts-prod

# Heroku
NODE_ENV=production
PORT=5000                                  # Heroku assigns this
ENVIRONMENT=production

# Frontend
REACT_APP_API_BASE_URL=https://api.family-ledger.com
REACT_APP_AWS_REGION=us-east-1
```

**How to Set**:
```bash
heroku config:set JWT_SECRET="<secret>" --app family-ledger-prod
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

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code reviewed and approved
- [ ] Security scan completed (no vulnerabilities)
- [ ] Database migrations tested in staging
- [ ] Environment variables set correctly
- [ ] Rollback plan documented

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests in staging
- [ ] Get sign-off from product lead
- [ ] Deploy to production
- [ ] Monitor CloudWatch metrics (5 minutes)
- [ ] Test critical user flows
- [ ] Verify database consistency

### Post-Deployment
- [ ] Monitor error rates (24 hours)
- [ ] Check CloudWatch logs for anomalies
- [ ] Verify user transactions are processing
- [ ] Update deployment notes/runbook
- [ ] Communicate rollout to team

---

**Deployment Configuration Version**: 1.0  
**Last Updated**: 2025-05-29  
**Owner**: DevOps Team
