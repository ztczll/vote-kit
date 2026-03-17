# Vote-Kit Backend

Backend API for Vote-Kit platform built with Koa, TypeScript, MySQL, and Redis.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. Run database migrations:
```bash
npm run migrate:latest
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Requirements
- `GET /api/requirements` - List requirements (supports ?status=, ?limit=, ?offset=)
- `GET /api/requirements/:id` - Get requirement details
- `POST /api/requirements` - Create requirement (auth required)
- `POST /api/requirements/:id/approve` - Approve requirement (admin only)
- `POST /api/requirements/:id/reject` - Reject requirement (admin only)

### Votes
- `POST /api/votes` - Vote for requirement (auth required)
- `GET /api/votes/limit` - Check remaining votes (auth required)

### Comments
- `GET /api/comments/requirement/:requirementId` - Get comments for requirement
- `POST /api/comments` - Create comment (auth required)

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Database Migrations

Create new migration:
```bash
npm run migrate:make migration_name
```

Run migrations:
```bash
npm run migrate:latest
```

Rollback migrations:
```bash
npm run migrate:rollback
```

## Project Structure

```
src/
├── config/          # Configuration files (database, redis, logger)
├── database/        # Database migrations and connection
├── middleware/      # Koa middleware (auth, error handling)
├── routes/          # API route handlers
├── services/        # Business logic services
├── types/           # TypeScript type definitions
└── __tests__/       # Property-based and unit tests
```

## Environment Variables

See `.env.example` for required environment variables.
