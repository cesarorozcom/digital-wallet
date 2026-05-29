# Digital Wallet & Expense Ledger - Project Specification

## Project Overview

A mobile-first web application for family expense tracking and financial management. Users can capture receipts via photo, automatically extract transaction details, and categorize expenses. The system provides real-time transaction processing and analytics to help families improve their financial health.

**Project Name**: Family Finance Ledger (Billetera Digital)

---

## User Stories & Functional Requirements

### 1. User Authentication & Management
- **Story**: Multi-user system with secure authentication
- **Requirements**:
  - User registration and login
  - JWT-based session management
  - Password security (bcrypt hashing)
  - User profile management
  - Multi-user support with role-based access

### 2. Category Management
- **Story**: Users configure categories that match their personal needs
- **Requirements**:
  - Create, read, update, delete (CRUD) categories
  - Each user has personalized categories
  - Categories can have 0 or more transactions
  - Categories are user-scoped (multi-tenancy)

### 3. Receipt Capture & Processing
- **Story**: User takes photo of receipt → automatic data extraction → transaction creation
- **Requirements**:
  - Camera integration for mobile web (file input with camera)
  - Photo upload to AWS S3
  - S3 Create Object event triggers Lambda function
  - Lambda uses Amazon Comprehend for OCR/text extraction
  - Extract: merchant name, transaction date, total amount
  - Result stored in DynamoDB

### 4. Transaction Management
- **Story**: Create, view, and manage transactions with category assignment
- **Requirements**:
  - **Transaction types: Deposit (value > 0) or Payment (value × -1)** only (no refunds or transfers)
  - Transaction validity scoped to calendar month
  - Transaction date is critical for reporting
  - Transaction requires: category, amount, date, receipt image reference
  - User authentication required to finalize transaction
  - Transaction states: 
    - **PENDING** (receipt captured, awaiting Comprehend processing)
    - **PENDING_REVIEW** (confidence < 90%, user must confirm)
    - **CONFIRMED** (authenticated and validated)
  - **No transaction limits** on amount or frequency

### 5. Transaction Analytics & Reporting
- **Story**: User views spending by category and month
- **Requirements**:
  - Monthly expense breakdown by category
  - Total deposits vs. payments
  - Visual dashboard (charts/summaries)
  - Filter transactions by date range and category

---

## Non-Functional Requirements

### Security
- End-to-end encryption for sensitive data in transit (HTTPS/TLS)
- Authentication via JWT tokens
- Role-based access control (user can only access their own data)
- DynamoDB encryption at rest
- S3 bucket encryption and access restrictions
- AWS IAM policies: principle of least privilege
- Input validation and sanitization (OWASP top 10)
- Rate limiting on API endpoints

### Performance & Scalability
- Responsive design for mobile/tablet/desktop
- Lazy loading for transaction lists
- **Image compression: 60-70% JPEG quality** before S3 upload (prioritizes cost-effectiveness)
- DynamoDB on-demand billing for variable load
- Lambda timeout: 60 seconds for receipt processing
- Caching strategy for frequently accessed data
- **SLA Target**: Best-effort (no specific uptime target)

### Multi-Tenancy & Data Isolation
- User data strictly isolated
- Row-level security: each user only sees their transactions/categories
- DynamoDB partition key: userId

### Maintainability
- Clean, modular code architecture
- Clear separation of concerns (UI, API, business logic)
- Comprehensive error handling and logging
- Code documentation and inline comments where necessary
- Version control (Git) with semantic versioning

### Logging & Monitoring
- CloudWatch logs with 7-day TTL
- Error tracking and alerting
- Lambda execution logs
- API request/response logging
- User action audit trail

---

## Data Model

### Entity Relationships

```
User
├── Category (1 to many)
│   └── Transaction (0 to many)
└── (authentication, profile)

Transaction
├── Category (many to 1)
├── Receipt Image (S3 reference)
└── Extracted Data (from Comprehend)
```

