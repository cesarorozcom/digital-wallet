# Billetera Digital

A family finance tracker built with React, Express, and AWS. Log transactions, upload receipts, and let the app extract merchant name, amount, and date automatically using AWS Textract.

Licensed under the [GNU General Public License v3.0](LICENSE).

---

## What it does

- Register and authenticate users with JWT access tokens and rotating refresh tokens
- Create and manage financial transactions by category and month
- Upload receipt images directly to S3 via presigned URLs (no server proxying)
- Automatically extract structured data from receipts using an AWS Lambda triggered by S3 events (Textract + AnalyzeExpense)
- View and confirm transactions with extracted data or fill in details manually

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend API | Node.js, Express, TypeScript |
| Database | AWS DynamoDB |
| File storage | AWS S3 |
| Receipt processing | AWS Lambda + AWS Textract (AnalyzeExpense) |
| Infrastructure | Terraform |
| Auth | JWT (access + refresh tokens) |
| Testing | Jest, React Testing Library, fast-check (property-based) |

---

## Project structure

```
bank-summary/
├── src/
│   ├── backend/              ← Express API (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── controllers/  ← HTTP request handlers
│   │   │   ├── routes/       ← Route definitions
│   │   │   ├── services/     ← Business logic (DynamoDB, S3, JWT, etc.)
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

Both `src/backend` and `src/frontend` are npm workspaces with their own `package.json`.

---

## Getting started

### Prerequisites

- **Node.js 18+** — check with `node --version`
- **npm** — comes with Node
- **AWS CLI** — needed for backend and infrastructure work

### Install dependencies

```bash
git clone <repo-url>
cd bank-summary
npm install
```

This installs dependencies for both workspaces at once.

### Configure environment variables

**Backend:**

```bash
cd src/backend
cp .env.example .env
```

At minimum you need `JWT_SECRET` and AWS credentials. See `docs/AWS-SETUP.md` for the full list.

**Frontend:**

```bash
cd src/frontend
cp .env.example .env.local
```

The default `REACT_APP_API_URL=http://localhost:3000/api` works for local development.

### Run locally

Start both servers from the project root:

```bash
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

Or run them separately:

```bash
# Terminal 1 — backend
cd src/backend && npm run dev

# Terminal 2 — frontend
cd src/frontend && npm start
```

Full walkthrough: `docs/LOCAL-DEVELOPMENT.md`

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Log in and get tokens |
| POST | `/api/auth/logout` | Revoke a refresh token |
| POST | `/api/auth/refresh` | Get a new access token |
| GET | `/api/auth/me` | Get the current user |
| PUT | `/api/auth/profile` | Update profile fields |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Delete a category |
| GET | `/api/transactions` | List transactions (filter by month/category) |
| POST | `/api/transactions` | Create a transaction |
| GET | `/api/transactions/:id` | Get a transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| POST | `/api/uploads` | Get a presigned S3 URL for receipt upload |
| PUT | `/api/receipts/:id/confirm` | Confirm extracted receipt data |

Health check: `GET /health`

---

## Receipt processing pipeline

1. Frontend requests a presigned PUT URL from `/api/uploads`
2. Browser uploads the receipt image directly to S3
3. S3 triggers the `receiptProcessor` Lambda
4. Lambda calls AWS Textract `AnalyzeExpense` to extract merchant name, total amount, and date
5. Lambda updates the DynamoDB transaction record with extracted data and a confidence score
6. Transactions with confidence ≥ 90 are set to `PENDING`; lower confidence triggers `NEEDS_MANUAL_REVIEW`

S3 key format the Lambda depends on:

```
uploads/{userId}/{year-month}/{transactionId}/{filename}
```

Example: `uploads/user-abc/2025-07/txn-xyz/receipt.jpg`

---

## AWS services

| Service | Role |
|---|---|
| DynamoDB | Stores users, transactions, categories, refresh tokens |
| S3 | Stores receipt images with versioning and AES-256 encryption |
| Textract | OCR and expense field extraction from receipt images |
| Lambda | Runs `receiptProcessor` on every S3 upload event |
| CloudWatch | Logs for the API and Lambda with 7-day retention |
| IAM | Scoped roles for Lambda and the backend application user |

---

## Infrastructure

The `terraform/` directory manages all AWS resources. See `terraform/README.md` for full details.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

After applying, export the outputs to your backend `.env`:

```bash
terraform output backend_environment_variables
```

---

## Running tests

**Backend:**

```bash
cd src/backend
npm test
```

**Frontend:**

```bash
cd src/frontend
npm test -- --watchAll=false
```

**Type checking:**

```bash
cd src/backend && npx tsc --noEmit
cd src/frontend && npx tsc --noEmit
```

Tests use Jest. The backend also includes property-based tests via [fast-check](https://github.com/dubzzz/fast-check) for invariant validation.

---

## Documentation

| Resource | Location |
|---|---|
| Local development setup | `docs/LOCAL-DEVELOPMENT.md` |
| AWS setup | `docs/AWS-SETUP.md` |
| Heroku deployment | `docs/HEROKU-SETUP.md` |
| Lambda deployment | `docs/howto-deploy-receiptProcessor-lambda.md` |
| API contracts | `contracts/` |
| Data model | `data-model.md` |
| Infrastructure | `terraform/README.md` |
| Contributing | `CONTRIBUTING.md` |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code conventions, branching workflow, and how to submit a pull request.

---

## License

Billetera Digital is free software released under the [GNU General Public License v3.0](LICENSE).
