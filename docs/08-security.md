# Security Architecture

---

## 1. Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Unauthorized data access | High | High | RLS on all tables |
| Resume download by non-owner | High | High | Ownership check in API + RLS |
| OTP brute force | Medium | High | Supabase rate limiting (built-in) |
| Admin privilege escalation | Low | Critical | DB-level role check in middleware + API |
| File upload of malicious content | Medium | Medium | MIME type allow-list, size limit, Supabase scans |
| SQL injection | Low | High | Supabase client (parameterized queries only) |
| XSS | Low | High | React escapes by default, no `dangerouslySetInnerHTML` |
| Service role key exposure | Low | Critical | Key only used server-side, never in client bundle |
| CORS attacks | Low | Medium | Supabase handles CORS for its APIs; Next.js API routes same-origin |

---

## 2. Authentication Security

### OTP-Only (No Passwords)
No passwords to steal, no credential stuffing, no password reset flows.

### Session Management
```
Session storage: HTTP-only cookies (not localStorage)
  → Cannot be accessed by JavaScript
  → Not vulnerable to XSS session theft

Session refresh: Middleware refreshes expiring sessions on every request
  → Users don't get logged out unexpectedly
  → Token rotation happens automatically

Session expiry: Supabase default (1 hour access token, 7-day refresh token)
```

### OTP Rate Limiting
Supabase Auth enforces OTP rate limits:
- Same phone/email: 1 OTP per 60 seconds
- Maximum OTP attempts: 6 before lockout
- OTP validity: 10 minutes

---

## 3. Authorization

### Row Level Security (RLS)

**All 8 tables have RLS enabled.** This is the primary authorization layer.

```sql
-- Even if application code has a bug, RLS prevents cross-user data access
-- Example: candidates can never see each other's data

CREATE POLICY "Users can only read their own data"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (is_admin());
```

### Application-Level Checks

Defense in depth: even with RLS, API routes verify ownership:

```typescript
// /api/resume/download/[id]
const { data: upload } = await supabase
  .from('resume_uploads')
  .select('user_id, storage_path')
  .eq('id', id)
  .single()

// Double-check: user owns this upload OR is admin
if (upload.user_id !== user.id && !isAdmin) {
  return 401
}
```

### Admin Role Verification

Admin status is checked at **three layers**:

1. **Middleware** (`middleware.ts`): blocks non-admins from `/admin/*` routes
2. **Layout** (`(admin)/layout.tsx`): server-side redirect for non-admins
3. **API route** (`/api/admin/*`): role check before any DB query

```typescript
// Three checks ensure no admin page is accessible by non-admins
// even if one layer is bypassed
```

---

## 4. Data Security

### Sensitive Data in Database

| Field | Sensitivity | Protection |
|-------|-------------|-----------|
| phone number | PII | RLS (own row only) |
| email | PII | RLS (own row only) |
| resume file | PII | Private storage bucket + signed URLs |
| salary expectations | Confidential | RLS (own row only) |
| audit logs | Internal | RLS (admins read all, users read own) |

### Resume File Security

```
Storage bucket: private (not public)
  → Files cannot be accessed via direct URL
  → Must go through /api/resume/download/{id} which checks ownership

Signed URLs: 5-minute expiry
  → Even if URL is leaked, it expires quickly
  → Logged in audit_logs every time a download is generated

File path: {user_id}/{uuid}.{ext}
  → user_id prefix in path enforces storage RLS policy
  → No sequential IDs that can be guessed
```

### Service Role Key

```
SUPABASE_SERVICE_ROLE_KEY:
  - Used only in server-side API routes
  - Never referenced in any client-side code
  - Not prefixed with NEXT_PUBLIC_ (therefore never bundled)
  - Bypasses RLS — only used where specifically needed:
    - Creating presigned upload URLs
    - Admin cross-user queries
    - Audit log writes
```

---

## 5. Input Validation

### API Boundaries (Zod Schemas)

Every API route validates input with Zod before touching the database:

```typescript
// /lib/validations/auth.ts
const sendOtpSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('phone'),
    value: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
  }),
  z.object({
    type: z.literal('email'),
    value: z.string().email()
  })
])

// Zod rejects anything that doesn't match before it touches the DB
```

### File Upload Validation

```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB

// Validated client-side (UX) and server-side (security)
```

### SQL Injection Prevention

The Supabase JavaScript client uses parameterized queries internally. No raw SQL is constructed from user input. All queries use the builder pattern:

```typescript
// Safe — parameterized automatically
await supabase.from('users').select('role').eq('id', user.id).single()

// Never done — no string interpolation into SQL
// await supabase.rpc(`SELECT * FROM users WHERE id = '${userId}'`)
```

---

## 6. Transport Security

```
All traffic: HTTPS enforced (Vercel + Supabase both enforce HTTPS)
API calls: TLS 1.2+ (Supabase default)
Cookies: Secure flag (set by @supabase/ssr in production)
```

---

## 7. Audit Logging

All sensitive actions are logged to `audit_logs`:

```typescript
// Logged events:
'login'           → every successful OTP verification
'resume_upload'   → every confirmed upload
'resume_download' → every download (admin or candidate)
'profile_update'  → PATCH /api/profile

// Each log includes:
user_id, action, resource_type, resource_id, ip_address (from headers), created_at
```

**Audit logs are append-only.** No UPDATE or DELETE policy exists on `audit_logs`.

---

## 8. Security Headers (M5 — Recommended)

Add to `next.config.ts` before production launch:

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      "img-src 'self' data: blob: *.supabase.co",
    ].join('; ')
  }
]
```

---

## 9. GDPR / Data Privacy (M5 — Planned)

When operating with EU users or as the platform scales:

```
Right to erasure: DELETE user → CASCADE deletes all data (FK cascades)
Data portability: GET /api/profile/export → JSON of all user data
Consent: Add consent checkbox on first login
Cookie banner: Only strictly necessary cookies used (session only)
Data retention: Audit logs → auto-delete after 2 years (pg_cron job)
```

---

## 10. Security Checklist Before Launch

- [x] RLS enabled on all tables
- [x] Service role key server-side only
- [x] File downloads require ownership check
- [x] All API inputs validated with Zod
- [x] OTP rate limiting (Supabase built-in)
- [x] Audit logging for sensitive actions
- [x] Presigned URLs (5-min expiry) for file access
- [ ] Security headers (add in M5)
- [ ] Rate limiting on API routes (add in M5)
- [ ] Penetration test before public launch
- [ ] GDPR compliance review (add in M5)