### Core Entities

#### User
```
{
  userId: UUID (PK)
  email: string (unique)
  passwordHash: string (bcrypt)
  firstName: string
  lastName: string
  createdAt: ISO8601
  updatedAt: ISO8601
}
```

#### RefreshToken
```
{
  tokenId: UUID (PK)
  userId: UUID (SK, GSI)
  hashedToken: string (hashed for security)
  expiresAt: ISO8601 (TTL attribute for auto-deletion)
  createdAt: ISO8601
  revokedAt: ISO8601 (optional, for logout)
}
```
**Note**: DynamoDB TTL will automatically delete expired tokens after 7 days.

#### Category
```
{
  categoryId: UUID (PK)
  userId: UUID (SK, GSI)
  name: string
  color: string (hex, optional)
  icon: string (optional)
  createdAt: ISO8601
  updatedAt: ISO8601
}
```

#### Transaction
```
{
  transactionId: UUID (PK)
  userId: UUID (SK, GSI)
  categoryId: UUID (GSI)
  amount: number (positive for deposit, negative for payment, unlimited)
  transactionDate: ISO8601
  transactionMonth: YYYY-MM (for monthly queries)
  type: 'DEPOSIT' | 'PAYMENT' (only these two types)
  merchantName: string (extracted from receipt)
  receiptImageUrl: string (S3 path, JPEG 60-70% quality)
  status: 'PENDING' | 'PENDING_REVIEW' | 'CONFIRMED'
  notes: string (optional)
  createdAt: ISO8601
  updatedAt: ISO8601
  extractedData: {
    confidence: number (0-100, from Comprehend; ≥90% threshold)
    rawText: string
    reviewNotes: string (optional, if status = PENDING_REVIEW)
  }
}
```

---

## Technical Architecture

### Frontend (Heroku)
- **Framework**: React.js or Vue.js
- **Styling**: TailwindCSS or Bootstrap (mobile-first responsive)
- **Camera Integration**: MediaDevices API (HTML5)
- **State Management**: Redux/Vuex or Context API
- **HTTP Client**: Axios or Fetch API
- **Authentication**: JWT stored in httpOnly cookies
- **Deployment**: Heroku buildpack for Node.js

**Stack Options**:
1. **Recommended**: Node.js (Express) + React + PostgreSQL (for session state if needed)
2. **Alternative**: Node.js (NestJS) + Vue.js

### Backend (AWS)

#### Compute
- **Lambda Functions**:
  - Receipt Processing Lambda (triggered by S3 CreateObject)
  - API Lambda (wrapped in API Gateway) or traditional REST API
  - Timeout: 60 seconds for Comprehend processing

#### Storage
- **S3**:
  - Bucket: `family-ledger-receipts-{env}`
  - Folder structure: `{userId}/{year}/{month}/{transactionId}.jpg`
  - Lifecycle policy: Archive to Glacier after 90 days
  - Encryption: AES-256 at rest
  - Access: Private (CloudFront optional for serving)

- **DynamoDB**:
  - Table: `Transactions`
    - PK: `userId#transactionId`
    - SK: `transactionDate`
    - GSI1: `userId#transactionMonth`
    - GSI2: `categoryId#transactionDate`
  - Table: `Users`
    - PK: `userId`
  - Table: `Categories`
    - PK: `userId#categoryId`
    - SK: `createdAt`
  - Billing: On-demand mode
  - Backup: Point-in-time recovery enabled

#### API Gateway
- REST API or HTTP API
- CORS configuration for Heroku frontend domain
- Request/response validation
- Rate limiting and throttling
- API keys for Lambda auth (optional, use IAM roles preferred)

#### AI/ML
- **Amazon Comprehend**:
  - Text extraction from receipt images
  - Entity recognition for merchant names
  - **Confidence threshold: ≥90%** required to accept extracted data automatically
  - Alternative: AWS Textract for more advanced OCR
  - User may review and confirm even if confidence is high
  - If confidence < 90%, transaction enters PENDING_REVIEW state requiring user validation

