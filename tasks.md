# Digital Wallet & Expense Ledger - Task Breakdown

## Overview
This document breaks down the spec.md into actionable, dependency-ordered tasks across 4 implementation phases (8 weeks).

**Task Status Legend:**
 ` Not startedpending` - 
- -  ` Completeddone` 
- 
---

## Phase 1: Foundation & Infrastructure (Weeks 1-2)

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

