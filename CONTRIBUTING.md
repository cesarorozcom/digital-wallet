# Contributing to Billetera Digital

Welcome! This guide covers everything you need to start contributing — whether you're new to the codebase or just getting back up to speed.

---

## What is this project?

Billetera Digital is a family finance tracker. Users log transactions, upload receipts, and have data extracted automatically using AWS Textract. The app is a full-stack TypeScript project with a React frontend and an Express backend, both in the same monorepo.

See [README.md](README.md) for a full overview of the architecture, API endpoints, and AWS pipeline.

---

## Project structure

```
bank-summary/
├── src/
│   ├── backend/              ← Express API (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── controllers/  ← HTTP request handlers
│   │   │   ├── routes/       ← Route definitions
│   │   │   ├── services/     ← Business logic (S3, DynamoDB, JWT, etc.)
│   │   │   ├── middleware/   ← Auth and error handling
│   │   │   └── models/       ← TypeScript types and interfaces
│   │   ├── lambda/           ← AWS Lambda receipt processor
│   │   └── tests/            ← Backend test suite
│   └── frontend/             ← React app (TypeScript + Tailwind)
│       └── src/
│           ├── components/   ← Reusable UI components
│           ├── pages/        ← Page-level components
│           ├── services/     ← API client (axios wrappers)
│           └── __tests__/    ← Frontend test suite
├── terraform/                ← AWS infrastructure as code
├── contracts/                ← API contracts and specs
└── docs/                     ← Setup guides and how-tos
```

Both `src/backend` and `src/frontend` are npm workspaces — they have their own `package.json` and are managed independently but share the same repo.

---

## A quick note on TypeScript

If you're coming from JavaScript, TypeScript adds type annotations on top of the same language. The main difference you'll notice:

```typescript
// JavaScript
function greet(name) {
  return "Hello, " + name;
}

// TypeScript — same logic, with types
function greet(name: string): string {
  return "Hello, " + name;
}
```

TypeScript catches mistakes before you run the code. You don't need to be a TypeScript expert — just follow the patterns already in the codebase and the compiler will guide you when something is off.

---

## Setting up your environment

### What you need installed

- **Node.js 18 or newer** — `node --version`
- **npm** — comes with Node, `npm --version`
- **AWS CLI** — only needed if you're working on backend, Lambda, or infrastructure features

### First-time setup

```bash
git clone <repo-url>
cd bank-summary
npm install
```

This installs dependencies for both workspaces in one shot.

### Environment files

**Backend:**

```bash
cd src/backend
cp .env.example .env
```

At minimum you need `JWT_SECRET` and AWS credentials if you're testing anything that touches DynamoDB or S3. Full details in `docs/AWS-SETUP.md`.

**Frontend:**

```bash
cd src/frontend
cp .env.example .env.local
```

The default `REACT_APP_API_URL=http://localhost:3000/api` works fine for local dev.

---

## Running the app locally

Start both servers from the root:

```bash
npm run dev
```

This runs the backend and frontend in parallel. Backend on `http://localhost:3000`, frontend on `http://localhost:3001`.

Or in two terminals:

```bash
# Terminal 1
cd src/backend && npm run dev

# Terminal 2
cd src/frontend && npm start
```

Full walkthrough: `docs/LOCAL-DEVELOPMENT.md`

---

## Running tests

### Backend

```bash
cd src/backend
npm test
```

Tests run with Jest. Files live in `src/backend/tests/`.

### Frontend

```bash
cd src/frontend
npm test -- --watchAll=false
```

The `--watchAll=false` flag runs once and exits. Frontend tests use Jest + React Testing Library and live in `src/frontend/src/__tests__/`.

### Type checking

```bash
# Backend
cd src/backend && npx tsc --noEmit

# Frontend
cd src/frontend && npx tsc --noEmit
```

Run this before opening a PR to catch type errors without producing build output.

---

## Making a change

### 1. Create a branch

Always branch off `main`:

```bash
git checkout main
git pull
git checkout -b fix/receipt-key-parsing
# or
git checkout -b feat/add-category-filter
```

### 2. Find what you're working on

