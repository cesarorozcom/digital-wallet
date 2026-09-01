# Tasks: Digital Wallet & Expense Ledger (Billetera Digital)

**Input**: Design documents (spec.md, plan.md, data-model.md, contracts/, research.md)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

**Format**: `- [ ] [ID] [P?] [Story?] Description with file path`

**Status**: ✅ All 114 tasks follow strict checklist format with file paths

---

## Phase 1: Setup & Infrastructure

**Purpose**: Project initialization and AWS infrastructure provisioning

- [ ] T001 Initialize Node.js backend project with Express in src/backend/
- [ ] T002 Initialize React frontend project with TailwindCSS in src/frontend/
- [ ] T003 [P] Configure TypeScript compilation (tsconfig.json in src/backend/)
- [ ] T004 [P] Setup GitHub workflows for CI/CD in .github/workflows/
- [ ] T005 Setup DynamoDB tables (Users, Categories, Transactions, RefreshTokens) in AWS
- [ ] T006 Setup S3 bucket with encryption and lifecycle policies in AWS
- [ ] T007 Configure AWS Lambda execution roles and IAM policies in AWS
- [ ] T008 Setup CloudWatch log groups with 7-day retention in AWS

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

**Purpose**: Core architecture that blocks all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create JWT authentication service in src/backend/src/services/JWTService.ts
- [ ] T010 [P] Create password hashing service (bcrypt) in src/backend/src/services/PasswordService.ts
- [ ] T011 [P] Create Express server with middleware setup in src/backend/src/server.ts
- [ ] T012 [P] Create error handling middleware in src/backend/src/middleware/errorHandler.ts
- [ ] T013 [P] Create CORS middleware in src/backend/src/middleware/cors.ts
- [ ] T014 [P] Create request logging middleware in src/backend/src/middleware/logging.ts
- [ ] T015 [P] Create DynamoDB client configuration in src/backend/src/config/dynamodb.ts
- [x] T016 [P] Create S3 client configuration in src/backend/src/config/s3.ts
- [x] T017 Create base response formatter utility in src/backend/src/utils/response.ts
- [ ] T018 Create environment validation in src/backend/src/config/env.ts
- [x] T019 [P] Setup React app with routing (React Router) in src/frontend/src/App.tsx
- [x] T020 [P] Create API client service (axios) in src/frontend/src/services/api.ts
- [x] T021 [P] Setup Context API for global state management in src/frontend/src/context/AppContext.tsx
- [x] T022 [P] Create base layout component with navigation in src/frontend/src/components/Layout.tsx

**Checkpoint**: Foundation ready - all user story implementation can begin in parallel

---

## Phase 3: User Story 1 - User Authentication & Management (Priority: P1) 🎯 MVP

**Goal**: Enable users to register, login, and manage their accounts with JWT-based authentication

**Independent Test**: User can register → login → receive JWT token → access protected endpoints → logout → token invalidated

### Implementation for US1

- [x] T023 [P] [US1] Create User entity model in src/backend/src/models/User.ts
- [x] T024 [P] [US1] Create User service (CRUD operations) in src/backend/src/services/UserService.ts
- [x] T025 [P] [US1] Create RefreshToken entity model in src/backend/src/models/RefreshToken.ts
- [x] T026 [P] [US1] Create authentication middleware in src/backend/src/middleware/auth.ts
- [x] T027 [US1] Implement POST /api/auth/register endpoint in src/backend/src/routes/authRoutes.ts
- [x] T028 [US1] Implement POST /api/auth/login endpoint in src/backend/src/routes/authRoutes.ts
- [x] T029 [US1] Implement POST /api/auth/refresh endpoint in src/backend/src/routes/authRoutes.ts
- [x] T030 [US1] Implement POST /api/auth/logout endpoint in src/backend/src/routes/authRoutes.ts
- [x] T031 [US1] Implement GET /api/auth/me (current user profile) endpoint in src/backend/src/routes/authRoutes.ts
- [x] T032 [US1] Implement PUT /api/auth/profile (update user profile) endpoint in src/backend/src/routes/authRoutes.ts
- [x] T033 [P] [US1] Create login form component in src/frontend/src/pages/LoginPage.tsx
- [x] T034 [P] [US1] Create registration form component in src/frontend/src/pages/RegisterPage.tsx
- [x] T035 [P] [US1] Create user profile page component in src/frontend/src/pages/ProfilePage.tsx
- [x] T036 [US1] Implement token storage and retrieval in localStorage in src/frontend/src/utils/tokenStorage.ts
- [x] T037 [US1] Implement authentication context provider in src/frontend/src/context/AuthContext.tsx
- [x] T038 [US1] Implement protected route component in src/frontend/src/components/ProtectedRoute.tsx
- [x] T039 [US1] Add input validation and error handling to auth forms in src/frontend/src/components/
- [x] T040 [US1] Add logout functionality to navigation in src/frontend/src/components/Layout.tsx

**Checkpoint**: User Story 1 complete - users can register, login, and manage accounts

---

## Phase 4: User Story 2 - Category Management (Priority: P1)

**Goal**: Allow users to create, view, update, and delete personal expense categories

**Independent Test**: User can create category → view categories → edit category → delete category (categories remain user-scoped)

### Implementation for US2

- [x] T041 [P] [US2] Create Category entity model in src/backend/src/models/Category.ts
- [x] T042 [P] [US2] Create Category service (CRUD operations) in src/backend/src/services/CategoryService.ts
- [x] T043 [US2] Implement POST /api/categories endpoint in src/backend/src/routes/categoryRoutes.ts
- [x] T044 [US2] Implement GET /api/categories endpoint in src/backend/src/routes/categoryRoutes.ts
- [x] T045 [US2] Implement PUT /api/categories/:categoryId endpoint in src/backend/src/routes/categoryRoutes.ts
- [x] T046 [US2] Implement DELETE /api/categories/:categoryId endpoint in src/backend/src/routes/categoryRoutes.ts
- [x] T047 [US2] Add validation to prevent duplicate category names in src/backend/src/services/CategoryService.ts
- [x] T048 [P] [US2] Create categories list page component in src/frontend/src/pages/CategoriesPage.tsx
- [x] T049 [P] [US2] Create category form modal component in src/frontend/src/components/CategoryForm.tsx
- [x] T050 [US2] Implement category CRUD UI in src/frontend/src/pages/CategoriesPage.tsx
- [x] T051 [US2] Add category management context in src/frontend/src/context/CategoryContext.tsx
- [x] T052 [US2] Add color and icon picker to category form in src/frontend/src/components/CategoryForm.tsx
- [x] T053 [US2] Implement optimistic UI updates for category operations in src/frontend/

