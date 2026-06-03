# StrangerLink

Anonymous real-time chat — connect 1-on-1 with random strangers or join public group rooms. No account needed.

## Features

- **Random Chat** — instant anonymous 1-on-1 chat with strangers
- **Group Rooms** — 6 topic rooms (General, Gaming, Music, Tech, Movies, Sports)
- **Live user count** — real-time online counter
- **Typing indicators** — debounced, per-partner
- **Next / Stop** — skip to next stranger or end chat at any time

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express 5 + Socket.io
- **Monorepo:** pnpm workspaces

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 10+

```bash
npm install -g pnpm@10
```

### Install dependencies

```bash
pnpm install
```

### Run the API server

```bash
pnpm --filter @workspace/api-server run dev
```

Runs at `http://localhost:8080`

### Run the frontend

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/strangerlink run dev
```

Runs at `http://localhost:5173`

---

## Deploy to Render

This repo includes a `render.yaml` for one-click deployment as a single web service (API + frontend bundled together).

### Steps

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render will detect `render.yaml` automatically
4. Click **Apply** — Render builds and deploys everything

**That's it.** Your app will be live at `https://strangerlink.onrender.com` (or your chosen name).

> **Note:** The free Render plan spins down after 15 minutes of inactivity. Upgrade to a paid plan for always-on uptime (required for Socket.io to work reliably at scale).

### Manual Render setup (without render.yaml)

If you prefer to configure manually:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm install -g pnpm@10 && pnpm install --frozen-lockfile && NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/strangerlink run build && pnpm --filter @workspace/api-server run build` |
| Start Command | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Environment Variable | `NODE_ENV=production` |

### Custom domain

After deploying on Render, go to your service → **Settings** → **Custom Domains** and add your domain (e.g. `strangerlink.com`). Point your domain's DNS to Render's CNAME as instructed.

---

## Project Structure

```
artifacts/
  api-server/       # Express + Socket.io backend
  strangerlink/     # React + Vite frontend
lib/
  api-spec/         # OpenAPI spec (source of truth)
  api-client-react/ # Generated React Query hooks
  api-zod/          # Generated Zod schemas
  db/               # Drizzle ORM schema + client
```