#### Monitoring & Logging
- **CloudWatch**:
  - Log Group: `/aws/lambda/receipt-processor`
  - Log retention: 7 days
  - Custom metrics for transaction processing
  - Alarms for Lambda errors

---

## API Endpoints (RESTful)

```
Authentication
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh-token     - Refresh JWT

Users
GET    /api/users/{userId}         - Get user profile
PUT    /api/users/{userId}         - Update user profile

Categories
GET    /api/categories             - List user categories
POST   /api/categories             - Create category
PUT    /api/categories/{catId}     - Update category
DELETE /api/categories/{catId}     - Delete category

Transactions
GET    /api/transactions           - List transactions (with filters: month, category)
POST   /api/transactions           - Create transaction (multipart with image)
GET    /api/transactions/{txnId}   - Get transaction details
PUT    /api/transactions/{txnId}   - Update transaction
DELETE /api/transactions/{txnId}   - Delete transaction (soft delete)

Analytics
GET    /api/analytics/monthly      - Monthly spending summary
GET    /api/analytics/by-category  - Breakdown by category
GET    /api/analytics/trends       - Spending trends
```

---

## Stateless Authentication with JWT

### How It Works

**Stateless JWT approach** means the backend **does not store session data**. Instead:

1. **User logs in** → Backend verifies credentials (email + password hash from DynamoDB)
2. **Backend generates two tokens**:
   - **Access Token (JWT)**: Contains `userId`, `email`, token type, expiration (1 hour)
   - **Refresh Token (opaque string)**: Stored in DynamoDB with TTL, expires in 7 days
3. **Frontend stores tokens**:
   - Access Token: httpOnly cookie (automatic with every request)
   - Refresh Token: httpOnly cookie (used only to refresh access token)
4. **Every API request** includes Access Token in `Authorization: Bearer <token>`
5. **Backend verifies JWT**:
   - Decode token signature (no database query needed)
   - Check expiration and userId
   - If valid, user is authenticated
6. **When Access Token expires** (1 hour):
   - Frontend sends Refresh Token to `/api/auth/refresh-token`
   - Backend verifies Refresh Token exists in DynamoDB (check TTL)
   - If valid, generate new Access Token
   - If invalid/expired, user must re-login

### Why This is "Stateless"

- **No session store needed** (no PostgreSQL)
- Each request is independent and self-contained
- Token verification is cryptographic (CPU-only, no database queries)
- Scales horizontally without shared state (perfect for Lambda + API Gateway)

### Security Considerations

### Authentication & Authorization
- **Access Token (JWT)**: 1-hour expiration, contains minimal claims (`userId`, `email`)
- **Refresh Token**: 7-day expiration, stored in DynamoDB with TTL attribute for auto-deletion
- Token validation: Signature verification via RSA public key (no DB lookup)
- All API endpoints require valid Access Token in `Authorization` header
- User can only access their own data (verified via `userId` in JWT claims)
- Token revocation: User logout deletes Refresh Token from DynamoDB (invalidates session)

### Data Protection
- Passwords hashed with bcrypt (rounds: 12)
- Sensitive data encrypted in DynamoDB (enable encryption at rest)
- HTTPS only (no HTTP)
- CORS restricted to Heroku domain

### Input Validation
- Validate file type (image/jpeg, image/png only)
- Validate file size (max 5MB)
- Sanitize all user inputs on backend
- Rate limit API endpoints (10 requests/minute per user)

### AWS Security
- S3 bucket: Block all public access
- Lambda execution role: minimal permissions (S3 read, DynamoDB write, Comprehend, CloudWatch)
- DynamoDB: encryption at rest + point-in-time recovery
- CloudWatch logs: access restricted to service roles

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Setup Heroku app and AWS services
- [ ] User authentication (registration, login, JWT)
- [ ] Database schema and DynamoDB tables
- [ ] Frontend: Login/register UI, responsive layout