**Checkpoint**: User Story 2 complete - users can manage personal categories

---

## Phase 5: User Story 3 - Transaction Management (Priority: P1)

**Goal**: Enable users to create, view, and manage transactions with category assignment

**Independent Test**: User can create transaction (DEPOSIT/PAYMENT) → assign category → view transactions → edit transaction → delete transaction (transactions remain month-scoped)

### Implementation for US3

- [x] T054 [P] [US3] Create Transaction entity model in src/backend/src/models/Transaction.ts
- [x] T055 [P] [US3] Create Transaction service (CRUD + business logic) in src/backend/src/services/TransactionService.ts
- [x] T056 [US3] Implement POST /api/transactions endpoint in src/backend/src/routes/transactionRoutes.ts
- [x] T057 [US3] Implement GET /api/transactions endpoint with filtering in src/backend/src/routes/transactionRoutes.ts
- [x] T058 [US3] Implement GET /api/transactions/:transactionId endpoint in src/backend/src/routes/transactionRoutes.ts
- [x] T059 [US3] Implement PUT /api/transactions/:transactionId endpoint in src/backend/src/routes/transactionRoutes.ts
- [x] T060 [US3] Implement DELETE /api/transactions/:transactionId endpoint in src/backend/src/routes/transactionRoutes.ts
- [x] T061 [US3] Add transaction type validation (DEPOSIT/PAYMENT only) in src/backend/src/services/TransactionService.ts
- [x] T062 [US3] Add transaction date validation (month scoping) in src/backend/src/services/TransactionService.ts
- [x] T063 [P] [US3] Create transactions dashboard page in src/frontend/src/pages/TransactionsPage.tsx
- [x] T064 [P] [US3] Create transaction form component in src/frontend/src/components/TransactionForm.tsx
- [x] T065 [P] [US3] Create transaction list component in src/frontend/src/components/TransactionList.tsx
- [x] T066 [US3] Implement transaction filtering by date range in src/frontend/src/pages/TransactionsPage.tsx
- [x] T067 [US3] Implement transaction filtering by category in src/frontend/src/pages/TransactionsPage.tsx
- [x] T068 [US3] Add transaction CRUD UI in src/frontend/src/pages/TransactionsPage.tsx
- [x] T069 [US3] Add transaction context in src/frontend/src/context/TransactionContext.tsx
- [x] T070 [US3] Implement amount formatting and validation in src/frontend/src/components/TransactionForm.tsx
- [x] T071 [US3] Add transaction type selection (DEPOSIT/PAYMENT) in src/frontend/src/components/TransactionForm.tsx

**Checkpoint**: User Story 3 complete - users can manage transactions

---

## Phase 6: User Story 4 - Receipt Capture & Processing (Priority: P1)

**Goal**: Enable users to upload receipt photos and automatically extract transaction details

**Independent Test**: User uploads receipt → Lambda processes image → Comprehend extracts details → transaction created with PENDING/PENDING_REVIEW status

### Implementation for US4

- [x] T072 [P] [US4] Create S3 upload service with presigned URLs in src/backend/src/services/S3Service.ts
- [x] T073 [P] [US4] Create Lambda function for receipt processing in src/backend/lambda/receiptProcessor.ts
- [ ] T074 [P] [US4] Create Comprehend integration service in src/backend/src/services/ComprehendService.ts
- [ ] T075 [US4] Implement POST /api/receipts/upload endpoint (presigned URL generation) in src/backend/src/routes/receiptRoutes.ts
- [ ] T076 [US4] Implement S3 → Lambda → DynamoDB event trigger configuration in AWS
- [ ] T077 [US4] Implement receipt extraction logic in receipt processor Lambda in src/backend/lambda/receiptProcessor.ts
- [ ] T078 [US4] Implement confidence threshold check (≥90%) in src/backend/lambda/receiptProcessor.ts
- [ ] T079 [US4] Implement PENDING_REVIEW status for low-confidence results in src/backend/lambda/receiptProcessor.ts
- [ ] T080 [US4] Implement error handling and retry logic in src/backend/lambda/receiptProcessor.ts
- [X] T081 [US4] Implement PUT /api/receipts/:receiptId/confirm endpoint for user review in src/backend/src/routes/receiptRoutes.ts
- [X] T082 [P] [US4] Create receipt upload component with camera input in src/frontend/src/components/ReceiptUpload.tsx
- [X] T083 [P] [US4] Create image compression service (60-70% JPEG quality) in src/frontend/src/services/imageCompressionService.ts
- [X] T084 [US4] Implement image selection and compression in src/frontend/src/components/ReceiptUpload.tsx
- [X] T085 [US4] Implement receipt upload to S3 using presigned URLs in src/frontend/src/services/api.ts
- [X] T086 [US4] Implement upload progress feedback in src/frontend/src/components/ReceiptUpload.tsx
- [ ] T087 [US4] Create receipt review modal for pending transactions in src/frontend/src/components/ReceiptReview.tsx
- [X] T088 [US4] Implement manual transaction creation fallback in src/frontend/src/pages/TransactionsPage.tsx
- [X] T089 [US4] Add receipt images to transaction display in src/frontend/src/components/TransactionList.tsx

**Checkpoint**: User Story 4 complete - users can upload receipts and extract transaction details automatically

---

## Phase 7: User Story 5 - Transaction Analytics & Reporting (Priority: P2)

