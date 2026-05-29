# Data Model & Entity Design

**Project**: Family Finance Ledger (Billetera Digital)  
**Phase**: Phase 1 (Design & Contracts)  
**Date**: 2025-05-29  
**Owner**: Backend Lead

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────┐
│            USER                         │
├─────────────────────────────────────────┤
│ PK: userId (UUID)                       │
│ - email (unique)                        │
│ - passwordHash                          │
│ - firstName, lastName                   │
│ - tokenVersion (for logout-all)         │
│ - createdAt, updatedAt                  │
│ - status: ACTIVE | SUSPENDED | DELETED  │
└────────┬────────────────────────────────┘
         │
         ├─── (1:N) ───> CATEGORY
         ├─── (1:N) ───> TRANSACTION
         └─── (1:N) ───> REFRESH_TOKEN

┌─────────────────────────────────────────┐
│          CATEGORY                       │
├─────────────────────────────────────────┤
│ PK: userId#categoryId                   │
│ SK: createdAt                           │
│ - name                                  │
│ - color (hex), icon                     │
│ - updatedAt, deletedAt                  │
└────────┬────────────────────────────────┘
         │
         └─── (1:N) ───> TRANSACTION

┌──────────────────────────────────────────┐
│        TRANSACTION                       │
├──────────────────────────────────────────┤
│ PK: userId#transactionId                 │
│ SK: transactionDate                      │
│ - categoryId (FK to Category)            │
│ - amount (DEPOSIT>0, PAYMENT<0)          │
│ - type: DEPOSIT | PAYMENT                │
│ - merchantName, receiptImageUrl          │
│ - status: PENDING|PENDING_REVIEW|CONFIRMED
│ - extractedData (confidence, rawText)    │
│ - createdAt, updatedAt                   │
│ GSI1: userId#transactionMonth            │
│ GSI2: categoryId#transactionDate         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│       REFRESH_TOKEN                      │
├──────────────────────────────────────────┤
│ PK: tokenId (UUID)                       │
│ - userId (GSI1)                          │
│ - hashedToken (bcrypt)                   │
│ - expiresAt (TTL for auto-delete)        │
│ - createdAt, revokedAt (nullable)        │
└──────────────────────────────────────────┘
```

---

## Detailed Entity Definitions

### 1. USER

**Purpose**: Store user account information, authentication credentials, and metadata.

**Schema**:
```json
{
  "userId": "string (UUID)",
  "email": "string (unique, lowercase)",
  "passwordHash": "string (bcrypt, rounds=12)",
  "firstName": "string (max 50 chars)",
  "lastName": "string (max 50 chars)",
  "tokenVersion": "integer (default=0, incremented on logout-all)",
  "status": "string (ACTIVE | SUSPENDED | DELETED)",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Validation Rules**:
- `email`: Must be valid RFC 5322 email format, lowercase stored, unique
- `passwordHash`: Never returned in API responses
- `firstName`, `lastName`: Max 50 chars each, trim whitespace
- `status`: Only ACTIVE users can access the system
- `tokenVersion`: Incremented when user calls logout-all (invalidates old JWT tokens)

**DynamoDB Key Design**:
- Primary Key: `userId` (Partition Key)
- No Sort Key (one record per user)
- Indexes: None (direct lookup by userId sufficient)

**Access Patterns**:
1. `GetUser(userId)` - Fetch user profile
2. `GetUserByEmail(email)` - For login (use GSI if needed, but lookup infrequent)
3. `UpdateUser(userId, updates)` - Update profile

**Lifecycle States**:
```
Registration
    ↓
ACTIVE (default)
    ├─→ SUSPENDED (admin action or security incident)
    └─→ DELETED (user or admin request)
```

**Cost Estimate**: 1 write per registration, 1 read per login, 1 write per profile update
- Typical monthly: ~100 new users + 1000 logins + 100 profile updates = ~1200 operations

---

### 2. CATEGORY

**Purpose**: Store user-defined expense categories (Groceries, Dining, Transport, etc.)

**Schema**:
```json
{
  "categoryId": "string (UUID)",
  "userId": "string (UUID, partition key for multi-tenancy)",
  "name": "string (max 50 chars, required)",
  "color": "string (hex color code, optional, default='#808080')",
  "icon": "string (emoji or icon name, optional, default='📁')",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp",
  "deletedAt": "ISO8601 timestamp (nullable, for soft delete)"
}
```

**Validation Rules**:
- `name`: Required, max 50 chars, trim whitespace, non-empty after trim
- `color`: Optional, must be valid hex code (e.g., '#FF5733')
- `icon`: Optional, max 10 chars (single emoji or icon name)
- `deletedAt`: When set, category is soft-deleted (queries filter out)

**DynamoDB Key Design**:
- Partition Key: `userId#categoryId` (composite, ensures user isolation)
- Sort Key: `createdAt` (enables sorting by creation date)
- Indexes: None for Phase 1 (full scan on user's categories acceptable)

**Access Patterns**:
1. `ListCategories(userId)` - Get all categories for user (sorted by creation date)
2. `GetCategory(userId, categoryId)` - Fetch specific category
3. `CreateCategory(userId, name, color, icon)` - Add new category
4. `UpdateCategory(userId, categoryId, updates)` - Edit category
5. `DeleteCategory(userId, categoryId)` - Soft delete (set deletedAt)

**Lifecycle States**:
```
Create
  ↓
ACTIVE (default, deletedAt = null)
  ↓
DELETED (deletedAt = ISO8601 timestamp)
```

**Cost Estimate**: Average user has 5-10 categories
- Typical monthly per user: 1 create + 2 updates + 10 reads = ~13 operations
- For 100 users: ~1300 operations/month

---

### 3. TRANSACTION

**Purpose**: Store individual expense/income transactions with receipt data and extraction metadata.

**Schema**:
```json
{
  "transactionId": "string (UUID)",
  "userId": "string (UUID, partition key for multi-tenancy)",
  "categoryId": "string (UUID, FK to Category)",
  "amount": "number (positive for DEPOSIT, negative for PAYMENT)",
  "type": "string (DEPOSIT | PAYMENT)",
  "merchantName": "string (extracted from receipt or manual entry)",
  "receiptImageUrl": "string (S3 path, e.g., s3://bucket/userId/2025-05/txnId.jpg)",
  "status": "string (PENDING | PENDING_REVIEW | CONFIRMED)",
  "transactionDate": "ISO8601 date (e.g., 2025-05-15T14:30:00Z)",
  "transactionMonth": "string (YYYY-MM for GSI queries, e.g., 2025-05)",
  "notes": "string (optional, max 200 chars, user can add context)",
  "extractedData": {
    "confidence": "number (0-100, from Comprehend)",
    "rawText": "string (raw OCR output from Comprehend)",
    "reviewNotes": "string (nullable, user review comments if PENDING_REVIEW)"
  },
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

**Validation Rules**:
- `transactionId`: UUID, immutable after creation
- `userId`: Must match authenticated user (prevent cross-user transactions)
- `categoryId`: Must exist and belong to user (foreign key constraint in application)
- `amount`: Non-zero, precision to 2 decimals (cents)
- `type`: Derived from amount sign (DEPOSIT if >0, PAYMENT if <0), immutable
- `status`: Valid state transition: PENDING → PENDING_REVIEW or CONFIRMED (no backward transitions)
- `transactionDate`: Must be ≤ today (no future-dated transactions)
- `merchantName`: Max 100 chars, trim whitespace
- `notes`: Max 200 chars, optional
- `confidence`: ≥90% triggers PENDING_REVIEW or CONFIRMED, <90% requires manual validation

**DynamoDB Key Design**:
- Partition Key: `userId#transactionId` (ensures user isolation)
- Sort Key: `transactionDate` (enables sorting by date)
- GSI1 (for monthly queries):
  - Partition Key: `userId#transactionMonth` (e.g., "user-123#2025-05")
  - Sort Key: `transactionDate`
- GSI2 (for category breakdown):
  - Partition Key: `categoryId`
  - Sort Key: `transactionDate`
  - Projected: `userId`, `amount`, `status` (enable category-level aggregation)

**Access Patterns**:
1. `ListTransactionsForMonth(userId, month)` - Query GSI1 for monthly report
2. `ListTransactionsByCategory(categoryId, month)` - Query GSI2 for category breakdown
3. `GetTransaction(userId, transactionId)` - Fetch specific transaction
4. `CreateTransaction(userId, categoryId, image, date)` - Add new (status=PENDING)
5. `UpdateTransaction(userId, transactionId, updates)` - Confirm or edit
6. `DeleteTransaction(userId, transactionId)` - Soft delete (optional for Phase 1)

**Lifecycle States**:
```
Upload Receipt (S3)
    ↓
Lambda Process (Comprehend)
    ↓
PENDING (awaiting user confirmation)
    ├─→ PENDING_REVIEW (confidence <90%, user must validate)
    └─→ CONFIRMED (user confirms extraction or confidence ≥90%)
```

**Cost Estimate**: Average user creates 1-2 transactions/week = 4-8/month
- Per user monthly: 1 create (Lambda read + write) + 4 reads + 1 update = ~6 operations
- For 100 users: ~600 operations/month

---

### 4. REFRESH_TOKEN

**Purpose**: Store long-lived refresh tokens for JWT token renewal and logout support.

**Schema**:
```json
{
  "tokenId": "string (UUID)",
  "userId": "string (UUID, GSI partition key)",
  "hashedToken": "string (bcrypt hash of token, never return plaintext)",
  "expiresAt": "ISO8601 timestamp (7 days from creation)",
  "createdAt": "ISO8601 timestamp",
  "revokedAt": "ISO8601 timestamp (nullable, for logout marker)"
}
```

**Validation Rules**:
- `tokenId`: UUID, generated at token creation
- `userId`: Must match authenticated user creating token
- `hashedToken`: Bcrypt hashed (rounds=12) before storage, never returned
- `expiresAt`: Must be exactly 7 days from `createdAt`
- `revokedAt`: Only set on logout, indicates token is no longer valid

**DynamoDB Key Design**:
- Partition Key: `tokenId` (enables direct lookup for refresh verification)
- Sort Key: None (one record per token)
- GSI1 (for user logout-all):
  - Partition Key: `userId`
  - Sort Key: `expiresAt`
  - Use for: Delete all tokens for user on logout-all
- TTL: Attribute = `expiresAt` (DynamoDB auto-deletes after 7 days)

**Access Patterns**:
1. `GetRefreshToken(tokenId)` - Verify token exists and fetch userId
2. `CreateRefreshToken(userId)` - Generate new token
3. `RevokeRefreshToken(tokenId)` - Mark as revoked (logout)
4. `DeleteAllRefreshTokens(userId)` - Logout from all devices

**TTL Cleanup**:
- DynamoDB automatically deletes items when `expiresAt` timestamp passes
- No manual cleanup needed
- ~15-minute delay possible before actual deletion (acceptable for security)

**Cost Estimate**: 1 token created per login, 1 token deleted per logout
- Typical monthly per 100 users: ~1000 logins + 500 logouts = ~1500 operations
- Plus ~400 refresh token validations = ~1900 operations/month

---

## Access Pattern Summary Table

| Pattern | Table/GSI | Cost | Frequency |
|---------|-----------|------|-----------|
| Get user profile | USER | 1 RCU | Per request (cached) |
| List categories | CATEGORY (scan) | N RCU | Per session (cached) |
| Get category | CATEGORY | 1 RCU | Per request |
| List monthly transactions | TRANSACTION GSI1 | 30 RCU avg | Weekly (user reports) |
| List by category | TRANSACTION GSI2 | 20 RCU avg | Weekly (analytics) |
| Get transaction | TRANSACTION | 1 RCU | Per request |
| Verify refresh token | REFRESH_TOKEN | 1 RCU | Per token refresh (hourly) |

---

## Validation & Business Logic

### Category Validations
```python
def validate_category(category_data):
    errors = []
    
    # Name validation
    if not category_data.get('name') or not category_data['name'].strip():
        errors.append('Category name is required')
    elif len(category_data['name']) > 50:
        errors.append('Category name must be ≤ 50 characters')
    
    # Color validation (optional)
    if category_data.get('color'):
        if not re.match(r'^#[0-9A-Fa-f]{6}$', category_data['color']):
            errors.append('Color must be valid hex code (e.g., #FF5733)')
    
    return errors
```

### Transaction Validations
```python
def validate_transaction(transaction_data, user_id):
    errors = []
    
    # Amount validation
    if transaction_data['amount'] == 0:
        errors.append('Transaction amount cannot be zero')
    
    # Category ownership check (application-level)
    category = get_category(user_id, transaction_data['categoryId'])
    if not category:
        errors.append('Category not found or does not belong to user')
    
    # Date validation
    tx_date = datetime.fromisoformat(transaction_data['transactionDate'])
    if tx_date.date() > datetime.now().date():
        errors.append('Cannot create transactions for future dates')
    
    # Type validation (derived from amount)
    if transaction_data['amount'] > 0:
        transaction_data['type'] = 'DEPOSIT'
    else:
        transaction_data['type'] = 'PAYMENT'
    
    return errors, transaction_data
```

### Confidence Threshold Logic
```python
def process_comprehend_result(confidence, extracted_data):
    if confidence >= 90:
        # Auto-confirm or mark PENDING_REVIEW (user can override)
        return {
            'status': 'PENDING_REVIEW',  # User must confirm
            'confidence': confidence,
            'extractedData': extracted_data
        }
    else:
        # Require manual validation
        return {
            'status': 'PENDING_REVIEW',
            'confidence': confidence,
            'extractedData': extracted_data,
            'note': 'Low confidence extraction - please review'
        }
```

---

## State Transitions & Business Rules

### Transaction State Machine
```
[PENDING] ──────── (user confirms) ────→ [CONFIRMED]
   │
   └──── (Comprehend confidence <90%) ──→ [PENDING_REVIEW]
              │
              └──── (user confirms) ─→ [CONFIRMED]
              │
              └──── (user rejects) ──→ [PENDING] (re-capture)
```

### Category Deletion Policy
- Soft delete (set `deletedAt` timestamp)
- Transactions remain, but category hidden from UI
- Restore capability via `deletedAt = null` (Phase 2 feature)
- Hard delete (optional): Remove after 90 days auto-archive

---

## Performance & Cost Optimization

### Query Optimization
1. **List categories**: Full scan acceptable (<100 categories per user)
2. **Monthly transactions**: Use GSI1 query (efficient sort key filtering)
3. **Category breakdown**: Use GSI2 with filters (not full scan)
4. **Caching strategy**: Cache categories for 1 hour (static, user-controlled)

### Cost Reduction
- **On-demand billing**: Scales automatically, no provisioning waste
- **TTL cleanup**: Automatic refresh token deletion (no manual cleanup)
- **Projection**: Use sparse indexes (only project necessary attributes)

---

## Migration & Scalability

### Initial Schema
- 1 DynamoDB table per entity type (4 tables total)
- On-demand billing mode
- Point-in-time recovery enabled
- No sharding (until single partition >10k writes/sec)

### Phase 2+ Scaling
- Add read replicas (cross-region) if needed
- Implement partition key sharding if hot partitions detected
- Archive old transactions to S3 (lifecycle policy)

---

## Testing Strategy

### Unit Tests
- Validation function tests (valid/invalid category names, colors, amounts)
- State transition tests (PENDING → CONFIRMED, invalid transitions)
- Cost calculation tests (monthly totals, category breakdowns)

### Integration Tests
- End-to-end transaction flow (upload → Lambda → DynamoDB query)
- Multi-user isolation (user A cannot see user B's transactions)
- Token refresh and expiration (TTL cleanup verification)

### Data Migration Tests
- Seed test data (1000 users, 100 transactions each)
- Query performance benchmarks (monthly queries should complete <100ms)
- Backup/recovery validation (point-in-time recovery works)

---

**Data Model Completion**: 2025-05-29  
**Owner**: Backend Lead  
**Status**: ✅ Ready for Phase 2 (Core Features)
