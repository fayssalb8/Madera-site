# Madera Kitchen 🏠

Modern kitchen design & CRM platform for [Madera Kitchen](https://maderakitchen-dz.com) — an Algerian custom kitchen manufacturer.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TailwindCSS 4 |
| Backend API | Cloudflare Pages Functions (TypeScript) |
| Database | Cloudflare D1 (serverless SQLite) |
| File Storage | Cloudflare R2 (S3-compatible) |
| Hosting | Cloudflare Pages (free tier) |

## Features

- 🎨 **Public Website** — Material showcase, portfolio gallery, interactive quote wizard
- 📋 **CRM Dashboard** — Lead management, analytics, notes, status tracking
- 🔐 **Admin Auth** — JWT sessions with optional TOTP 2FA
- 📁 **Media Uploads** — Image/video uploads to Cloudflare R2
- 🔍 **SEO** — Server-rendered meta tags, JSON-LD structured data, dynamic sitemap
- 🌐 **100% Serverless** — No VPS, no cold starts, globally distributed

## Local Development

### Prerequisites

- Node.js >= 20
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as dev dependency)

### Setup

```bash
# Install dependencies
npm install

# Create local secrets file
cp .env.example .dev.vars
# Edit .dev.vars with your admin credentials and session secret

# Run D1 migrations locally
npm run db:migrate:local

# Start development (frontend + Pages Functions)
npm run dev:worker
```

The app will be available at `http://localhost:8788`.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server only (no backend) |
| `npm run dev:worker` | Full-stack dev with Cloudflare Workers |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:prod` | Apply D1 migrations to production |

## Deployment

### 1. Create Cloudflare Resources

```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create madera-db
# Copy the database_id into wrangler.toml

# Create R2 bucket
npx wrangler r2 bucket create madera-media

# Apply database migrations
npm run db:migrate:prod
```

### 2. Set Environment Variables

In the Cloudflare Dashboard → Pages → `madera-kitchen` → Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `ADMIN_EMAIL` | ✅ | Admin login email |
| `ADMIN_PASSWORD` | ✅ | Admin login password (min 16 chars) |
| `SESSION_SECRET` | ✅ | JWT secret (min 32 chars) |
| `APP_ORIGIN` | ✅ | e.g. `https://maderakitchen-dz.com` |
| `TOTP_SECRET` | ❌ | Base32 secret for 2FA |
| `LEAD_NOTIFY_WEBHOOK_URL` | ❌ | Webhook for new lead notifications |

### 3. Deploy

```bash
npm run deploy
```

Or set up automatic deploys via GitHub:
1. Go to Cloudflare Dashboard → Pages → Create project
2. Connect your GitHub repo
3. Set build command: `npm run build`
4. Set build output: `dist`
5. Add environment variables in the Pages settings

### 4. CI/CD (GitHub Actions)

Add these secrets to your GitHub repo (Settings → Secrets):
- `CLOUDFLARE_API_TOKEN` — [Create an API token](https://dash.cloudflare.com/profile/api-tokens)
- `CLOUDFLARE_ACCOUNT_ID` — Found in Cloudflare Dashboard → Overview

## Project Structure

```
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── pages/               # Route pages
│   ├── store/               # Zustand state management
│   ├── lib/                 # Utilities, API client, constants
│   └── types/               # TypeScript types
├── functions/               # Cloudflare Pages Functions (backend)
│   ├── api/                 # API routes
│   │   ├── auth/            # Login, logout, session
│   │   ├── leads/           # Lead CRUD + analytics
│   │   └── catalogue/       # Portfolio & materials
│   ├── uploads/             # R2 file serving
│   ├── auth.ts              # JWT + cookie utilities
│   ├── totp.ts              # TOTP 2FA
│   ├── utils.ts             # Shared validation helpers
│   └── env.ts               # Type definitions
├── migrations/              # D1 SQL migrations
├── public/                  # Static assets
├── wrangler.toml            # Cloudflare configuration
└── package.json
```

## License

Private — All rights reserved.
