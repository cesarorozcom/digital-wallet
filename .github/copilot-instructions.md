<!-- SPECKIT START -->
## Project Context & Design References

For comprehensive context about technologies, project structure, design decisions, and implementation roadmap, refer to:

### Core Documentation
- **spec.md** - Feature specification with user stories, requirements, data model, API design
- **plan.md** - Implementation plan with phases, research findings, and critical path
- **research.md** - Phase 0 findings on image compression, Lambda patterns, DynamoDB design, JWT security, Heroku deployment

### Design Artifacts
- **data-model.md** - DynamoDB schema, entity relationships, access patterns, validation rules, lifecycle states
- **contracts/** - API contracts and technical specifications:
  - `api-auth-endpoints.json` - Authentication endpoints (register, login, logout, refresh)
  - `api-transaction-endpoints.json` - Transaction management (create, list, update, delete)
  - `lambda-receipt-processor.json` - AWS Lambda receipt processing pipeline with Comprehend integration
  - `auth-flow.md` - JWT token flow, security considerations, error handling, multi-device support
  - `deployment-config.md` - Heroku deployment, CI/CD pipeline, database setup, monitoring

### Key Technical Decisions
- **Frontend**: React + TailwindCSS on Heroku (mobile-first, responsive)
- **Backend**: Node.js + Express with AWS Lambda + API Gateway (serverless)
- **Database**: DynamoDB (multi-tenant, ACID, on-demand billing) with S3 for receipts
- **Authentication**: Stateless JWT (1-hour access, 7-day refresh tokens with TTL)
- **OCR**: Amazon Comprehend with ≥90% confidence threshold, Lambda event-driven processing
- **Image Compression**: Client-side (60-70% JPEG quality) for cost-efficiency
- **Logging**: CloudWatch with 7-day TTL

### Architecture Overview
```
Frontend (Heroku)
  ↓ HTTPS + JWT Auth
API Gateway (REST)
  ↓
Lambda Functions (Auth, Categories, Transactions)
  ↓ Event-driven (S3 → Lambda → Comprehend)
DynamoDB (Multi-tenant, ACID)
S3 (Receipts, encrypted at rest)
CloudWatch (Logs, metrics, alarms)
```

### Development Phases
1. **Phase 1 (Weeks 1-2)**: Foundation - Auth, DynamoDB setup, Heroku config
2. **Phase 2 (Weeks 3-4)**: Core features - Categories, transactions, receipt upload
3. **Phase 3 (Weeks 5-6)**: Advanced - Analytics, monthly reports, user profiles
4. **Phase 4 (Weeks 7-8)**: Refinement - Testing, security hardening, production deployment

### For Implementation
- Start with data-model.md (understand schema before coding)
- Reference contracts/ for exact API signatures and error codes
- Follow deployment-config.md for Heroku + AWS setup
- Consult auth-flow.md for JWT implementation details
- See plan.md for dependencies and parallelizable work streams

<!-- SPECKIT END -->
