# Opensquad — Project Instructions

This project uses **Opensquad**, a multi-agent orchestration framework.

## Quick Start

Type `/opensquad` to open the main menu, or use any of these commands:
- `/opensquad create` — Create a new squad
- `/opensquad run <name>` — Run a squad
- `/opensquad help` — See all commands
- `/roteiro` — Pipeline completo de roteiro YouTube (tema → documento final)

## Directory Structure

- `_opensquad/` — Opensquad core files (do not modify manually)
- `_opensquad/_memory/` — Persistent memory (company context, preferences)
- `squads/` — User-created squads
- `squads/{name}/_investigations/` — Sherlock content investigations (profile analyses)
- `squads/{name}/output/` — Generated content and files
- `_opensquad/_browser_profile/` — Persistent browser sessions (login cookies, localStorage)

## How It Works

1. The `/opensquad` skill is the entry point for all interactions
2. The **Architect** agent creates and modifies squads
3. During squad creation, the **Sherlock** investigator can analyze reference profiles (Instagram, YouTube, Twitter/X, LinkedIn) to extract real content patterns
4. The **Pipeline Runner** executes squads automatically
5. Agents communicate via persona switching (inline) or subagents (background)
6. Checkpoints pause execution for user input/approval

## Rules

- Always use `/opensquad` commands to interact with the system
- Do not manually edit files in `_opensquad/core/` unless you know what you're doing
- Squad YAML files can be edited manually if needed, but prefer using `/opensquad edit`
- Company context in `_opensquad/_memory/company.md` is loaded for every squad run

## Content Hub (Deployment & API)

The Content Hub is a React + Express app in `content-hub/` that manages all content, analytics, competitors, and fichas.

- **Production URL:** `https://hub.brunosallesphd.com.br`
- **API base:** `https://hub.brunosallesphd.com.br/api/`
- **Local dev:** `http://localhost:3001` (run `npm run dev` inside `content-hub/`)
- **Deploy:** Automatic via Railway — just `git push origin master` and Railway rebuilds from `content-hub/Dockerfile`
- **Auth:** Basic Auth in production (configured via `AUTH_USERS` env var on Railway)
- **Database:** Supabase (Postgres) — project `vdaualgktroizsttbrfh`
- **Cloudflare Worker:** proxies `hub.brunosallesphd.com.br` to the Railway service

### How to deploy changes to the Content Hub

1. Make your changes in `content-hub/`
2. Build: `cd content-hub && npx vite build`
3. Commit: `git add content-hub/... && git commit -m "..."`
4. Push: `git push origin master`
5. Railway auto-deploys in ~2-3 minutes

### Key API routes

- `GET /api/competitors/registry` — list all competitors
- `GET /api/competitors/feed` — aggregated content feed
- `GET /api/competitors/{id}/profile` — aggregated profile from fichas
- `GET /api/competitors/fichas/{competitorId}/{videoId}` — individual ficha
- `POST /api/competitors/weekly-sync` — trigger full sync (Make.com calls this weekly)

## Site brunosallesphd.com.br (Cloudflare Pages)

The main product site is hosted on **Cloudflare Pages** (NOT Railway, NOT WordPress).

- **Project name:** `mapa-7p` (Cloudflare Pages)
- **Domain:** `brunosallesphd.com.br`
- **Pages.dev:** `mapa-7p.pages.dev`
- **Hosting:** Static files on Cloudflare Pages (HTML/CSS/JS, no backend)
- **Deploy method:** `npx wrangler pages deploy <folder> --project-name=mapa-7p --branch=main`

### Site structure

| Route | Content | Source |
|-------|---------|--------|
| `/` | Homepage (Dr. Bruno Salles) | Static HTML |
| `/mapa-7p/` | MAPA-7P landing page | React app (Vite build) |
| `/upsell-2as/` | Upsell 2AS page | Static HTML |

### How to deploy changes

**USE THE SCRIPT:** `bash _deploy/deploy-brunosallesphd.sh`

The script automatically: builds MAPA-7P React app, verifies all pages exist, checks for placeholder text, and deploys.

**⚠️ CRITICAL — READ BEFORE DEPLOYING:**
- **NEVER deploy a single HTML file** to this project. Every deploy REPLACES the entire site.
- **ALWAYS use the script** or deploy from `_deploy/brunosallesphd.com.br/` which contains ALL pages.
- **NEVER deploy files from `squads/infoprodutos/mapa/landing-page/`** — those are source/drafts, NOT production files. The `_obsoleto/` subfolder there contains broken drafts with placeholders.
- The correct production files are ONLY in `_deploy/brunosallesphd.com.br/`.

### Manual deploy (if script fails)

```bash
cd _deploy/brunosallesphd.com.br
npx wrangler pages deploy . --project-name=mapa-7p --branch=main
```

### Rebuilding MAPA-7P React app

Source: `squads/infoprodutos/mapa/landing-page/mapa-7p-landing-page-codigo/LP-MAPA-7P/Kimi_Agent_MAPA-7P Landing Page/app/`

```bash
# Copy to clean path (original path has spaces that break npm)
cp -r ".../app/{src,package.json,vite.config.ts,index.html,...}" /tmp/mapa7p-build/
cd /tmp/mapa7p-build && npm install && NODE_ENV=production npx vite build
# Output: dist/ → copy to _deploy/brunosallesphd.com.br/mapa-7p/
```

### Other Cloudflare Pages project

- **`brunosallesphd-home`** — separate project at `brunosallesphd-home.pages.dev` (no custom domain attached)

### Completely separate (NOT affected by Pages deploys)

- **`hub.brunosallesphd.com.br`** — Railway (Content Hub). Different server, different project.

## Browser Sessions

Opensquad uses a persistent Playwright browser profile to keep you logged into social media platforms.
- Sessions are stored in `_opensquad/_browser_profile/` (gitignored, private to you)
- First time accessing a platform, you'll log in manually once
- Subsequent runs will reuse your saved session
- **Important:** The native Claude Code Playwright plugin must be disabled. Opensquad uses its own `@playwright/mcp` server configured in `.mcp.json`.
