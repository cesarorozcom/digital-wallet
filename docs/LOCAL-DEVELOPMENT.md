# Local Development Setup

This guide explains how to set up and run the Billetera Digital application locally.

## Prerequisites

- Node.js 18+ and npm
- AWS Account with DynamoDB tables created (see `docs/AWS-SETUP.md`)
- AWS CLI configured with credentials
- Git

## Project Structure

```
.
├── src/
│   ├── backend/          # Express API server
│   ├── frontend/         # React web application
│   └── shared/           # Shared utilities (future)
├── docs/                 # Documentation
├── contracts/            # API contracts
├── data-model.md         # DynamoDB schema
├── plan.md              # Implementation roadmap
├── package.json         # Root package with workspace config
└── .gitignore
```

## Backend Setup

### 1. Install Dependencies

```bash
cd src/backend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials and configuration:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_from_iam_user
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# JWT Configuration (generate a strong random string for production)
JWT_SECRET=your-random-secret-key-at-least-32-chars-long

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# DynamoDB Table Names
USERS_TABLE=users
TRANSACTIONS_TABLE=transactions
CATEGORIES_TABLE=categories
REFRESH_TOKENS_TABLE=refreshTokens
```

### 3. Start Backend Server

```bash
npm run dev
```

You should see:
```
✅ Server running on http://localhost:3000
🏥 Health check: http://localhost:3000/health
📝 Auth endpoints: http://localhost:3000/api/auth/{register,login,logout,refresh-token}
```

Test health endpoint:
```bash
curl http://localhost:3000/health
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd src/frontend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_TOKEN_STORAGE=localStorage
REACT_APP_ENABLE_OFFLINE_MODE=false
```

### 3. Start Frontend Server

```bash
npm start
```

This opens http://localhost:3000 in your browser (note: backend already uses 3000, so React DevServer will use 3001).

## Running Both Servers

### Option 1: Separate Terminals

Terminal 1 - Backend:
```bash
cd src/backend && npm run dev
```

Terminal 2 - Frontend:
```bash
cd src/frontend && npm start
```

### Option 2: From Root (requires npm-run-all)

```bash
npm install --save-dev npm-run-all  # if not already installed
npm run dev
```

This runs both in parallel. Press `Ctrl+C` to stop.

## Testing the Application

### 1. Register a New User

Navigate to http://localhost:3001/register

Fill in:
- First Name: Juan
- Last Name: Pérez
- Email: juan@example.com
- Password: MyPassword123! (must contain uppercase, digit, special char)
- Confirm Password: MyPassword123!

Click "Registrarse" (Register)

### 2. Login

Navigate to http://localhost:3001/login

Use the credentials from registration:
- Email: juan@example.com
- Password: MyPassword123!

### 3. Verify API Endpoints

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login (use tokens from register response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Refresh Token (requires refreshTokenId from login)
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshTokenId": "your_refresh_token_id"
  }'

# Protected Endpoint (requires accessToken)
curl http://localhost:3000/api/protected-example \
  -H "Authorization: Bearer your_access_token"

# Logout (requires accessToken)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer your_access_token"
```

## Available Scripts

### Backend

```bash
npm run dev        # Start with ts-node (development)
npm run build      # Compile TypeScript
npm start          # Run compiled JavaScript
npm run type-check # Check types without building
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Frontend

```bash
npm start          # Start React dev server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App (irreversible!)
```

## Troubleshooting

### Backend Won't Start

**Error: `ECONNREFUSED` when connecting to DynamoDB**
- Ensure AWS credentials are set in `.env`
- Verify DynamoDB tables exist: `aws dynamodb list-tables`
- Check AWS region matches (default: us-east-1)

**Error: `JWT_SECRET not set`**
- Ensure `.env` file has `JWT_SECRET` configured

**Error: Port 3000 already in use**
- Change PORT in `.env` or kill the process: `lsof -i :3000`

### Frontend Won't Connect to Backend

**Error: `CORS` errors in console**
- Check `CORS_ORIGIN` in backend `.env` matches frontend URL
- For localhost: set to `http://localhost:3001`

**Error: `Cannot POST /api/auth/register`**
- Verify backend is running
- Check `REACT_APP_API_URL` in frontend `.env.local`

### DynamoDB Connection Issues

**Error: `User: arn:aws:iam::... is not authorized`**
- Verify IAM user has DynamoDB permissions
- Check table names match in `.env`

**Error: Table doesn't exist**
- Create tables using AWS-SETUP.md instructions
- Verify table names in `USERS_TABLE`, `TRANSACTIONS_TABLE`, etc.

## Database Local Development (Optional)

For offline development without AWS:

### Option 1: DynamoDB Local (Docker)

```bash
# Start DynamoDB local
docker run -d -p 8000:8000 amazon/dynamodb-local

# Create tables pointing to localhost
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name users \
  ...
```

### Option 2: Use Moto (Python)

```bash
# Install moto
pip install moto[dynamodb]

# Mock DynamoDB in tests
```

## Debugging

### Enable Verbose Logging

```bash
# Backend
DEBUG=express:* npm run dev

# Frontend
REACT_APP_LOG_LEVEL=debug npm start
```

### Browser DevTools

- Open Chrome DevTools: F12
- Network tab: Monitor API calls
- Console: Check for errors
- Application tab: View localStorage tokens

### Backend Logs

```bash
# Check recent logs
tail -f ~/.aws/logs/...

# Or use CloudWatch
aws logs tail /billetera/backend --follow
```

## Next Steps

After verifying local setup works:

1. Implement Phase 1 transaction endpoints (T1.9)
2. Build category management UI (T1.10)
3. Implement receipt upload flow (T2.1)
4. Set up Lambda receipt processor (T2.3)
5. Deploy to Heroku (see HEROKU-SETUP.md)

## References

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
