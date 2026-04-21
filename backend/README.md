# TaskFlow Pro Backend

This is the Express + TypeScript backend for TaskFlow Pro. It handles authentication, organization membership, tenant database resolution, projects, tasks, member invites, and realtime chat signaling.

## Backend Features

- Global user and organization models
- Database-per-organization tenant architecture
- JWT auth with cookie-based refresh flow
- Invite-based org joining and role-aware membership records
- Project and task APIs
- Task update endpoint used by the Kanban board and edit dialogs
- Members API for invite and membership management
- Socket.IO server for org chat, presence, and 1:1 call signaling

## Deployment Context

- The backend is designed to work well behind a frontend proxy/BFF when frontend auth relies on cookies.
- Realtime chat and call signaling are exposed through Socket.IO.
- CORS and cookie behavior are environment-driven for deployment flexibility.

## Tech Stack

- Node.js
- Express 5
- TypeScript
- MongoDB + Mongoose
- Socket.IO
- Zod
- bcryptjs
- jsonwebtoken

## Local Setup

```bash
cd backend
npm install
npm run dev
```

Create `.env`:

```env
PORT=5000
MONGO_GLOBAL_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## Project Structure

```text
src/
├── config/         # DB connection helpers
├── controllers/    # Business logic
├── middleware/     # Auth, tenant loading, RBAC
├── models/         # Global and tenant models
├── routes/         # REST endpoints
├── socket/         # Chat store, types, and socket server
├── utils/          # Token/cookie helpers
└── server.ts       # App and HTTP server entry point
```

## Important Concepts

- Global models store shared identity data such as users, organizations, and memberships.
- Tenant models store org-specific work data such as projects and tasks.
- `loadTenantDB` resolves the correct tenant DB for each authenticated request.
- Chat messages are currently in-memory, while projects and tasks are persisted in MongoDB.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
```