**Goal**: Provide users with monthly expense analysis and spending insights

**Independent Test**: User views dashboard → sees monthly breakdown by category → sees total deposits vs payments → can filter by date range

### Implementation for US5

- [ ] T090 [P] [US5] Create analytics service for aggregations in src/backend/src/services/AnalyticsService.ts
- [ ] T091 [P] [US5] Implement GET /api/analytics/monthly endpoint in src/backend/src/routes/analyticsRoutes.ts
- [ ] T092 [P] [US5] Implement GET /api/analytics/by-category endpoint in src/backend/src/routes/analyticsRoutes.ts
- [ ] T093 [US5] Add caching layer for analytics queries in src/backend/src/services/AnalyticsService.ts
- [ ] T094 [P] [US5] Create analytics dashboard page in src/frontend/src/pages/AnalyticsPage.tsx
- [ ] T095 [P] [US5] Create bar chart component for category breakdown in src/frontend/src/components/CategoryChart.tsx
- [ ] T096 [P] [US5] Create pie chart component for deposit vs payment ratio in src/frontend/src/components/RatioChart.tsx
- [ ] T097 [US5] Implement date range picker in src/frontend/src/pages/AnalyticsPage.tsx
- [ ] T098 [US5] Implement analytics data fetching and rendering in src/frontend/src/pages/AnalyticsPage.tsx
- [ ] T099 [US5] Add monthly summary cards in src/frontend/src/components/MonthlySummary.tsx
- [ ] T100 [US5] Add export to CSV functionality in src/frontend/src/utils/exportUtils.ts
- [ ] T101 [US5] Implement responsive chart rendering for mobile in src/frontend/src/components/

**Checkpoint**: User Story 5 complete - users can view analytics and spending reports

---

## Phase 8: Polish & Deployment

**Purpose**: Final touches, testing, and production deployment

- [ ] T102 [P] Create comprehensive API documentation in docs/API.md
- [ ] T103 [P] Create user guide/FAQ in docs/USER_GUIDE.md
- [ ] T104 [P] Setup Heroku deployment for frontend in Procfile and .github/workflows/
- [ ] T105 [P] Setup Heroku deployment for backend in Procfile and .github/workflows/
- [ ] T106 Create E2E test suite for critical user flows in tests/e2e/
- [ ] T107 Perform security audit and fix vulnerabilities in src/
- [ ] T108 Optimize frontend bundle size and performance in src/frontend/
- [ ] T109 Setup monitoring and alerting in CloudWatch
- [ ] T110 Create deployment runbook in docs/DEPLOYMENT.md
- [ ] T111 Final testing on production-like staging environment
- [ ] T112 Deploy to production and verify all endpoints
- [ ] T113 Setup customer feedback and issue tracking

---

## Task Dependencies & Execution Order

### Critical Path (Must Complete in Order)
1. **Phase 1 (Setup)** → **Phase 2 (Foundation)** → **All other phases can run in parallel**

### Parallel Opportunities by User Story
- **US1, US2, US3**: Can run simultaneously after Phase 2 (independent data models, endpoints, UI)
- **US4**: Requires completion of US3 (transaction creation), can start Phase 2 completion
- **US5**: Requires completion of US1, US3, US4 (needs user auth, transactions, receipt data)

### Task Parallelization Within Stories
- **US1**: All model tasks (T023-T026) can run in parallel; UI tasks (T033-T035) can run in parallel
- **US2**: Model task (T041-T042) and UI tasks (T048-T049) can run in parallel
- **US3**: Model tasks (T054-T055) and UI tasks (T063-T065) can run in parallel
- **US4**: S3/Lambda services (T072-T074) and frontend components (T082-T083) can run in parallel
- **US5**: Analytics service (T090-T093) and chart components (T094-T096) can run in parallel

---

## Implementation Strategy

### MVP Scope (Weeks 1-4)
- **Phase 1**: Setup (1 week)
- **Phase 2**: Foundation (3 days)
- **Phase 3**: US1 Authentication (5 days)
- **Phase 4**: US2 Categories (3 days)
- **Phase 5**: US3 Transactions (5 days, parallel with US1-2)

**Deliverable**: Users can authenticate, manage categories, and create transactions manually

### Phase 2 (Weeks 5-6)
- **Phase 6**: US4 Receipt Processing (5 days)
- Integrate OCR with Lambda/Comprehend

**Deliverable**: Automated receipt extraction and transaction creation

### Phase 3 (Weeks 7-8)
- **Phase 7**: US5 Analytics (4 days)
- **Phase 8**: Polish & Deployment (4 days)

**Deliverable**: Analytics dashboard, production-ready deployment

---

## Task Summary

| Phase | Component | Task Count | Status |
|-------|-----------|-----------|--------|
| 1 | Setup | 8 | Ready |
| 2 | Foundation | 14 | Ready |
| 3 | US1: Auth | 18 | Ready |
| 4 | US2: Categories | 13 | Ready |
| 5 | US3: Transactions | 19 | Ready |
| 6 | US4: Receipts | 18 | Ready |
| 7 | US5: Analytics | 12 | Ready |
| 8 | Polish | 12 | Ready |
| **TOTAL** | | **114** | ✅ |

---

**Format Validation**: ✅ All 114 tasks follow strict checklist format with:
- ✅ Markdown checkbox: `- [ ]`
- ✅ Task IDs: T001 → T113
- ✅ [P] parallelization markers where applicable
- ✅ [Story] labels for user story tasks (US1-5)
- ✅ Exact file paths in descriptions

**Last Updated**: 2026-06-03  
**Format Version**: 1.0 (Strict Checklist Format)

### AWS Infrastructure Setup

