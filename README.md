# TaskFlow Pro

TaskFlow Pro is a full-stack multi-tenant task management SaaS built with Next.js, Express, TypeScript, and MongoDB. It supports organization-based data isolation, invite-driven team onboarding, project and task management, and a realtime team chat and calling workspace.

## Live Demo

- App: [taskflow-pro-zddy.vercel.app](https://taskflow-pro-zddy.vercel.app/)

## What It Does

- Multi-tenant architecture with one MongoDB database per organization
- JWT auth with cookies and refresh-token flow
- Invite-based organization membership with roles: `OWNER`, `ADMIN`, `MEMBER`
- Project and task management with status, priority, due dates, and drag-and-drop task updates
- Shared dashboard shell with responsive layout and collapsible sidebar
- Realtime organization chat with presence, 1:1 audio/video calling, and call notifications
- Frontend state management with Zustand + TanStack Query

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Sonner |
| Backend | Express 5, TypeScript, Socket.IO |
| Database | MongoDB + Mongoose |
| Auth | JWT, refresh tokens, cookies |
| State | Zustand, TanStack Query |
| Validation | Zod |

## Project Structure

```text
taskflow-pro/
├── backend/     # Express API, auth, tenancy, members, Socket.IO
├── frontend/    # Next.js app, dashboard UI, chat widget, task board
├── postman/     # API collection and environment
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Backend `.env` example:

```env
PORT=5000
MONGO_GLOBAL_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

Frontend `.env.local` example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run the app

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000`

## Main Product Areas

- Auth: register, login, refresh, logout, current-user session fetch
- Organizations: workspace creation, invite-based joining, role-aware membership records
- Projects: create and browse org-specific projects
- Tasks: create, edit, move between board columns, and filter by project
- Team: invite members by email and view accepted/pending members
- Chat: org-scoped messaging, online presence, and 1:1 audio/video calls

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a workspace or join via invite |
| POST | `/api/auth/login` | Login and attach pending invite memberships |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear auth cookies |
| GET | `/api/auth/me` | Return current user and organization |
| GET/POST | `/api/projects` | List or create projects |
| GET/POST | `/api/tasks` | List or create tasks |
| PATCH | `/api/tasks/:id` | Update task fields including status |
| GET | `/api/members` | List members and invites |
| POST | `/api/members/invite` | Invite a teammate |

## Deployment Notes

- The current deployed setup uses a Vercel frontend with API requests proxied to the backend so auth can continue using cookies safely.
- If frontend and backend are deployed on different public domains, cookie-based auth and frontend middleware need extra care.
- Best long-term production setup is either a shared parent domain such as `app.example.com` and `api.example.com`, or a frontend proxy/BFF.
- Chat history is currently in-memory, so messages reset when the backend restarts.

## Verification

Current verified checks:

- `frontend`: `npm run lint`
- `backend`: `npm run build`

## Next Improvements

- Persist chat messages in MongoDB
- Add organization switching for multi-org users
- Add richer task and project management actions
- Harden live calling with TURN support if needed

Built by Sujit Pandey.
