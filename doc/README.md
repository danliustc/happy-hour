# Happy Hour - Developer Documentation

## What is Happy Hour?

A learning platform for programmers. Users write markdown articles, tag them by topic, and discover related content. The core idea: **learn anything at anytime in one hour** -- consistency matters more than what you learn.

**Live site:** https://happyhour.liw88.net

## Quick Start

```bash
cd site
npm install
npm run dev        # local dev server
npm run build      # production build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 (SSR mode) |
| Database | Cloudflare D1 (SQLite at edge) |
| Hosting | Cloudflare Pages |
| Auth | GitHub OAuth (HMAC-SHA256 session tokens) |
| Content | Markdown via `marked` |
| Style | Dark theme, monospace fonts, GitHub-inspired |

## Project Structure

```
happy-hour/
├── doc/                    # This documentation
├── site/                   # Astro application
│   ├── astro.config.mjs    # Astro config (SSR + Cloudflare adapter)
│   ├── wrangler.toml       # Cloudflare Worker/D1 config
│   ├── package.json        # Dependencies
│   ├── migrations/         # D1 SQL migrations
│   ├── public/             # Static assets (favicon)
│   └── src/
│       ├── components/     # Astro UI components
│       ├── layouts/        # Page layouts (Base, NoteLayout)
│       ├── lib/            # Core logic (db, auth, markdown, types)
│       ├── middleware.ts    # Auth middleware (reads session cookie)
│       ├── pages/          # Routes (SSR pages + API endpoints)
│       ├── scripts/        # One-time scripts (data migration)
│       └── styles/         # Global CSS
├── liwei/                  # User learning notes (legacy, pre-database)
├── czhang/                 # "
├── xiaojingzhao/           # "
└── ...                     # Other contributors' note directories
```

## Key Concepts

### Two Data Paths

The project has two data sources:

1. **D1 database** (production) -- used by the live site. Users, articles, tags, and check-ins are stored in D1 tables.
2. **Filesystem** (legacy) -- the original model where each contributor has a directory of `.md` files. The migration script (`src/scripts/migrate.ts`) converted these into D1.

### How Articles Work

- Users write articles via the web editor (`/editor`)
- Articles are stored as markdown in D1 (`body_markdown`) with pre-rendered HTML (`body_html`)
- Each article can have multiple tags
- Tags are auto-created on first use, with autocomplete from `/api/tags/suggest`
- Publishing an article automatically creates a daily check-in record

### How Recommendations Work

When viewing an article, the system finds other articles that share the most tags:

```sql
SELECT a.*, COUNT(at.tag_id) as shared_tags
FROM articles a
JOIN article_tags at ON at.article_id = a.id
WHERE at.tag_id IN (current_article_tag_ids) AND a.id != current_id
GROUP BY a.id
ORDER BY shared_tags DESC, a.published_at DESC
LIMIT 5
```

### How Auth Works

1. User clicks "Sign in with GitHub" -> `/api/auth/github`
2. Redirected to GitHub OAuth authorization page
3. GitHub calls back `/api/auth/callback` -> exchange code for token -> fetch user profile -> upsert into D1
4. A signed JWT cookie (`hh_session`) is set (HMAC-SHA256, 30-day expiry)
5. Middleware reads the cookie on every request and attaches `user` to `Astro.locals`

### How Streaks Work

Each article publish automatically creates a `check_ins` record for that day. Streaks are computed by counting consecutive days with check-in records. The homepage shows a leaderboard sorted by current streak.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `AUTH_SECRET` | Secret key for signing session JWTs |
| `DB` | D1 database binding (set via `wrangler.toml`, not env vars) |

## Further Reading

- [Architecture Details](./architecture.md) -- database schema, routes, components
- [Deployment Guide](./deployment.md) -- how to deploy to Cloudflare Pages
- [API Reference](./api.md) -- all API endpoints
