# HealthPrevent Backend

Backend API for the HealthPrevent preventive healthcare platform.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Install additional security dependencies:
   ```
   npm run install-deps
   ```
   
   This will install:
   - express-mongo-sanitize
   - helmet
   - xss-clean
   - express-rate-limit
   - hpp
   - colors

3. Create a `.env` file in the root directory (you can copy from `.env.example`):
   ```
   cp .env.example .env
   ```
   
   Then edit the `.env` file with your specific configuration.

4. Run the development server:
   ```
   npm run dev
   ```
   
   Or for production:
   ```
   npm start
   ```

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/updateprofile` - Update user profile (Protected)
- `PUT /api/auth/updatepassword` - Update password (Protected)
- `GET /api/auth/logout` - Logout user (Protected)

### Health Metrics
- `GET /api/metrics` - Get all user metrics (Protected)
- `GET /api/metrics/:id` - Get specific metric (Protected)
- `POST /api/metrics` - Create a new metric (Protected)
- `PUT /api/metrics/:id` - Update metric (Protected)
- `DELETE /api/metrics/:id` - Delete metric (Protected)

### Symptoms
- `GET /api/symptoms` - Get all symptoms (Protected)
- `GET /api/symptoms/:id` - Get specific symptom (Protected)
- `POST /api/symptoms` - Create a symptom (Protected)
- `PUT /api/symptoms/:id` - Update symptom (Protected)
- `DELETE /api/symptoms/:id` - Delete symptom (Protected)

### Journal
- `GET /api/journal` - Get all journal entries (Protected)
- `GET /api/journal/:id` - Get specific journal entry (Protected)
- `POST /api/journal` - Create a journal entry (Protected)
- `PUT /api/journal/:id` - Update journal entry (Protected)
- `DELETE /api/journal/:id` - Delete journal entry (Protected)

### Goals
- `GET /api/goals` - Get all goals (Protected)
- `GET /api/goals/:id` - Get specific goal (Protected)
- `POST /api/goals` - Create a goal (Protected)
- `PUT /api/goals/:id` - Update goal (Protected)
- `DELETE /api/goals/:id` - Delete goal (Protected)

## Database Models

The application uses MongoDB with the following main models:
- User
- HealthMetric
- Symptom
- JournalEntry
- Goal
