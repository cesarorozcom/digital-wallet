# Heroku Deployment Guide

This guide explains how to deploy the Billetera Digital application to Heroku.

## Prerequisites

- Heroku account and CLI installed
- Git repository initialized locally (already done)
- Backend and frontend code complete and tested locally
- AWS resources configured (see `docs/AWS-SETUP.md`)

## Deployment Architecture

The application is deployed as:

```
Heroku Apps:
├── billetera-backend     (Express API server on Node.js buildpack)
└── billetera-frontend    (React SPA on Node.js static buildpack)

AWS Resources:
├── DynamoDB (users, transactions, categories, refreshTokens tables)
├── S3 (receipt image storage)
├── Lambda (receipt processor)
└── CloudWatch (logging)
```

## Backend Deployment

### 1. Create Heroku App

```bash
# Login to Heroku
heroku login

# Create backend app
heroku create billetera-backend

# View app URL
heroku info billetera-backend
```

### 2. Configure Environment Variables

```bash
# Set environment variables
heroku config:set -a billetera-backend \
  NODE_ENV=production \
  JWT_SECRET=your-production-secret-key-min-32-chars \
  CORS_ORIGIN=https://billetera-frontend.herokuapp.com \
  AWS_REGION=us-east-1 \
  AWS_ACCESS_KEY_ID=your_iam_access_key \
  AWS_SECRET_ACCESS_KEY=your_iam_secret_key \
  S3_BUCKET_NAME=your-bucket-name \
  USERS_TABLE=users \
  TRANSACTIONS_TABLE=transactions \
  CATEGORIES_TABLE=categories \
  REFRESH_TOKENS_TABLE=refreshTokens

# Verify config
heroku config -a billetera-backend
```

### 3. Create Procfile for Backend

Create `src/backend/Procfile`:

```
web: npm start
```

### 4. Update Backend Package.json

Ensure these scripts exist in `src/backend/package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "postinstall": "npm run build"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 5. Deploy Backend

```bash
# Add Heroku remote if not already added
heroku git:remote -a billetera-backend

# Navigate to backend directory
cd src/backend

# Deploy
git push heroku master

# View logs
heroku logs -a billetera-backend --tail
```

If deploying from monorepo root, you need to specify the subtree:

```bash
git subtree push --prefix src/backend heroku main
```

### 6. Test Backend

```bash
# Health check
curl https://billetera-backend.herokuapp.com/health

# Register user
curl -X POST https://billetera-backend.herokuapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@prod.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "Prod"
  }'
```

## Frontend Deployment

### 1. Create Heroku App

```bash
# Create frontend app
heroku create billetera-frontend

# View app URL
heroku info billetera-frontend
```

### 2. Configure Environment Variables

```bash
# Set environment variables
heroku config:set -a billetera-frontend \
  REACT_APP_API_URL=https://billetera-backend.herokuapp.com/api \
  REACT_APP_TOKEN_STORAGE=localStorage \
  REACT_APP_ENABLE_OFFLINE_MODE=false
```

### 3. Create Procfile for Frontend

Create `src/frontend/Procfile`:

```
web: npm start
```

But Heroku will serve static files better with a custom Node.js buildpack. Instead, update `package.json` for production:

```json
{
  "scripts": {
    "start": "serve -s build -l 3000",
    "build": "react-scripts build"
  },
  "devDependencies": {
    "serve": "^14.0.0"
  }
}
```

### 4. Create Procfile Alternative (Recommended for React)

For better performance with React SPA, create `src/frontend/server.js`:

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
```

Then update `src/frontend/package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "build": "react-scripts build",
    "dev": "react-scripts start"
  },
  "devDependencies": {
    "express": "^4.18.2"
  }
}
```

### 5. Deploy Frontend

```bash
# Navigate to frontend directory
cd src/frontend

# Create and push to Heroku
git push heroku main

# Or from monorepo root
git subtree push --prefix src/frontend heroku main

# View logs
heroku logs -a billetera-frontend --tail
```

