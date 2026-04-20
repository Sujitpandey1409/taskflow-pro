# TaskFlow Pro Frontend

This is the Next.js frontend for TaskFlow Pro. It provides the authenticated dashboard experience for projects, tasks, team management, settings, and the floating organization chat/calling widget.

## Frontend Features

- Next.js App Router dashboard with shared responsive shell
- Collapsible desktop sidebar and mobile sheet navigation
- Organization-aware auth session handling
- Project list and project detail views
- Task board with drag-and-drop status changes
- Reusable create/edit task dialogs
- Team page for invites and membership visibility
- Floating realtime chat with presence, toasts, and 1:1 audio/video calls
- Responsive layout tuned for desktop and mobile use

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- Sonner
- Socket.IO client

## Local Setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Then open `http://localhost:3000`.

## Main App Areas

```text
src/app/
├── (auth)/             # Login and register pages
├── dashboard/          # Dashboard, projects, tasks, team, settings
└── providers.tsx       # Query client, toaster, auth bootstrap

src/components/
├── chat/               # Floating chat widget and boundary
├── dashboard/          # Header, sidebar, dashboard home
├── projects/           # Project UI pieces
├── tasks/              # Task dialogs and task form fields
└── ui/                 # Shared UI primitives
```

## Notes

- Query keys are scoped by organization so cached data does not bleed across workspaces.
- The dashboard shell is shared across authenticated routes.
- Chat and call UI is org-scoped, but chat persistence is not implemented yet.
- For production deployments with separate frontend/backend domains, auth may need a proxy or shared parent domain strategy.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```
