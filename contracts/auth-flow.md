# JWT Authentication Flow & Security Architecture

## Authentication Flow Diagram

### User Registration & Initial Login

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                        │
└─────────────────────────────────────────────────────────────┘

1. Frontend → Backend
   POST /api/auth/register
   {
     "email": "user@example.com",
     "password": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe"
   }

2. Backend Validation
   - Validate email format (RFC 5322)
   - Validate password complexity (8+ chars, uppercase + digit + special)
   - Check email uniqueness in DynamoDB Users table
   - If validation fails → Return 400 with specific error

3. Backend Processing
   - Hash password using bcrypt (rounds=12)
   - Generate UUID for userId
   - Insert into DynamoDB Users table
   - Generate JWT access token
   - Generate refresh token (opaque string)
   - Hash refresh token with bcrypt (rounds=12)
   - Insert into RefreshTokens table with TTL=7 days

4. Backend → Frontend
   Status: 201 Created
   {
     "userId": "550e8400-e29b-41d4-a716-446655440000",
     "email": "user@example.com",
     "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "token_hash_abcdef123..."
   }

5. Frontend Storage
   - Set httpOnly cookie: accessToken (expires 1 hour)
   - Set httpOnly cookie: refreshToken (expires 7 days)
   - SameSite=Strict for CSRF protection
   - Secure flag (HTTPS only)

6. User Logged In
   ✅ Frontend can now access API endpoints
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ACCESS TOKEN REFRESH (1-hour)                  │
└─────────────────────────────────────────────────────────────┘

Timeline:
- T=0h: User logs in, receives access token + refresh token
- T=1h: Access token expires
- T=1h+5m: User makes API request, gets 401 Unauthorized

1. Frontend Detects Expired Token
   - Axios/Fetch interceptor catches 401 response
   - Check error: "Token expired" or "Invalid token"

2. Frontend → Backend
   POST /api/auth/refresh-token
   Headers: { refreshToken from httpOnly cookie }

3. Backend Validation
   - Extract refresh token from request
   - Look up token in RefreshTokens table (index: tokenId)
   - Verify token exists, not revoked, not expired (< expiresAt)
   - Check if revokedAt is null (not logged out)

4. Backend Generation
   - If valid: Generate new access token (1-hour expiration)
   - Do NOT rotate refresh token (non-rotating for Phase 1)
   - Return new access token

5. Backend → Frontend
   Status: 200 OK
   {
     "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
   }

6. Frontend Update
   - Update accessToken cookie with new value
   - Retry original API request with new token

7. User Continues Using App
   ✅ Seamless token refresh, no logout needed
```

### Logout Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGOUT                              │
└─────────────────────────────────────────────────────────────┘

1. Frontend → Backend
   POST /api/auth/logout
   Headers: { Authorization: "Bearer {accessToken}" }

2. Backend Validation
   - Verify access token is valid (signature, expiration)
   - Extract userId from JWT

3. Backend Processing
   - Query RefreshTokens table: GSI1 userId
   - Find all refresh tokens for user
   - For each token:
     - Set revokedAt = current timestamp
     - (Or delete token, TTL will auto-cleanup after 7 days)

4. Backend → Frontend
   Status: 200 OK
   {
     "success": true,
     "message": "Logged out successfully"
   }

5. Frontend Cleanup
   - Clear accessToken httpOnly cookie
   - Clear refreshToken httpOnly cookie
   - Redirect to login page

6. User Logged Out
   ✅ Refresh tokens invalidated, access tokens become useless after 1 hour
```

### Logout From All Devices Flow

```
┌─────────────────────────────────────────────────────────────┐
│             LOGOUT FROM ALL DEVICES                         │
└─────────────────────────────────────────────────────────────┘

Scenario: User suspects password compromise, wants to logout everywhere

1. Frontend → Backend
   POST /api/auth/logout-all
   Headers: { Authorization: "Bearer {accessToken}" }

2. Backend Processing
   - Extract userId from JWT
   - Increment User.tokenVersion (e.g., 0 → 1)
   - Query RefreshTokens: GSI1 userId, revoke all tokens
   - All old JWT tokens with tokenVersion=0 now invalid

3. Other Devices
   - Any device trying to refresh token with tokenVersion=0 will fail
   - Device forced to re-login with new credentials

4. Result
   ✅ Complete session invalidation across all devices
```

---

## JWT Token Structure

### Access Token Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "tokenVersion": 0,
  "iat": 1716038579,
  "exp": 1716042179,
  "iss": "family-ledger"
}
```

**Claims Explanation**:
- `sub` (Subject): User ID for row-level security (added to all API responses)
- `email`: User email (for context, not used for authorization)
- `tokenVersion`: Version counter (incremented on logout-all, invalidates old tokens)
- `iat` (Issued At): Unix timestamp when token created
- `exp` (Expiration): Unix timestamp when token expires (1 hour from iat)
- `iss` (Issuer): Token origin ("family-ledger")

### Token Signing

**Algorithm**: RSA-256 (RS256)
- **Asymmetric**: Private key signs, public key verifies
- **Private key**: Stored in AWS Secrets Manager
- **Public key**: Cached in frontend (optional for offline verification)
- **Benefit**: Can distribute to multiple microservices without sharing private key

### Refresh Token

**Format**: Opaque string (not a JWT)
- **Example**: `refresh_token_550e8400_hash_...`
- **Storage**: Hashed with bcrypt (rounds=12) in DynamoDB
- **Retrieval**: Never returned again after initial creation
- **Security**: If attacker steals refresh token from database, cannot use it without knowing bcrypt rounds

---

## Security Considerations

### Password Hashing

```python
import bcrypt

