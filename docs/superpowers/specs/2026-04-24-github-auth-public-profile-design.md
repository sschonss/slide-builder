# Slide Builder — GitHub OAuth + Public Profile

## Overview

Add user authentication via GitHub OAuth and public user profiles to the Slide Builder app. Users log in with GitHub, own their presentations (public/private visibility), and have a public profile page listing their public presentations.

## Auth Flow

- **Provider:** GitHub OAuth2, implemented via `nuxt-auth-utils` (Nuxt official module)
- **Session:** Encrypted cookie (`httpOnly`, `secure`) — no external session store needed
- **Login:** `/auth/github` → GitHub authorize → `/auth/github/callback` → session set → redirect `/dashboard`
- **Logout:** `POST /api/auth/logout` → clear session → redirect `/`

## Database Changes

### New table: `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,         -- GitHub user ID (string)
  username TEXT NOT NULL UNIQUE, -- GitHub username (URL slug: /u/{username})
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
```

### Altered table: `presentations`

Add two columns:

```sql
ALTER TABLE presentations ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE presentations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
  CHECK(visibility IN ('public', 'private'));
```

Existing presentations (without `user_id`) are treated as orphaned — they will be assigned to the first user who logs in, or deleted during migration.

## Route Permissions

### Pages (Client)

| Route | Auth Required | Access |
|---|---|---|
| `/` | No | Landing / redirect to `/dashboard` if logged in |
| `/dashboard` | Yes | User's own presentations (replaces current `index.vue`) |
| `/editor/[id]` | Yes | Owner only |
| `/present/[id]` | Conditional | Public: anyone. Private: owner only |
| `/presenter/[id]` | Yes | Owner only |
| `/u/[username]` | No | Public profile — lists user's public presentations |

### API Endpoints

**Public (no auth):**
- `GET /api/health`
- `GET /api/presentations/[id]` — only if visibility='public', or requester is owner
- `GET /api/presentations/[id]/changes` — same as above
- `GET /api/themes`, `GET /api/themes/[id]`
- `GET /api/users/[username]` — public profile data
- `GET /api/users/[username]/presentations` — public presentations list
- `GET /api/auth/session` — current session info

**Protected (auth required, owner only):**
- All presentation mutations (POST, PUT, DELETE)
- All slide mutations
- All asset operations
- Export/import endpoints
- Revert endpoint

### Server Middleware

`server/middleware/auth.ts` — attaches user session to event context. Does NOT block — individual route handlers check ownership.

## Public Profile Page `/u/[username]`

- Displays GitHub avatar (rounded), display name, `@username`
- Grid of public presentations: title, slide count, last updated date
- Click opens `/present/[id]` (viewer mode)
- 404 if username doesn't exist
- No edit capabilities from public profile

## UI Changes

### Navigation / Header
- Login button (when not authenticated) → GitHub OAuth
- User avatar dropdown (when authenticated): Dashboard, Logout

### Dashboard (`/dashboard`)
- Current `index.vue` content moves here
- Filtered to show only current user's presentations
- Each presentation card shows visibility toggle (public/private icon)

### Editor
- Visibility toggle in editor toolbar (public/private)
- Share link shown when presentation is public

## Environment Variables

New env vars needed for GitHub OAuth:
- `NUXT_OAUTH_GITHUB_CLIENT_ID` — GitHub OAuth App Client ID
- `NUXT_OAUTH_GITHUB_CLIENT_SECRET` — GitHub OAuth App Client Secret
- `NUXT_SESSION_PASSWORD` — 32+ char secret for encrypting session cookies

## Security

- Session cookies: `httpOnly`, `secure`, `sameSite: lax`
- All mutation endpoints verify `event.context.user?.id === presentation.user_id`
- No sensitive data in client-side state
- GitHub tokens are NOT stored — only user profile data