**T1.1 - Setup AWS Account & Services** 
- **Description**: Configure AWS account, create IAM roles, enable services (S3, DynamoDB, Lambda, CloudWatch, Comprehend).
- **Effort**: 2-3 hours
- **Owner**: DevOps/Backend Lead
- **Tasks**:
  - [ ] Create AWS account or use existing
  - [ ] Configure IAM roles for Lambda execution (S3, DynamoDB, Comprehend, CloudWatch)
  - [ ] Create S3 bucket: `family-ledger-receipts-dev` with encryption & access restrictions
  - [ ] Create DynamoDB tables (see T1.2)
  - [ ] Setup CloudWatch log groups with 7-day retention
  - [ ] Enable Comprehend API access
- **Success Criteria**: All AWS services accessible, IAM roles configured, no public S3 access

**T1.2 - Create DynamoDB Tables** 
- **Description**: Create all DynamoDB tables with proper schemas, GSI, and TTL configurations.
- **Effort**: 1-2 hours
- **Depends On**: T1.1
- **Owner**: Backend Lead
- **Tables to Create**:
  - [ ] `Users` (PK: userId)
  - [ ] `Categories` (PK: userId#categoryId, SK: createdAt)
  - [ ] `Transactions` (PK: userId#transactionId, SK: transactionDate, GSI1: userId#transactionMonth)
  - [ ] `RefreshTokens` (PK: tokenId, SK: userId, TTL: expiresAt)
- **Success Criteria**: All tables exist, GSI created, TTL configured, test data insertable

**T1.3 - Setup Heroku App & CI/CD** 
- **Description**: Create Heroku app, configure environment variables, setup basic deployment pipeline.
- **Effort**: 1-2 hours
- **Owner**: DevOps/Backend Lead
- **Tasks**:
  - [ ] Create Heroku app: `family-ledger-dev`
  - [ ] Configure environment variables (AWS credentials, JWT secret, database endpoints)
  - [ ] Setup GitHub Actions or Heroku git deployment
  - [ ] Configure Procfile for Node.js
  - [ ] Test deployment with dummy Node.js server
- **Success Criteria**: Heroku app deployed, accessible via public URL, environment variables loaded

### Backend Foundation

**T1.4 - Initialize Backend Project** 
- **Description**: Create Node.js + Express project with basic structure, middleware, and error handling.
- **Effort**: 2-3 hours
- **Depends On**: T1.3
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Initialize Node.js project with npm/yarn
  - [ ] Install dependencies (Express, dotenv, axios, bcrypt, jsonwebtoken, aws-sdk)
  - [ ] Create folder structure: `src/{routes, controllers, services, middleware, utils}`
  - [ ] Setup Express app with CORS, body parser, error handling middleware
  - [ ] Create `.env.example` with all required variables
  - [ ] Setup basic logging (console or Winston)
- **Success Criteria**: Server starts on port 3000, responds to GET /health with 200 OK

**T1.5 - Implement User Model & Database** 
- **Description**: Create User service to interact with DynamoDB, setup data validation.
- **Effort**: 2-3 hours
- **Depends On**: T1.2, T1.4
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create DynamoDB service (get, put, query, update operations)
  - [ ] Implement User model (create, read, update, getByEmail)
  - [ ] Setup Joi/Zod validation for User inputs
  - [ ] Add helper functions for bcrypt hashing/comparison
- **Success Criteria**: User CRUD operations work, data persists in DynamoDB

**T1.6 - Implement JWT Authentication** 
- **Description**: Create JWT token generation, validation, and refresh logic.
- **Effort**: 2 hours
- **Depends On**: T1.4, T1.5
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create JWT utility (sign, verify, decode tokens)
  - [ ] Implement access token generation (1-hour expiration)
  - [ ] Implement refresh token generation + DynamoDB storage
  - [ ] Create authentication middleware to verify access tokens
  - [ ] Implement token refresh endpoint
- **Success Criteria**: Tokens generate/verify correctly, middleware rejects invalid tokens

### Frontend Foundation

**T1.7 - Initialize Frontend Project** 
- **Description**: Create React project with routing, state management, and responsive layout.
- **Effort**: 2-3 hours
- **Depends On**: None (parallel with backend)
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create React app (Create React App or Vite)
  - [ ] Install dependencies (React Router, TailwindCSS, Axios, Redux/Context)
  - [ ] Setup folder structure: `src/{pages, components, services, hooks, utils}`
  - [ ] Configure TailwindCSS for mobile-first responsive design
  - [ ] Create basic layout (header, nav, main content area)
  - [ ] Setup Axios instance with base URL configuration
- **Success Criteria**: App runs on localhost:3000, responsive on mobile/desktop, routing works

**T1.8 - Build Login/Register UI** 
- **Description**: Create authentication forms with validation and error handling.
- **Effort**: 2-3 hours
- **Depends On**: T1.7
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create Login page component with email/password fields
  - [ ] Create Register page component with validation
  - [ ] Add form validation (email format, password strength)
  - [ ] Add error message display
  - [ ] Add loading states during submission
  - [ ] Setup client-side routing between pages
- **Success Criteria**: Forms render correctly, validation works, responsive on mobile

---

## Phase 2: Core Features (Weeks 3-4)

### Authentication API

**T2.1 - Implement Auth Endpoints** 
- **Description**: Create POST /auth/register, /auth/login, /auth/logout, /auth/refresh-token endpoints.
- **Effort**: 3-4 hours
- **Depends On**: T1.4, T1.5, T1.6
- **Owner**: Backend Lead
- **Endpoints**:
  - [ ] POST /api/auth/register
    - Validate email/password
    - Hash password (bcrypt)
    - Create User record
    - Return access token + refresh token
  - [ ] POST /api/auth/login
    - Validate credentials
    - Generate tokens
    - Return tokens
  - [ ] POST /api/auth/logout
    - Delete refresh token from DynamoDB
  - [ ] POST /api/auth/refresh-token
    - Verify refresh token
    - Generate new access token
- **Success Criteria**: All endpoints tested with Postman/curl, tokens generated/verified correctly

**T2.2 - Connect Frontend Auth** 
- **Description**: Implement login/register API calls, token storage, and navigation flow.
- **Effort**: 2-3 hours
- **Depends On**: T1.8, T2.1
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create auth service (login, register, logout functions)
  - [ ] Store tokens in httpOnly cookies (or localStorage with HTTPS)
  - [ ] Setup automatic token refresh on expiration
  - [ ] Redirect to dashboard after successful login
  - [ ] Handle auth errors and display messages
  - [ ] Protect routes (require authentication)
- **Success Criteria**: User can register, login, tokens stored/refreshed, redirects work

### Category Management

**T2.3 - Implement Category Model & API** 
- **Description**: Create Category service and CRUD endpoints.
- **Effort**: 2-3 hours
- **Depends On**: T1.5, T1.6, T2.1
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create Category model (create, read, update, delete, listByUserId)
  - [ ] Setup category validation (name, color, icon)
  - [ ] Implement endpoints:
    - [ ] GET /api/categories (list user categories)
    - [ ] POST /api/categories (create)
    - [ ] PUT /api/categories/{categoryId} (update)
    - [ ] DELETE /api/categories/{categoryId} (delete)
  - [ ] Add user isolation (ensure user can only access own categories)
- **Success Criteria**: Category CRUD works, user isolation enforced, data persists

**T2.4 - Build Category UI** 
- **Description**: Create category list, create/edit forms.
- **Effort**: 2-3 hours
- **Depends On**: T1.8, T2.3
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create category list page with delete option
  - [ ] Create category form (modal or separate page)
  - [ ] Add color/icon picker
  - [ ] Implement add/edit/delete actions
  - [ ] Show loading states and error messages
  - [ ] Ensure responsive design
- **Success Criteria**: Categories display, can create/edit/delete, UI responsive

### Transaction Capture & S3 Upload

**T2.5 - Implement Receipt Upload to S3** 
- **Description**: Create presigned S3 URLs and handle client-side image upload.
- **Effort**: 2-3 hours
- **Depends On**: T1.1, T1.4, T1.6
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create S3 service (generate presigned URLs, validate file types)
  - [ ] Implement endpoint: POST /api/transactions/upload-receipt
    - Generate presigned URL for S3
    - Return URL to client
  - [ ] Validate file type (image/jpeg, image/png only)
  - [ ] Validate file size (max 5MB)
  - [ ] Add security headers to S3 response
- **Success Criteria**: Presigned URLs generated, files uploadable to S3, validation works

**T2.6 - Build Receipt Camera & Upload UI** 
- **Description**: Create photo capture interface and upload logic.
- **Effort**: 2-3 hours
- **Depends On**: T1.8, T2.5
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create camera input (file type="file" accept="image/*" with mobile camera)
  - [ ] Add image preview
  - [ ] Add upload progress indicator
  - [ ] Request presigned URL from backend
  - [ ] Upload image to S3 using presigned URL
  - [ ] Handle upload errors and retries
  - [ ] Ensure responsive design for mobile
- **Success Criteria**: Camera works on mobile, images upload to S3, progress shown

**T2.7 - Setup Lambda for Receipt Processing** 
- **Description**: Create Lambda function to process S3 objects with Comprehend and store in DynamoDB.
- **Effort**: 3-4 hours
- **Depends On**: T1.1, T1.2, T1.6
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create Lambda function: `ReceiptProcessor`
  - [ ] Configure S3 trigger (CreateObject event)
  - [ ] Implement logic:
    - [ ] Receive S3 event (bucket, key)
    - [ ] Download image from S3
    - [ ] Call Amazon Comprehend (text detection or Textract)
    - [ ] Extract: merchantName, transactionDate, totalAmount
    - [ ] Validate extracted data (confidence score > 70%)
    - [ ] Return extracted data structure
  - [ ] Error handling: Log failures to CloudWatch
  - [ ] Set timeout: 60 seconds
- **Success Criteria**: Lambda triggered on S3 upload, Comprehend extracts data, CloudWatch logs receipt

### Transaction Management

**T2.8 - Implement Transaction Model & API** 
- **Description**: Create Transaction service and endpoints.
- **Effort**: 3-4 hours
- **Depends On**: T1.5, T2.3, T2.7
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Create Transaction model (create, read, update, delete, query by month/category)
  - [ ] Setup transaction validation
  - [ ] Implement endpoints:
    - [ ] POST /api/transactions (create new transaction)
      - Accept: categoryId, amount, transactionDate, merchantName, receiptImageUrl
      - Determine type (DEPOSIT if amount > 0, PAYMENT if amount < 0)
      - Store in DynamoDB
    - [ ] GET /api/transactions (list with filters: month, category)
    - [ ] PUT /api/transactions/{txnId} (update)
    - [ ] DELETE /api/transactions/{txnId} (soft delete)
  - [ ] Add user isolation
- **Success Criteria**: Transaction CRUD works, queries by month/category work, user isolation enforced

**T2.9 - Build Transaction Creation Flow** 
 save.
- **Effort**: 3-4 hours
- **Depends On**: T1.8, T2.6, T2.8
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create transaction flow page with steps
  - [ ] Step 1: Select category
  - [ ] Step 2: Take/upload receipt photo (integrates T2.6)
  - [ ] Step 3: Confirm extracted data (merchantName, date, amount editable)
  - [ ] Step 4: Add optional notes
  - [ ] Step 5: Submit to backend
  - [ ] Show success/error messages
  - [ ] Add loading states
  - [ ] Ensure responsive design
- **Success Criteria**: Full flow works end-to-end, extracted data editable, data saved to backend

---

## Phase 3: Advanced Features (Weeks 5-6)

### Transaction Management (Continued)

**T3.1 - Build Transaction List & Filter UI** 
- **Description**: Create transaction list page with date/category filters and pagination.
- **Effort**: 2-3 hours
- **Depends On**: T2.9
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create transaction list page
  - [ ] Display transactions in table/card format
  - [ ] Add filters: date range, category, type (deposit/payment)
  - [ ] Implement pagination (10 items/page)
  - [ ] Add edit/delete buttons per transaction
  - [ ] Show transaction details (merchant, date, amount, category, receipt image)
  - [ ] Responsive design for mobile
- **Success Criteria**: List displays, filters work, pagination functional, responsive

**T3.2 - Implement Edit/Delete Transaction** 
- **Description**: Allow users to update or delete transactions.
- **Effort**: 1-2 hours
- **Depends On**: T2.8, T3.1
- **Owner**: Frontend Lead / Backend Lead (shared)
- **Tasks**:
  - [ ] Create edit transaction modal/page
  - [ ] Allow editing: amount, category, notes, date
  - [ ] Add confirmation dialog for delete
  - [ ] Call backend endpoints (PUT, DELETE)
  - [ ] Refresh list after update
  - [ ] Handle errors
- **Success Criteria**: Edit/delete operations work, list updates automatically

### Analytics & Reporting

**T3.3 - Implement Analytics API** 
- **Description**: Create endpoints for monthly spending summary and category breakdown.
- **Effort**: 2-3 hours
- **Depends On**: T2.8
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Implement endpoint: GET /api/analytics/monthly
    - Query transactions by month
    - Calculate total deposits, total payments, net balance
    - Return data for dashboard
  - [ ] Implement endpoint: GET /api/analytics/by-category
    - Query transactions grouped by category
    - Calculate spending per category
    - Return category breakdown
  - [ ] Implement endpoint: GET /api/analytics/trends (optional for later)
    - Compare months year-over-year
- **Success Criteria**: Endpoints return correct calculations, data filterable by month/year

**T3.4 - Build Analytics Dashboard** 
- **Description**: Create visual dashboard with charts and summary statistics.
- **Effort**: 3-4 hours
- **Depends On**: T3.3
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create dashboard page
  - [ ] Add summary cards (total deposits, total payments, net balance)
  - [ ] Add pie chart: spending by category
  - [ ] Add bar chart: monthly trends (optional)
  - [ ] Add date picker to filter by month
  - [ ] Integrate chart library (Chart.js, Recharts)
  - [ ] Responsive design for mobile
- **Success Criteria**: Dashboard displays, charts render correctly, data updates with filters

### User Profile Management

**T3.5 - Implement User Profile API** 
- **Description**: Create endpoints for user profile viewing and updates.
- **Effort**: 1-2 hours
- **Depends On**: T1.5, T1.6
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Implement endpoint: GET /api/users/{userId} (get profile)
  - [ ] Implement endpoint: PUT /api/users/{userId} (update profile)
    - Allow editing: firstName, lastName, email (if unique)
    - Don't allow password change here (separate endpoint)
  - [ ] Add user isolation (can only update own profile)
- **Success Criteria**: Profile endpoints work, user isolation enforced

**T3.6 - Build User Profile UI** 
- **Description**: Create profile page for viewing/editing user information.
- **Effort**: 1-2 hours
- **Depends On**: T3.5
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Create profile page
  - [ ] Display user info (email, name)
  - [ ] Add edit form
  - [ ] Add logout button
  - [ ] Add password change option (placeholder for T3.7)
  - [ ] Show loading states and success messages
- **Success Criteria**: Profile displays, can edit, logout works

**T3.7 - Implement Password Change** 
- **Description**: Add password change functionality.
- **Effort**: 1-2 hours
- **Depends On**: T3.5, T3.6
- **Owner**: Backend Lead / Frontend Lead (shared)
- **Backend**:
  - [ ] Create endpoint: POST /api/auth/change-password
  - [ ] Require current password verification
  - [ ] Hash new password with bcrypt
- **Frontend**:
  - [ ] Create password change form
  - [ ] Add current/new password fields
  - [ ] Validate password strength
  - [ ] Show success/error messages
- **Success Criteria**: Password can be changed securely, form validates

---

## Phase 4: Refinement & Deployment (Weeks 7-8)

### Performance & Security Optimization

**T4.1 - Image Compression & Optimization** 
- **Description**: Add client-side image compression before upload.
- **Effort**: 1-2 hours
- **Depends On**: T2.6
- **Owner**: Frontend Lead
- **Tasks**:
  - [ ] Integrate image compression library (sharp.js or client-side alternative)
  - [ ] Compress images to 60-70% quality before S3 upload
  - [ ] Reduce file size to <500KB
  - [ ] Show original vs compressed sizes
- **Success Criteria**: Images compressed, file size < 500KB, quality acceptable

**T4.2 - Implement Rate Limiting** 
- **Description**: Add rate limiting to API endpoints for security.
- **Effort**: 1-2 hours
- **Depends On**: T1.4
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Integrate rate limiting library (express-rate-limit)
  - [ ] Apply to auth endpoints (10 req/min)
  - [ ] Apply to transaction endpoints (100 req/min per user)
  - [ ] Apply to file upload (5 req/min per user)
- **Success Criteria**: Rate limits enforced, 429 errors returned on excess

**T4.3 - Implement Input Validation & Sanitization** 
- **Description**: Validate and sanitize all user inputs.
- **Effort**: 2-3 hours
- **Depends On**: T1.4
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Use Joi/Zod for schema validation on all endpoints
  - [ ] Sanitize email, names, notes (remove HTML/scripts)
  - [ ] Validate transaction amounts (must be numeric, > 0)
  - [ ] Validate dates (must be valid ISO8601)
  - [ ] Add error responses for invalid input
- **Success Criteria**: All inputs validated, malicious input rejected

**T4.4 - Setup HTTPS & Security Headers** 
- **Description**: Ensure HTTPS enforcement and security headers.
- **Effort**: 1-2 hours
- **Depends On**: T1.3, T1.4
- **Owner**: Backend Lead / DevOps
- **Tasks**:
  - [ ] Enable HTTPS on Heroku
  - [ ] Add security headers middleware (helmet.js)
  - [ ] Configure CORS properly (only allow Heroku frontend domain)
  - [ ] Add CSP (Content Security Policy) headers
  - [ ] Test with security scanner
- **Success Criteria**: HTTPS enforced, security headers present, no CORS errors

### Testing

**T4.5 - Write Unit Tests** 
- **Description**: Create unit tests for backend services.
- **Effort**: 3-4 hours
- **Depends On**: T2.8, T3.3, T3.5
- **Owner**: Backend Lead
- **Framework**: Jest or Mocha
- **Coverage**:
  - [ ] User service (create, getByEmail, hash, compare)
  - [ ] Category service (CRUD operations)
  - [ ] Transaction service (CRUD, queries)
  - [ ] JWT utilities (sign, verify)
  - [ ] Validation functions
- **Success Criteria**: 80%+ test coverage, all tests pass

**T4.6 - Write Integration Tests** 
- **Description**: Create integration tests for API endpoints.
- **Effort**: 3-4 hours
- **Depends On**: T2.1, T2.3, T2.8, T3.3
- **Owner**: Backend Lead
- **Framework**: Supertest + Jest
- **Test Cases**:
 logout)
  - [ ] Category CRUD
  - [ ] Transaction CRUD
  - [ ] Analytics endpoints
  - [ ] User isolation (can't access other user's data)
  - [ ] Error cases (invalid input, unauthorized access)
- **Success Criteria**: All critical paths tested, 100% auth endpoint coverage

**T4.7 - Write Frontend Tests** 
- **Description**: Create component and integration tests for React.
- **Effort**: 2-3 hours
- **Depends On**: T1.8, T2.9, T3.4
- **Owner**: Frontend Lead
- **Framework**: Jest + React Testing Library
- **Coverage**:
  - [ ] Login/Register components
  - [ ] Transaction form
  - [ ] Category list
  - [ ] Dashboard
- **Success Criteria**: Core components tested, user interactions verified

**T4.8 - End-to-End Testing** 
- **Description**: Create E2E tests for complete user workflows.
- **Effort**: 2-3 hours
- **Depends On**: T2.9, T3.1, T3.4
- **Owner**: QA / Frontend Lead
- **Framework**: Cypress or Playwright
- **Scenarios**:
  - [ ] User registration and login
  - [ ] Create transaction with receipt photo
  - [ ] View and filter transactions
  - [ ] Edit/delete transaction
  - [ ] View analytics dashboard
- **Success Criteria**: All workflows execute successfully, no errors

### Documentation & Deployment

**T4.9 - Write API Documentation** 
- **Description**: Create comprehensive API documentation (Swagger/OpenAPI).
- **Effort**: 2-3 hours
- **Depends On**: T2.1, T2.3, T2.8, T3.3, T3.5
- **Owner**: Backend Lead
- **Tasks**:
  - [ ] Document all endpoints (request/response examples)
  - [ ] Document authentication (JWT flow)
  - [ ] Document error codes and status messages
  - [ ] Generate Swagger UI (swagger-ui-express)
  - [ ] Host at /api/docs
- **Success Criteria**: Swagger UI accessible, all endpoints documented

**T4.10 - Write Deployment Guide** 
- **Description**: Create step-by-step deployment documentation.
- **Effort**: 1-2 hours
- **Depends On**: All tasks
- **Owner**: DevOps / Tech Lead
- **Sections**:
  - [ ] Prerequisites (AWS account, Heroku account)
  - [ ] AWS setup (S3, DynamoDB, Lambda, IAM)
  - [ ] Backend deployment to Heroku
  - [ ] Frontend deployment to Heroku
  - [ ] Environment variables configuration
  - [ ] Troubleshooting guide
- **Success Criteria**: Guide is clear, any new developer can deploy

**T4.11 - Setup Monitoring & Alerts** 
- **Description**: Configure CloudWatch alarms and monitoring.
- **Effort**: 1-2 hours
- **Depends On**: T1.3
- **Owner**: DevOps / Backend Lead
- **Tasks**:
  - [ ] Create CloudWatch alarms for Lambda errors
  - [ ] Create alarm for DynamoDB throttling
  - [ ] Setup email notifications for alarms
  - [ ] Create custom metrics for transaction processing
  - [ ] Setup dashboard for monitoring
- **Success Criteria**: Alarms configured, can receive notifications

**T4.12 - Deploy to Production** 
- **Description**: Final deployment to production environments.
- **Effort**: 2-3 hours
- **Depends On**: T4.4, T4.5, T4.6, T4.7, T4.8, T4.10
- **Owner**: DevOps / Tech Lead
- **Tasks**:
  - [ ] Create production AWS environment (separate account or isolated resources)
  - [ ] Deploy backend to Heroku production
  - [ ] Deploy frontend to Heroku production
  - [ ] Configure production environment variables
  - [ ] Run smoke tests
  - [ ] Monitor for errors
- **Success Criteria**: Application accessible at production URL, all features working

### Optional Future Work

- Implement caching (Redis) for analytics**T4.13 - Performance Tuning** 
- Optimize DynamoDB queries with better GSI
- Add pagination to transaction queries
- Lazy load images

- Mobile app (React Native/Flutter)**T4.14 - Enhanced Features** 
- Budget alerts and notifications
- Recurring transactions
- Data export (CSV, PDF)
- Multi-currency support
- Shared budgets/categories

---

## Task Dependencies Map

```
T1.1 (AWS Setup)
 T1.2 (DynamoDB Tables)
 T1.3 (Heroku Setup)
 T1.4 (Backend Init)   
 T1.5 (User Model)       
 T1.6 (JWT Auth)          
 T2.1 (Auth Endpoints)             
 T2.2 (Frontend Auth)                 
 T2.3 (Category Model)          
 T2.4 (Category UI)             
 T2.8 (Transaction Model)          
 T2.9 (Transaction Flow)              
 T3.1 (Transaction List)                  
 T3.2 (Edit/Delete)                     
 T2.8 (used in T3.3)                  
       
 T2.5 (S3 Upload Backend)       
 T2.6 (Camera UI)          
       
 T2.7 (Lambda Receipt Processing)       
 T2.9 (integrated in transaction flow)          
       
 T3.3 (Analytics API)       
 T3.4 (Dashboard UI)          
       
 T3.5 (User Profile API)       
 T3.6 (User Profile UI)          
 T3.7 (Password Change)              
       
 T4.2 (Rate Limiting)       
 T4.3 (Input Validation)       
 T4.4 (HTTPS & Security)       

 T1.7 (Frontend Init)
 T1.8 (Auth UI)   
 T2.4 (Category UI)      
 T2.6 (Camera UI)      
 T2.9 (Transaction Flow)   
 T3.1 (Transaction List)   
 T3.4 (Dashboard)   
 T3.6 (Profile UI)   

 T4.1 (Image Compression)
 T4.5-T4.8 (Testing)    
 T4.12 (Production Deployment)        
```

---

## Effort Estimates

- **Phase 1**: 20-25 hours (foundation)
- **Phase 2**: 25-30 hours (core features)
- **Phase 3**: 15-20 hours (advanced features)
- **Phase 4**: 20-25 hours (refinement, testing, deployment)
- **Total**: ~80-100 hours (2-3 weeks with 2 developers, 1 devops)

---

## Success Criteria (Overall)

 Users can register, login, and manage categories
 Receipt capture and OCR extraction works end-to-end
 Transactions persist and are queryable by month/category
 Dashboard displays accurate spending analytics
 UI is responsive on mobile/tablet/desktop
 Multi-user isolation enforced
 All critical paths have test coverage (>80%)
 API documented with Swagger
 Deployed to production with monitoring

---

## Bank Statement Import (PDF + Textract) - Backend Tasks

**Scope**: Add a dedicated backend flow for importing bank statement PDFs and creating `PENDING_REVIEW` transaction candidates.

### Backend Checklist

- [ ] BSI-001 Create statement presign endpoint in `src/backend/src/routes/uploadRoutes.ts`
  - Owner: Backend Lead
  - Estimate: 2h
  - Depends on: Existing auth middleware and S3 service
  - Acceptance: `POST /api/uploads/presign-statement` validates `filename` + `contentType=application/pdf` and returns `{ url, key, statementId }`.

- [ ] BSI-002 Add statement S3 key builder in `src/backend/src/services/S3Service.ts`
  - Owner: Backend Lead
  - Estimate: 1h
  - Depends on: BSI-001
  - Acceptance: New helper builds keys using `statements/{userId}/{year-month}/{statementId}/{filename}`.

- [ ] BSI-003 Register/document new upload route in `src/backend/src/server.ts` and docs
  - Owner: Backend Lead
  - Estimate: 0.5h
  - Depends on: BSI-001
  - Acceptance: Route appears in `/api/routes` output and backend docs.

- [ ] BSI-004 Create statement import Lambda scaffold in `src/backend/lambda/statementImportProcessor.ts`
  - Owner: Backend Lead
  - Estimate: 3h
  - Depends on: BSI-001, BSI-002
  - Acceptance: Lambda validates S3 events, ignores non-PDF objects, logs `bucket`, `key`, `statementId`.

- [ ] BSI-005 Implement Textract async start/get flow in `src/backend/lambda/statementImportProcessor.ts`
  - Owner: Backend Lead
  - Estimate: 5h
  - Depends on: BSI-004
  - Acceptance: Uses `StartDocumentAnalysis` and `GetDocumentAnalysis` to process multi-page PDFs.

- [ ] BSI-006 Implement table-row parser and normalizer in `src/backend/lambda/statementImportProcessor.ts`
  - Owner: Backend Lead
  - Estimate: 6h
  - Depends on: BSI-005
  - Acceptance: Extracts date, description, debit/credit/balance; debits are negative and credits are positive.

- [ ] BSI-007 Add deduplication strategy for imported rows in `src/backend/lambda/statementImportProcessor.ts`
  - Owner: Backend Lead
  - Estimate: 2h
  - Depends on: BSI-006
  - Acceptance: Duplicate candidates are skipped using a stable signature (`statementId + date + amount + description`).

- [ ] BSI-008 Persist imported candidates as `PENDING_REVIEW` via `src/backend/src/services/TransactionService.ts`
  - Owner: Backend Lead
  - Estimate: 4h
  - Depends on: BSI-006
  - Acceptance: Imported movements are visible in transaction queries and can be edited/confirmed.

- [ ] BSI-009 Add transaction source and statement metadata fields in `src/backend/src/models/Transaction.ts`
  - Owner: Backend Lead
  - Estimate: 2h
  - Depends on: BSI-008
  - Acceptance: Model supports source markers (for example `STATEMENT_IMPORT`) and statement identifiers.

- [ ] BSI-010 Add Terraform resources/policies for statement import in `terraform/main.tf` and `terraform/receipt_processor/main.tf`
  - Owner: DevOps/Backend Lead
  - Estimate: 4h
  - Depends on: BSI-004, BSI-005
  - Acceptance: Includes S3 trigger (`statements/*.pdf`) and Textract async permissions (`StartDocumentAnalysis`, `GetDocumentAnalysis`).

- [ ] BSI-011 Add backend tests for statement import parser and endpoint validation in `src/backend/tests/`
  - Owner: Backend Lead
  - Estimate: 5h
  - Depends on: BSI-001, BSI-006, BSI-008
  - Acceptance: Unit tests cover parser edge cases; integration tests cover presign validation and candidate creation.

- [ ] BSI-012 Add operational runbook notes in `README.md` and `docs/bank-statement-import-lambda-plan.md`
  - Owner: Tech Lead
  - Estimate: 1.5h
  - Depends on: BSI-010, BSI-011
  - Acceptance: Includes failure modes, retry strategy, and log search keys (`statementId`, `jobId`, `key`).

### Execution Order

1. BSI-001 -> BSI-002 -> BSI-003
2. BSI-004 -> BSI-005 -> BSI-006 -> BSI-007
3. BSI-008 -> BSI-009
4. BSI-010
5. BSI-011
6. BSI-012

### Milestone Definition

- M1: Upload and trigger path complete (`BSI-001` to `BSI-005`)
- M2: Parsing and persistence complete (`BSI-006` to `BSI-009`)
- M3: Infra, tests, and runbook complete (`BSI-010` to `BSI-012`)
