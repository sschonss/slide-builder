# Sharing Features Design Spec

## Goal

Allow users to share presentations via custom/auto-generated links with optional password protection and expiration. Enable embedding presentations on external websites via iframe.

## Architecture

New `share_links` table stores multiple share links per presentation. Each link has a unique slug (auto-generated or custom), optional bcrypt password hash, and optional expiration. A new public page `/s/[slug]` validates access and renders the viewer. A ShareModal component in the dashboard manages link CRUD.

## Database

### New Table: `share_links`

```sql
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at DATETIME,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
```

- `slug`: Unique identifier in URLs. Auto-generated via nanoid (8 chars) or user-customized.
- `password_hash`: bcrypt hash. NULL = no password required.
- `expires_at`: NULL = never expires. Otherwise, ISO 8601 datetime.
- `is_active`: 1 = active, 0 = disabled by owner. Allows disabling without deleting.
- CASCADE delete: When presentation is deleted, all share links are removed.

### Slug Rules

- 3-50 characters
- Alphanumeric, hyphens, underscores only: `/^[a-zA-Z0-9_-]{3,50}$/`
- Auto-generated slugs use nanoid(8) with URL-safe alphabet
- Custom slugs validated on creation/update, must be globally unique

## API Endpoints

All endpoints under `/api/shares/`. Owner-only for CRUD, public for access.

### 1. `POST /api/shares` — Create Share Link

**Auth:** Required (owner of presentation)

**Request body:**
```json
{
  "presentationId": "pres-123",
  "slug": "my-talk",        // optional, auto-generated if omitted
  "password": "secret123",   // optional, hashed with bcrypt before storage
  "expiresAt": "2026-05-01T00:00:00Z"  // optional, ISO 8601
}
```

**Response (201):**
```json
{
  "id": "share-abc",
  "slug": "my-talk",
  "hasPassword": true,
  "expiresAt": "2026-05-01T00:00:00Z",
  "isActive": true,
  "url": "/s/my-talk",
  "createdAt": "2026-04-27T..."
}
```

**Validation:**
- presentationId must exist and belong to user
- slug must match format and be unique (409 if taken)
- password min 4 chars if provided
- expiresAt must be in the future

### 2. `GET /api/shares?presentationId=X` — List Share Links

**Auth:** Required (owner)

**Response (200):**
```json
[
  {
    "id": "share-abc",
    "slug": "my-talk",
    "hasPassword": true,
    "expiresAt": "2026-05-01T00:00:00Z",
    "isActive": true,
    "url": "/s/my-talk",
    "createdAt": "..."
  }
]
```

Note: Never returns `password_hash` in any response.

### 3. `PUT /api/shares/[id]` — Update Share Link

**Auth:** Required (owner of linked presentation)

**Request body (all fields optional):**
```json
{
  "slug": "new-slug",
  "password": "new-pass",      // set new password
  "removePassword": true,       // remove password (takes precedence over password)
  "expiresAt": "2026-06-01T...",
  "isActive": false
}
```

**Response (200):** Updated share link object.

### 4. `DELETE /api/shares/[id]` — Delete Share Link

**Auth:** Required (owner)

**Response (204):** No content.

### 5. `GET /api/shares/access/[slug]` — Get Share Link Info (Public)

**No auth required.** Used by the `/s/[slug]` page to determine if password is needed.

**Response (200):**
```json
{
  "presentationId": "pres-123",
  "requiresPassword": true,
  "title": "My Presentation"
}
```

**Error responses:**
- 404: Slug not found or link is inactive
- 410: Link has expired

### 6. `POST /api/shares/access/[slug]/verify` — Verify Password (Public)

**No auth required.** Rate-limited to 5 attempts per minute per slug.

**Request body:**
```json
{ "password": "secret123" }
```

**Response (200) on success:**
```json
{
  "presentationId": "pres-123",
  "token": "temp-access-token"
}
```

The token is a signed cookie set via Nitro's `setCookie` with an HMAC signature (`crypto.createHmac('sha256', runtimeConfig.shareSecret)`). Valid for 24 hours. Cookie name: `share_access_${presentationId}`. Subsequent requests to the presentation API check this cookie.

**Response (401) on failure:**
```json
{ "error": "Senha incorreta" }
```

**Rate limiting:** 5 attempts/min per slug using existing RateLimiter class with a per-slug key.

## Pages

