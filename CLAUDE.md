# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Happy Hour is a learning platform where users write and publish markdown articles, build daily streaks, and discover related content. The tagline: *learn anything at anytime in one hour*. Live at `https://happyhour.liw88.net`.

The repo root also contains legacy per-contributor directories (`liwei/`, `czhang/`, `ShiKaiWi/`, etc.) with `.md` notes from before the web app existed. These are historical; the live site uses the D1 database exclusively.

## Development Commands

All commands run from the `site/` directory:

```bash
cd site
npm install        # install dependencies
npm run dev        # start local dev server
npm run build      # production build (outputs to dist/)
npm run preview    # preview production build
```

There are no test files or lint scripts configured.

### Database (Wrangler / D1)

```bash
# Apply a migration to local D1
wrangler d1 execute happy-hour --local --file=./migrations/0001_init.sql

# Run all migrations locally
wrangler d1 execute happy-hour --local --file=./migrations/0001_init.sql
wrangler d1 execute happy-hour --local --file=./migrations/0002_comments.sql
wrangler d1 execute happy-hour --local --file=./migrations/0003_embeddings.sql

# Apply to remote (production)
wrangler d1 execute happy-hour --file=./migrations/<file>.sql
```

### Adding New Contributors (legacy note system)

```bash
# From repo root: initialize a new user directory with symlinks to shared scripts
sh init.sh $USERNAME
cd $USERNAME
./newdaily   # create today's note from tmpl.md
./push       # commit and push notes on a temp branch, rebase onto master
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 (SSR mode, `output: "server"`) |
| Database | Cloudflare D1 (SQLite at edge) |
| Hosting | Cloudflare Pages |
| Auth | GitHub OAuth + HMAC-SHA256 session tokens |
| AI | Cloudflare Workers AI (`@cf/baai/bge-base-en-v1.5` embeddings) |
| Content | Markdown via `marked`, sanitized with `ultrahtml` |

## Architecture

### Request Flow

```
Request → Middleware (middleware.ts)
            └─ reads hh_session cookie → D1 user lookup → Astro.locals.user
         → Page route (pages/*.astro)
            └─ calls lib/db.ts → D1 queries → renders HTML
         → API route (pages/api/**/*.ts)
            └─ validates auth/input → mutates D1 → returns JSON
```

### Key Source Files

- `src/lib/db.ts` — all D1 queries (single source of truth for data access; pass `D1Database` directly, not `locals`)
- `src/lib/auth.ts` — JWT-like session tokens: `base64url(payload).base64url(hmac-sha256(payload, AUTH_SECRET))`
- `src/lib/markdown.ts` — markdown → sanitized HTML pipeline
- `src/lib/ai.ts` — generates BGE embeddings from a user's 10 most recent articles; used for user-to-user recommendations
- `src/lib/types.ts` — all shared TypeScript interfaces
- `src/middleware.ts` — attaches `locals.user` (or `null`) on every request
- `src/lib/parser.ts` + `src/lib/notes.ts` — legacy filesystem note parsers (not used by live site)

### Database Bindings vs Environment Variables

D1 is accessed as `locals.runtime.env.DB` (Cloudflare binding). Use the `getDB(locals)` helper from `lib/db.ts`. Env vars (`AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are accessed the same way via `locals.runtime.env`. The `wrangler.toml` also binds `IMAGES` (R2) and `AI` (Cloudflare AI).

### Auth Flow

1. `GET /api/auth/github` → sets `hh_oauth_state` cookie, redirects to GitHub
2. `GET /api/auth/callback` → validates state, exchanges code, upserts user in D1, sets `hh_session` cookie (30-day, httpOnly, secure, sameSite=lax)
3. Middleware runs on every request to hydrate `Astro.locals.user`

### Article Lifecycle

- Articles have `body_markdown` (raw) and `body_html` (pre-rendered, sanitized) stored in D1
- Slugs are auto-generated from titles with numeric suffixes for conflicts; unique per `(user_id, slug)`
- Tags are auto-created on first use; `setArticleTags` replaces all tags atomically
- Publishing an article creates a check-in for that day (streaks derive from `DISTINCT published_at` dates)
- Deleting an article removes that day from activity history if it was the only article that day

### AI / Embeddings

The `/api/ai/` routes use Cloudflare Workers AI to generate 768-dim embeddings (BGE) from user articles and store them in the `user_embeddings` table. `recommend-users.ts` computes cosine similarity server-side across all stored embeddings. `generate-tags.ts` auto-suggests tags for article content.

### Migrations

SQL migration files are in `site/migrations/` and must be applied manually (no auto-migration):
- `0001_init.sql` — users, tags, articles, article_tags, check_ins
- `0002_comments.sql` — comments
- `0003_embeddings.sql` — user_embeddings

### Deployment

Cloudflare Pages builds from the `site/` root directory with `npm run build`. The `@astrojs/cloudflare` adapter is required for SSR. Environment variables `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `AUTH_SECRET` must be set in Pages settings; `DB`, `IMAGES`, and `AI` are Cloudflare bindings configured in `wrangler.toml`.