## Post-Deployment Verification

### 1. Check App Status

```bash
# Backend status
heroku status -a billetera-backend

# Frontend status
heroku status -a billetera-frontend

# View logs
heroku logs -a billetera-backend
heroku logs -a billetera-frontend
```

### 2. Test Registration Flow

1. Visit `https://billetera-frontend.herokuapp.com/register`
2. Register new account
3. Verify user created in DynamoDB:

```bash
aws dynamodb scan --table-name users
```

### 3. Test Login Flow

1. Navigate to `https://billetera-frontend.herokuapp.com/login`
2. Login with registered credentials
3. Verify dashboard loads

### 4. Monitor Performance

```bash
# View logs in real-time
heroku logs -a billetera-backend --tail
heroku logs -a billetera-frontend --tail

# Check metrics
heroku metrics -a billetera-backend
```

## Database Considerations

### Scaling DynamoDB

For production traffic, adjust billing mode and capacity:

```bash
# Switch to provisioned billing
aws dynamodb update-billing-mode \
  --table-name users \
  --billing-mode PROVISIONED

# Increase capacity
aws dynamodb update-table \
  --table-name transactions \
  --provisioned-throughput ReadCapacityUnits=25,WriteCapacityUnits=25
```

### Backup Strategy

```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name users \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create on-demand backup
aws dynamodb create-backup \
  --table-name users \
  --backup-name users-backup-$(date +%Y%m%d)
```

## CI/CD Pipeline (Optional)

### Using Heroku GitHub Integration

1. Go to Heroku Dashboard
2. Click app → Deploy tab
3. Connect to GitHub repository
4. Enable automatic deploys from main branch

Alternatively, use GitHub Actions:

Create `.github/workflows/deploy.yml`:

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
      - name: Deploy Backend
        run: |
          git subtree push --prefix src/backend heroku main
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
```

## SSL/HTTPS

Heroku automatically provides SSL certificates. Verify:

```bash
# Your apps should be accessible at:
# https://billetera-backend.herokuapp.com
# https://billetera-frontend.herokuapp.com
```

Force HTTPS in backend (`src/backend/src/server.ts`):

```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

## Troubleshooting

### Build Failed

```bash
# Check buildpack
heroku buildpacks -a billetera-backend

# Rebuild
heroku rebuild -a billetera-backend
```

### 503 Service Unavailable

- Check logs: `heroku logs -a billetera-backend --tail`
- Restart dyno: `heroku dyno:restart -a billetera-backend`
- Check environment variables: `heroku config -a billetera-backend`

### CORS Errors

Update `CORS_ORIGIN` in backend config:

```bash
heroku config:set -a billetera-backend \
  CORS_ORIGIN=https://billetera-frontend.herokuapp.com
```

### Database Connection Errors

Verify AWS credentials and table names:

```bash
heroku config -a billetera-backend
aws dynamodb describe-table --table-name users
```

## Production Checklist

- [ ] Environment variables configured
- [ ] DynamoDB tables created with TTL on refreshTokens
- [ ] S3 bucket configured with CORS
- [ ] CloudWatch log groups created
- [ ] IAM user has minimal necessary permissions
- [ ] HTTPS enforced on frontend and backend
- [ ] Error monitoring configured (optional: Sentry, DataDog)
- [ ] Database backups enabled
- [ ] Rate limiting configured (optional)
- [ ] Health checks working
- [ ] SSL certificate valid

## Next Steps

1. Monitor application performance in production
2. Implement Phase 2 features (transaction endpoints, receipt upload)
3. Set up monitoring and alerting
4. Configure custom domain (optional)
5. Implement analytics (optional)

## References

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku Environment Variables](https://devcenter.heroku.com/articles/config-vars)
- [Heroku SSL Certificates](https://devcenter.heroku.com/articles/ssl)
- [Heroku Release Phase](https://devcenter.heroku.com/articles/release-phase)