# Registration
password = "SecurePass123!"
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
# Store password_hash in database

# Login
stored_hash = get_user_password_hash(email)
is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_hash)
```

**Why bcrypt with 12 rounds?**
- Designed to be slow (computationally expensive)
- Resists brute-force attacks (1 hash takes ~200ms)
- Adaptive to future hardware improvements (can increase rounds)

### Token Storage Security

| Method | Security | Pros | Cons |
|--------|----------|------|------|
| **httpOnly Cookie** (✅ RECOMMENDED) | High | Automatic with requests, secure from XSS | Vulnerable to CSRF (mitigated by SameSite) |
| **LocalStorage** | Low | Simple to implement | Vulnerable to XSS JavaScript injection |
| **SessionStorage** | Low | Cleared on tab close | Vulnerable to XSS, clears on refresh |
| **Memory** | Medium | Not persisted to disk | Lost on page refresh |

**Decision**: httpOnly cookies with SameSite=Strict and Secure flags

### CORS Configuration

```
Allowed Origin: https://family-ledger.herokuapp.com
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization
Expose Headers: X-Total-Count, X-Page-Number
Allow Credentials: true (for cookies)
```

**Why?**
- Prevent cross-site request forgery (CSRF)
- Restrict frontend to known Heroku domain
- SameSite=Strict prevents cookie from being sent cross-site

### Rate Limiting

```
Per User, Per Minute:
- /api/auth/login: 5 requests/min (prevent brute-force)
- /api/auth/register: 3 requests/min (prevent account enumeration)
- /api/auth/refresh-token: 100 requests/min (allow frequent refresh)
- All other endpoints: 10-100 requests/min (depending on operation)
```

**Implementation**: API Gateway throttling + custom Lambda middleware

### Token Revocation

**Access Token**: Cannot be revoked (stateless design)
- **Mitigation**: Short expiration (1 hour) means stolen token has limited window
- **Additional**: tokenVersion check prevents old tokens after logout-all

**Refresh Token**: Can be revoked by setting revokedAt timestamp
- **Check on refresh**: Verify revokedAt is null
- **Automatic cleanup**: TTL attribute deletes after 7 days

---

## Multi-Device Support

### Scenario: User on Phone & Laptop

```
Phone:
- accessToken: abcdef123... (expires at 2:00 PM)
- refreshToken: token123 (expires at 11:59 PM in 7 days)
- tokenVersion: 0

Laptop:
- accessToken: ghijkl456... (expires at 3:00 PM)
- refreshToken: token456 (expires at tomorrow 11:59 PM)
- tokenVersion: 0

Both devices have independent tokens in RefreshTokens table
→ Each device can refresh independently
→ Logout on phone doesn't affect laptop
→ Logout-all invalidates both (via tokenVersion=1)
```

---

## Error Handling

### Invalid Token Scenarios

| Scenario | Error | Status | Action |
|----------|-------|--------|--------|
| Expired access token | 401 Unauthorized | 401 | Retry with refresh token |
| Invalid access token (wrong signature) | 401 Unauthorized | 401 | Force re-login |
| Expired refresh token | 401 Unauthorized | 401 | Force re-login |
| Revoked refresh token (logout) | 401 Unauthorized | 401 | Force re-login |
| Invalid JWT format | 401 Unauthorized | 401 | Force re-login |
| Missing Authorization header | 401 Unauthorized | 401 | Force re-login |

### Frontend Retry Logic

```javascript
// Axios interceptor for automatic token refresh
client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await client.post('/api/auth/refresh-token');
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return client(originalRequest);  // Retry original request
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## Implementation Checklist

### Backend Setup
- [ ] Generate RSA key pair (private/public)
- [ ] Store private key in AWS Secrets Manager
- [ ] Implement JWT token generation (jsonwebtoken library)
- [ ] Implement JWT token verification (verify signature + expiration)
- [ ] Implement bcrypt password hashing (bcrypt library)
- [ ] Implement refresh token flow (store/retrieve/revoke in DynamoDB)
- [ ] Implement logout flow (revoke refresh tokens)
- [ ] Implement logout-all flow (increment tokenVersion)
- [ ] Add rate limiting middleware (API Gateway)
- [ ] Add CORS configuration (Heroku domain)

### Frontend Setup
- [ ] Configure Axios/Fetch with cookie support
- [ ] Implement token refresh interceptor
- [ ] Implement logout cleanup
- [ ] Configure httpOnly cookie options
- [ ] Add error handling for 401 responses
- [ ] Add redirect to login on auth failure

### Security Review
- [ ] Verify passwords never logged or exposed
- [ ] Verify refresh tokens hashed before storage
- [ ] Verify CORS restricted to Heroku domain
- [ ] Verify SameSite=Strict on cookies
- [ ] Verify rate limiting on auth endpoints
- [ ] Verify HTTPS enforcement

---

**Auth Flow Version**: 1.0  
**Last Updated**: 2025-05-29  
**Owner**: Security & Backend Team
