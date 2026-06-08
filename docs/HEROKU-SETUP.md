# Heroku Deployment Guide

This guide explains how to deploy the Billetera Digital application to Heroku. It reflects the actual setup and commands used in this project — not just generic Heroku documentation.

## Prerequisites

- Heroku account and CLI installed (`brew tap heroku/brew && brew install heroku`)
- Git repository initialized locally (already done)
- Backend and frontend code complete and tested locally
- AWS resources configured (see `docs/AWS-SETUP.md`)

## Deployment Architecture

The application is deployed as:

```
Heroku Apps:
└── billetera-frontend    (React SPA served via "npm start" → serve -s build)

AWS Resources:
├── DynamoDB (users, transactions, categories, refreshTokens tables)
├── S3 (receipt image storage)
├── Lambda (receipt processor)
└── CloudWatch (logging)
```

> The backend is currently deployed separately (e.g. Heroku or another host). This guide focuses on the frontend app, which is what is configured in this repo.

---

## Git Remotes

This repo uses a **monorepo layout** — the frontend lives under `src/frontend/`, not at the root. Heroku expects to find a deployable app at the repo root, so we use `git subtree` to push only the subdirectory.

The Heroku remote for the frontend is named `heroku-frontend`:

```bash
# Verify your remotes
git remote -v

# Expected output:
# heroku-frontend  https://git.heroku.com/billetera-frontend.git (fetch)
# heroku-frontend  https://git.heroku.com/billetera-frontend.git (push)
# origin           git@github.com:cesarorozcom/digital-wallet.git (fetch)
# origin           git@github.com:cesarorozcom/digital-wallet.git (push)
```

If `heroku-frontend` is missing, add it:

```bash
heroku git:remote -a billetera-frontend
git remote rename heroku heroku-frontend
```

---

## Frontend Deployment

### How the app is served on Heroku

The `src/frontend/Procfile` contains:

```
web: npm start
```

And `package.json` has:

```json
"scripts": {
  "start": "serve -s build -l $PORT"
}
```

So Heroku runs `npm start`, which uses the `serve` package to serve the pre-built React static files. The `build/` folder must be committed or built during the release — see the deploy steps below.

### 1. Build the frontend locally

```bash
cd src/frontend
npm run build
```

This creates `src/frontend/build/`. Commit it if you want Heroku to use it directly:

```bash
cd ../..
git add src/frontend/build
git commit -m "chore: update frontend build"
```

### 2. Configure Heroku environment variables

```bash
heroku config:set -a billetera-frontend \
  REACT_APP_API_URL=https://billetera-backend.herokuapp.com/api \
  REACT_APP_TOKEN_STORAGE=localStorage \
  REACT_APP_ENABLE_OFFLINE_MODE=false

# Verify
heroku config -a billetera-frontend
```

### 3. Deploy to Heroku

Because the frontend is a subdirectory of the monorepo, a plain `git push` won't work. Use the subtree split approach — this is the command that has proven to work reliably:

```bash
git push heroku-frontend `git subtree split --prefix src/frontend master`:master --force
```

Breaking that down:
- `git subtree split --prefix src/frontend master` — creates a temporary branch containing only the `src/frontend/` subtree
- `:master` — pushes it to the `master` branch on Heroku (Heroku deploys from `master`)
- `--force` — needed when the Heroku branch has diverged (common after squash merges or rebases)

### 4. Watch the build logs

```bash
heroku logs -a billetera-frontend --tail
```

You should see the buildpack install dependencies and then the dyno start with `serve`.

### 5. Verify the deployment

```bash
# Open the app
heroku open -a billetera-frontend

# Or hit it directly
curl https://billetera-frontend.herokuapp.com
```

---

## Troubleshooting

### "Everything up to date" but changes aren't live

This means git thinks the ref is already pushed. Use the force-push split command:

```bash
git push heroku-frontend `git subtree split --prefix src/frontend master`:master --force
```

### Subtree push rejects or diverges

The `git subtree push` variant can fail with conflicts if the Heroku branch and local history have diverged. The `subtree split` + force push bypasses this entirely and is the preferred approach:

```bash
# This is more reliable than:
# git subtree push --prefix src/frontend heroku-frontend master

# Use this instead:
git push heroku-frontend `git subtree split --prefix src/frontend master`:master --force
```

### "No web process running" / H14 error

The dyno isn't scaled. Scale it up:

```bash
heroku ps:scale web=1 -a billetera-frontend
```

### App crashes on startup (H10)

Check the logs first:

```bash
heroku logs -a billetera-frontend --tail
```

Common causes:
- `serve` not installed — run `npm install --save serve` inside `src/frontend`
- `build/` folder is missing — run `npm run build` and commit or let Heroku build it via a `postinstall` script
- `PORT` not bound — make sure `start` uses `$PORT`, not a hardcoded port

### CORS errors from the frontend

Update the `CORS_ORIGIN` on the backend to match the Heroku frontend URL:

```bash
heroku config:set -a billetera-backend \
  CORS_ORIGIN=https://billetera-frontend.herokuapp.com
```

### 503 Service Unavailable

```bash
# Restart the dyno
heroku dyno:restart -a billetera-frontend

# Check config
heroku config -a billetera-frontend
```

---

## Backend Deployment

The backend is an Express app. If you're deploying it to Heroku as well, the pattern is the same — create a separate app and push the `src/backend` subtree.

### Setup

```bash
# Create the app (first time only)
heroku create billetera-backend

# Add a remote named heroku-backend
heroku git:remote -a billetera-backend
git remote rename heroku heroku-backend
```

### Configure environment variables

```bash
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
```

### Deploy

```bash
git push heroku-backend `git subtree split --prefix src/backend master`:master --force
```

The `src/backend/Procfile` should contain:

```
web: npm start
```

And `src/backend/package.json` should have `postinstall: npm run build` so Heroku compiles TypeScript during the build phase.

### Test the backend

```bash
curl https://billetera-backend.herokuapp.com/health
```

---

## Post-Deployment Checklist

- [ ] Frontend loads at `https://billetera-frontend.herokuapp.com`
- [ ] Backend health check returns 200 at `/health`
- [ ] `CORS_ORIGIN` on backend matches the frontend Heroku URL
- [ ] `REACT_APP_API_URL` on frontend points to the backend Heroku URL
- [ ] DynamoDB tables exist and IAM credentials have access
- [ ] S3 bucket configured with CORS for the frontend origin
- [ ] Lambda receipt processor deployed and wired to S3 bucket (see `docs/howto-deploy-receiptProcessor-lambda.md`)
- [ ] Receipt upload flow tested end-to-end

---

## Useful Commands Reference

```bash
# View app logs live
heroku logs -a billetera-frontend --tail

# View environment variables
heroku config -a billetera-frontend

# Restart the app
heroku dyno:restart -a billetera-frontend

# Scale dynos (free tier: web=1)
heroku ps:scale web=1 -a billetera-frontend

# Open the app in browser
heroku open -a billetera-frontend

# Run a one-off command on Heroku
heroku run npm run build -a billetera-frontend
```

---

## References

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Heroku Config Vars](https://devcenter.heroku.com/articles/config-vars)
- [git subtree — Atlassian](https://www.atlassian.com/git/tutorials/git-subtree)
- [serve package](https://github.com/vercel/serve)