| You want to change... | Look in... |
|---|---|
| An API endpoint | `src/backend/src/routes/` |
| Request handling logic | `src/backend/src/controllers/` |
| Business logic (S3, auth, etc.) | `src/backend/src/services/` |
| The Lambda receipt processor | `src/backend/lambda/receiptProcessor.ts` |
| A UI component | `src/frontend/src/components/` |
| A page | `src/frontend/src/pages/` |
| How the frontend calls the API | `src/frontend/src/services/api.ts` |
| AWS infrastructure | `terraform/` |

### 3. Write or update tests

This project uses property-based tests alongside unit tests via [fast-check](https://github.com/dubzzz/fast-check). Property tests generate random inputs to verify that code holds to a rule in all cases, not just the ones you thought of. You'll see them alongside regular `it(...)` tests in the test files.

When you add a function or fix a bug, add a test. When fixing a bug specifically, add a test that would have caught it.

### 4. Check your work

```bash
# Tests
cd src/backend && npm test
cd src/frontend && npm test -- --watchAll=false

# Types
cd src/backend && npx tsc --noEmit
cd src/frontend && npx tsc --noEmit
```

All tests must pass and there should be zero TypeScript errors before you open a PR.

### 5. Commit and push

```bash
git add .
git commit -m "fix: correct transactionId extraction from S3 key"
git push -u origin fix/receipt-key-parsing
```

Commit messages follow a simple convention: `type: short description`. Common types: `fix`, `feat`, `chore`, `docs`, `test`.

### 6. Open a pull request

Open a PR against `main`. In the description, cover:

- What the change does
- Why it's needed
- How you tested it

---

## Code conventions

Match the style of the file you're editing. Key patterns in this codebase:

**Async/await over `.then()` chains:**

```typescript
// Do this
const result = await someAsyncFunction();

// Not this
someAsyncFunction().then(result => { ... });
```

**Explicit return types on functions, especially in services:**

```typescript
async function getPresignedUrl(key: string): Promise<string> {
  // ...
}
```

**Descriptive error messages:**

```typescript
if (!filename) {
  throw new Error("filename is required to generate a presigned URL");
}
```

**No `any` unless unavoidable.** The `any` type defeats the purpose of TypeScript. If you see it in existing code it's usually there for a reason. Don't add new ones without a good reason.

---

## Receipt processing pipeline

Worth understanding if you're working on the Lambda or upload flow:

1. Frontend requests a presigned PUT URL from `/api/uploads`
2. Browser uploads the image directly to S3 (no server proxying)
3. S3 triggers the `receiptProcessor` Lambda
4. Lambda calls `AnalyzeExpense` (Textract) to extract merchant name, total, and date
5. Lambda updates the DynamoDB transaction record with extracted data and a confidence score
6. Transactions with confidence ≥ 90 → `PENDING`; lower confidence → `NEEDS_MANUAL_REVIEW`

The Lambda depends on this exact S3 key format to infer `transactionId` and `userId`:

```
uploads/{userId}/{year-month}/{transactionId}/{filename}
```

Example: `uploads/user-abc/2025-07/txn-xyz/receipt.jpg`

Deployment instructions: `docs/howto-deploy-receiptProcessor-lambda.md`

---

## AWS services used

| Service | What it does here |
|---|---|
| **DynamoDB** | Stores users, transactions, categories, and refresh tokens |
| **S3** | Stores uploaded receipt images (versioned, AES-256 encrypted) |
| **Textract** | OCR and structured expense field extraction |
| **Lambda** | Runs `receiptProcessor` on each S3 upload event |
| **CloudWatch** | API and Lambda logs with 7-day retention |
| **IAM** | Scoped execution role for Lambda and application user for the backend |

---

## Terraform (infrastructure)

The `terraform/` directory manages all AWS resources. You generally won't need to touch it unless you're adding or changing AWS resources.

```bash
cd terraform
terraform plan    # preview changes
terraform apply   # apply changes (requires AWS credentials)
```

See `terraform/README.md` for the full setup and common tasks.

---

## Where to get help

| Topic | Resource |
|---|---|
| Local setup | `docs/LOCAL-DEVELOPMENT.md` |
| AWS setup | `docs/AWS-SETUP.md` |
| Heroku deployment | `docs/HEROKU-SETUP.md` |
| Lambda deployment | `docs/howto-deploy-receiptProcessor-lambda.md` |
| API contracts | `contracts/` |
| Data model | `data-model.md` |
| Infrastructure | `terraform/README.md` |

If something in this guide is unclear or out of date, a PR to fix it is always welcome.
