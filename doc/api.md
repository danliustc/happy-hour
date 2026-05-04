# API Reference

Base URL: `https://happyhour.liw88.net`

All authenticated endpoints require a valid `hh_session` cookie.

---

## Auth

### `GET /api/auth/github`

Initiate GitHub OAuth login.

**Response:** 302 redirect to GitHub authorization page.

---

### `GET /api/auth/callback`

GitHub OAuth callback. Exchanges code for access token, fetches user profile, upserts into D1, sets session cookie.

**Query params:**
- `code` (required) -- GitHub authorization code

**Response:** 302 redirect to `/` with `hh_session` cookie set.

---

### `GET /api/auth/logout`

Clear session cookie and redirect to home.

**Response:** 302 redirect to `/` with `hh_session` cookie cleared.

---

## Articles

### `POST /api/articles`

Create a new article. Requires authentication.

**Request body (JSON):**
```json
{
  "title": "Article Title",
  "body_markdown": "# Hello\n\nContent here...",
  "tags": ["javascript", "tutorial"]
}
```

**Response (201):**
```json
{
  "id": 42,
  "slug": "article-title"
}
```

**Side effects:**
- Auto-generates a unique slug from title, adding numeric suffixes when needed
- Renders markdown to sanitized HTML
- Creates tags if they don't exist
- The article's publish date contributes to activity stats while the article exists

**Errors:**
- 401 -- Not authenticated
- 400 -- Invalid JSON, missing title, or missing body

---

### `PUT /api/articles/[id]`

Update an existing article. Requires authentication + ownership.

**Request body (JSON):**
```json
{
  "title": "Updated Title",
  "body_markdown": "Updated content...",
  "tags": ["javascript", "advanced"]
}
```

**Response (200):**
```json
{
  "id": 42,
  "slug": "updated-title"
}
```

**Errors:**
- 401 -- Not authenticated
- 400 -- Invalid article ID, invalid JSON, missing title, or missing body
- 404 -- Article not found

---

### `DELETE /api/articles/[id]`

Delete an article. Requires authentication + ownership.

**Response (204):** Empty body.

**Errors:**
- 401 -- Not authenticated
- 400 -- Invalid article ID
- 404 -- Article not found

---

## Tags

### `GET /api/tags/suggest?q=...`

Tag autocomplete for the editor.

**Query params:**
- `q` (required) -- Search prefix

**Response (200):**
```json
[
  { "name": "JavaScript", "slug": "javascript" },
  { "name": "JSON", "slug": "json" }
]
```

Returns up to 10 matching tags, ordered by name.

---

## Session Format

The `hh_session` cookie contains a JWT-like token:

```
base64url({ userId, exp }).base64url(hmac-sha256(payload, AUTH_SECRET))
```

- `exp` is Unix timestamp, 30 days from creation
- Signed with HMAC-SHA256 using `AUTH_SECRET`
- Cookie is httpOnly, secure, sameSite=lax

GitHub OAuth also uses a short-lived `hh_oauth_state` cookie. The callback must include the same `state` value before the app exchanges the authorization code.
