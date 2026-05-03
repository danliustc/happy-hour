# Architecture

## Database Schema (D1)

5 tables defined in `migrations/0001_init.sql`:

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| github_id | INTEGER UNIQUE | GitHub user ID |
| username | TEXT UNIQUE NOT NULL | GitHub username |
| display_name | TEXT | |
| avatar_url | TEXT | |
| bio | TEXT DEFAULT '' | |
| created_at | TEXT | datetime('now') |

### `tags`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT UNIQUE NOT NULL | Display name |
| slug | TEXT UNIQUE NOT NULL | URL-safe slug |

### `articles`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER NOT NULL | FK -> users(id) |
| title | TEXT NOT NULL | |
| slug | TEXT NOT NULL | UNIQUE(user_id, slug) |
| body_markdown | TEXT NOT NULL | Raw markdown |
| body_html | TEXT NOT NULL | Pre-rendered HTML |
| published_at | TEXT | datetime('now') |
| updated_at | TEXT | datetime('now') |

### `article_tags`
| Column | Type | Notes |
|--------|------|-------|
| article_id | INTEGER NOT NULL | FK -> articles(id) ON DELETE CASCADE |
| tag_id | INTEGER NOT NULL | FK -> tags(id) ON DELETE CASCADE |
| PRIMARY KEY | (article_id, tag_id) | |

### `check_ins`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER NOT NULL | FK -> users(id) |
| date | TEXT NOT NULL | UNIQUE(user_id, date) |

### Indexes
- `articles(user_id)` -- user's articles
- `articles(published_at DESC)` -- recent articles
- `article_tags(tag_id)` -- articles by tag
- `check_ins(user_id, date)` -- streak lookup

## Page Routes

All SSR (server-rendered on every request).

| Route | File | Auth | Description |
|-------|------|------|-------------|
| `/` | `pages/index.astro` | No | Homepage: stats, tag cloud, leaderboard, recent articles |
| `/about` | `pages/about.astro` | No | About page |
| `/tags` | `pages/tags/index.astro` | No | All tags |
| `/tags/[slug]` | `pages/tags/[slug].astro` | No | Articles filtered by tag |
| `/[user]` | `pages/[user]/index.astro` | No | User profile, stats, streak chart |
| `/[user]/[slug]` | `pages/[user]/[slug].astro` | No | Article detail + recommendations |
| `/editor` | `pages/editor/index.astro` | Yes | New article editor |
| `/editor/[id]` | `pages/editor/[id].astro` | Yes | Edit existing article |

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/github` | No | Initiate GitHub OAuth |
| GET | `/api/auth/callback` | No | OAuth callback, sets session |
| GET | `/api/auth/logout` | No | Clears session cookie |
| POST | `/api/articles` | Yes | Create article |
| PUT | `/api/articles/[id]` | Yes | Update article (owner only) |
| DELETE | `/api/articles/[id]` | Yes | Delete article (owner only) |
| GET | `/api/tags/suggest?q=` | No | Tag autocomplete |

## Components

| Component | Purpose |
|-----------|---------|
| `Header.astro` | Nav bar with auth UI |
| `Footer.astro` | Site footer |
| `NoteCard.astro` | Article preview card (used in grids) |
| `MarkdownEditor.astro` | Full editor with write/preview, tag input, publish |
| `TagBadge.astro` | Single tag pill (links to `/tags/[slug]`) |
| `TagCloud.astro` | Flex-wrap container of TagBadges |
| `Leaderboard.astro` | User ranking table by streak |
| `StreakChart.astro` | GitHub-style contribution heatmap |
| `Recommendations.astro` | "Related Articles" grid |

## Lib Modules

| Module | Purpose |
|--------|---------|
| `db.ts` | All D1 queries (users, tags, articles, stats, recommendations) |
| `auth.ts` | JWT session management (HMAC-SHA256) |
| `types.ts` | TypeScript interfaces |
| `markdown.ts` | Markdown-to-HTML via `marked` |
| `parser.ts` | Legacy filesystem note parser |
| `notes.ts` | Legacy filesystem note loader |

## Data Flow

```
Request
  │
  ├─ Middleware: read hh_session cookie → lookup user in D1 → attach to locals
  │
  ├─ Page Route: query D1 via lib/db.ts → render Astro component → HTML response
  │
  └─ API Route: validate auth → mutate D1 → return JSON response
```

## Legacy Filesystem Path

The repo root contains user directories (`liwei/`, `czhang/`, etc.) with `.md` files in a custom frontmatter format (`- key: value` lines). The files `lib/parser.ts` and `lib/notes.ts` can parse these, but the live site uses D1 exclusively. The migration script (`scripts/migrate.ts`) was used to import these files into D1.