### `/s/[slug]` — Share Landing Page

**Behavior flow:**
1. Fetch `GET /api/shares/access/[slug]` to check link status
2. If expired → show "Este link expirou" message
3. If not found → show 404
4. If `requiresPassword` is true → show password form
5. If no password needed OR password verified → redirect to `/present/[presentationId]`

**Password form:**
- Simple centered form with password input and "Acessar" button
- Error message on wrong password
- Loading state while verifying
- Styled consistently with app theme (dark background)

**Embed mode:** When accessed with `?embed=true` query param:
- No redirect — render the presentation inline
- Hide slide counter and navigation buttons
- Set appropriate `X-Frame-Options` headers to allow embedding

## Components

### `ShareModal.vue` — Dashboard Share Modal

**Triggered by:** New "Share" button on each presentation card in the dashboard.

**Structure:**
```
┌─────────────────────────────────────┐
│ Compartilhar: "Presentation Title"  │
│─────────────────────────────────────│
│                                     │
│ [+ Criar novo link]                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /s/my-talk          🔑 📋 🗑️  │ │
│ │ Expira: 01/05/2026  Ativo ✓    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /s/abc12345         📋 🗑️     │ │
│ │ Sem expiração       Ativo ✓    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ── Código Embed ──────────────────  │
│ <iframe src="..."></iframe>  📋    │
│                                     │
│                          [Fechar]   │
└─────────────────────────────────────┘
```

**Features:**
- List existing share links for the presentation
- Create new link with optional slug, password, expiration
- Copy link URL to clipboard (full URL with domain)
- Copy embed code to clipboard
- Toggle active/inactive
- Delete link with confirmation
- Password indicator icon (🔑) for password-protected links
- Expiration date display

**Create link form (inline, expandable):**
- Slug input (placeholder: auto-generated)
- Password input (optional, toggle visibility)
- Expiration date picker (optional)
- "Criar" button

### Dashboard Changes

Add a `Share2` (lucide) icon button to each presentation card, between the visibility toggle and delete button:

```vue
<button class="btn-share" @click.stop="openShareModal(p)" title="Compartilhar">
  <Share2 :size="15" />
</button>
```

## Security

1. **Password hashing:** bcrypt with salt rounds 10. Never store or return plaintext passwords.
2. **Rate limiting on verify:** 5 attempts/min per slug. Uses existing `RateLimiter` class with key `share:${slug}`.
3. **Access token:** After password verification, set a signed cookie `share_access_${presentationId}` valid 24h. The `/api/presentations/[id].get.ts` handler checks this cookie for private presentations accessed via share links.
4. **Embed headers:** For embed mode, set `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *`. Without embed mode, presentations keep default framing policy.
5. **Slug enumeration:** Return 404 for both "not found" and "inactive" slugs to prevent enumeration.

## Presentation Access Flow (Updated)

The existing `[id].get.ts` needs a small update to allow access via share tokens:

```
1. Is owner? → Allow
2. Is public? → Allow
3. Has valid share_access cookie? → Allow
4. Otherwise → 404
```

## Dependencies

- `bcryptjs` — password hashing (pure JS, works on Vercel serverless)
- `nanoid` — slug generation (check if already installed)
- No new frontend dependencies (all UI built with existing lucide icons + Vue)

## File Map

### New Files
| File | Purpose |
|------|---------|
| `server/api/shares/index.post.ts` | Create share link |
| `server/api/shares/index.get.ts` | List share links for presentation |
| `server/api/shares/[id].put.ts` | Update share link |
| `server/api/shares/[id].delete.ts` | Delete share link |
| `server/api/shares/access/[slug].get.ts` | Public: check link status |
| `server/api/shares/access/[slug]/verify.post.ts` | Public: verify password |
| `components/dashboard/ShareModal.vue` | Share management modal |
| `pages/s/[slug].vue` | Public share landing page |

### Modified Files
| File | Change |
|------|--------|
| `tests/helpers/db-helpers.ts` | Add `share_links` table to schema |
| `server/api/presentations/[id].get.ts` | Check share access cookie for private presentations |
| `pages/dashboard.vue` | Add Share button + modal integration |
| `public/openapi.json` | Add share endpoints documentation |

## Out of Scope

- Email/social sharing buttons (just copy URL)
- Analytics/view counts on share links
- Granular permissions (edit access via share links)
- QR code generation for share links