### Phase 2: Core Features (Weeks 3-4)
- [ ] Category CRUD operations
- [ ] Transaction creation flow (UI + API)
- [ ] Receipt image upload to S3
- [ ] Lambda + Comprehend integration for data extraction

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Transaction list and filtering
- [ ] Analytics dashboard (monthly summary, charts)
- [ ] Edit/delete transactions
- [ ] User profile management

### Phase 4: Refinement & Deployment (Weeks 7-8)
- [ ] Performance optimization (image compression, lazy loading)
- [ ] Security hardening (rate limiting, input validation)
- [ ] Comprehensive testing (unit, integration, e2e)
- [ ] Production deployment to Heroku + AWS

---

## Success Criteria

- ✅ Users can capture receipts and automatically extract transaction data
- ✅ Multi-user system with secure authentication
- ✅ Responsive UI works on mobile, tablet, desktop
- ✅ Transaction data persists and is queryable by month/category
- ✅ Code is maintainable and well-documented
- ✅ Zero security vulnerabilities (OWASP top 10)
- ✅ CloudWatch logs captured with 7-day retention
- ✅ System handles concurrent users without degradation

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | React + TailwindCSS | Fast, component-based, mobile-first styling |
| Backend API | Node.js + Express/NestJS | Simple, maintainable, well-documented |
| Frontend Hosting | Heroku | PaaS, easy deployment, auto-scaling |
| Image Storage | AWS S3 | Scalable, cost-effective, event-driven |
| Database | DynamoDB | ACID compliance, serverless, multi-tenancy optimized |
| OCR/Extraction | Amazon Comprehend | Managed service, no infrastructure overhead |
| Compute | AWS Lambda | Serverless, pay-per-use, triggered by S3 events |
| Logging | CloudWatch | Integrated with AWS, easy retention management |
| Authentication | JWT | Stateless, scalable, secure |

---

## Assumptions & Constraints

- Users have stable internet connectivity (web-based, not offline-first)
- Receipt images must be legible for Comprehend to extract data
- Single currency (can extend for multi-currency later)
- AWS region: us-east-1 (can be parameterized)
- Heroku region: us or eu (based on user location)

---

## Clarifications (Finalized)

### 1. Comprehend Confidence Threshold
- **Decision**: ≥90% confidence required to accept extracted data automatically
- **Implementation**: 
  - If confidence ≥90%: Transaction moves to CONFIRMED state (user can review)
  - If confidence < 90%: Transaction enters PENDING_REVIEW state (requires user validation before confirmation)

### 2. Image Compression Strategy
- **Decision**: Compress all images to 60-70% JPEG quality before S3 upload
- **Rationale**: Prioritizes cost-effectiveness over pristine OCR accuracy
- **Implementation**: Client-side compression before upload; Lambda can request original if needed

### 3. Transaction Limits
- **Decision**: No limits on transaction amounts or frequency
- **Rationale**: Supports high-value and high-volume users; trust in input validation instead
- **Constraint**: May require horizontal scaling if single user drives extreme volume

### 4. Transaction Types
- **Decision**: Only DEPOSIT and PAYMENT types supported
- **Rationale**: Keeps data model simple; negative amounts handle refunds naturally
- **No support for**: Refunds (as separate type), Transfers, Adjustments (use PAYMENT with notes)

### 5. System Availability (SLA)
- **Decision**: Best-effort (no specific SLA target)
- **Rationale**: Aligns with serverless architecture; no uptime commitments
- **Implementation**: Leverage AWS native monitoring and alerting, focus on error recovery

---

## Future Enhancements

- Mobile app (React Native/Flutter) for native camera access
- Receipt OCR confidence override by user
- Budget alerts and notifications
- Recurring transaction templates
- Data export (CSV, PDF)
- Multi-currency support
- Social features (shared budgets/categories)
- Machine learning for automatic categorization

