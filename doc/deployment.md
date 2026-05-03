# Deployment Guide

## Overview

The site runs on **Cloudflare Pages** with:
- SSR via `@astrojs/cloudflare` adapter
- D1 database for data storage
- GitHub OAuth for authentication
- Custom domain: `happyhour.liw88.net`

## Cloudflare Pages Setup

### Build Settings

In Cloudflare Dashboard → Pages → Project → Settings → Builds & deployments:

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Root directory | `site` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Deploy command | `:` (no-op) |

**Important:** The root directory must be `site` because `package.json` and `astro.config.mjs` are inside the `site/` subdirectory.

### Environment Variables

In Pages → Settings → Environment variables (apply to Production):

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | From GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App |
| `AUTH_SECRET` | Random string for signing session tokens |

### D1 Database Binding

In Pages → Settings → Functions → D1 database bindings:

| Variable name | D1 database |
|---------------|-------------|
| `DB` | `happy-hour` |

### Custom Domain

In Pages → Custom domains → Set up a custom domain:
- Add `happyhour.liw88.net`
- Cloudflare will auto-configure DNS if the domain is already on Cloudflare

**Important:** If you previously had a Worker with the same domain, delete the Worker's route first. Worker routes take priority over Pages custom domains.

## GitHub OAuth App Setup

1. Go to https://github.com/settings/developers → New OAuth App
2. Settings:
   - **Application name:** Happy Hour
   - **Homepage URL:** `https://happyhour.liw88.net`
   - **Authorization callback URL:** `https://happyhour.liw88.net/api/auth/callback`
3. Copy the Client ID and Client Secret to Cloudflare Pages environment variables

## D1 Database Setup

### Create Tables

Run the migration SQL via D1 REST API or Wrangler:

```bash
# Via Wrangler (if authenticated)
cd site
wrangler d1 execute happy-hour --file=./migrations/0001_init.sql

# Via REST API (alternative)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"sql": "<contents of 0001_init.sql>"}'
```

### Verify Tables

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"sql": "SELECT name FROM sqlite_master WHERE type='\''table'\''"}'
```

Should return: `users`, `tags`, `articles`, `article_tags`, `check_ins`

## Data Migration (from filesystem notes)

If migrating existing markdown files into D1:

```bash
cd site
npx tsx src/scripts/migrate.ts > migration_data.sql
# Review the SQL, then execute via D1 API
```

**Note:** The migration script generates INSERT statements for users, articles, and check-ins. It does NOT generate tags -- users should add tags to their articles via the web editor after migration.

## Local Development

```bash
cd site
npm install
npm run dev
```

Local dev uses `wrangler.toml` for D1 binding. You may need to run `wrangler d1 execute` to set up local D1 tables.

## Common Issues

### "Hello world" instead of the site

A Worker with the same domain/route is intercepting requests. Delete the Worker or remove its route for `happyhour.liw88.net`.

### Build shows `output: "static"` instead of `output: "server"`

The Cloudflare adapter isn't loading. Check that Root directory is set to `site` in Pages build settings, and that `@astrojs/cloudflare` is in `package.json` dependencies.

### `cd site` fails in build command

Set Root directory to `site` in Pages settings instead of using `cd site` in the build command.

### D1 binding error ("Invalid binding `SESSION`")

The `@astrojs/cloudflare` adapter wants a KV namespace for sessions. This warning can be ignored if you're using cookie-based sessions (which this project does). The `SESSION` KV binding is optional.

### OAuth callback fails

Check that the GitHub OAuth App's callback URL matches exactly: `https://happyhour.liw88.net/api/auth/callback`
