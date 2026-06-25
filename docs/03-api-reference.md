# API Reference

All endpoints are Next.js Route Handlers under `apps/web/app/api/`. All routes require a valid Supabase session cookie unless noted as public.

Base URL: `https://your-domain.vercel.app/api`

---

## Auth Endpoints

### `POST /api/auth/send-otp`
**Public** — No auth required.

Sends an OTP to the user's phone or email.

**Request body:**
```json
// Phone
{ "type": "phone", "value": "9876543210" }

// Email
{ "type": "email", "value": "user@example.com" }
```

**Behavior:**
- Phone: converts to E.164 (`+91{value}`), calls Supabase `signInWithOtp({ phone })`
- Email: calls `signInWithOtp({ email, shouldCreateUser: true })`

**Response:**
```json
{ "ok": true }
```

**Errors:**
```json
{ "error": "Invalid phone number" }      // 400
{ "error": "Failed to send OTP" }        // 500
```

---

### `POST /api/auth/verify-otp`
**Public** — No auth required.

Verifies the 6-digit OTP and creates a session.

**Request body:**
```json
// Phone
{ "type": "phone", "value": "9876543210", "token": "123456" }

// Email
{ "type": "email", "value": "user@example.com", "token": "123456" }
```

**Behavior:**
- Calls Supabase `verifyOtp()` with appropriate type (`sms` or `email`)
- On success: upserts row in `public.users` via service-role client
- Inserts audit log entry (`action: 'login'`)

**Response:**
```json
{ "ok": true, "redirectTo": "/upload" }
```

**Errors:**
```json
{ "error": "Invalid OTP" }    // 400
{ "error": "OTP expired" }    // 400
```

---

### `POST /api/auth/logout`
**Auth required.**

Signs out the current user, clears session cookies.

**Response:** `302 redirect → /login`

---

## Resume Endpoints

### `POST /api/resume/upload`
**Auth required.**

Step 1 of upload: creates a DB record and returns a presigned upload URL for direct-to-Supabase-Storage upload.

**Request body:**
```json
{
  "filename": "John_Resume.pdf",
  "size": 524288,
  "type": "application/pdf"
}
```

**Behavior:**
1. Validates file type and size (≤ 10 MB)
2. Generates storage path: `{user_id}/{uuid}.{ext}`
3. Inserts `resume_uploads` row with `status: 'pending'`
4. Calls `supabase.storage.from('resumes').createSignedUploadUrl(path)`

**Response:**
```json
{
  "uploadId": "uuid",
  "signedUrl": "https://xxxx.supabase.co/storage/v1/object/upload/sign/resumes/...",
  "token": "...",
  "storagePath": "{user_id}/{uuid}.pdf"
}
```

**Errors:**
```json
{ "error": "Unsupported file type" }    // 400
{ "error": "File too large" }           // 400
{ "error": "Unauthorized" }             // 401
```

---

### `POST /api/resume/upload/complete`
**Auth required.**

Step 2 of upload: confirms the file has been uploaded to storage; updates status to `'uploaded'`.

**Request body:**
```json
{ "uploadId": "uuid" }
```

**Behavior:**
1. Verifies the upload belongs to the current user
2. Updates `resume_uploads.status` from `'pending'` → `'uploaded'`
3. Inserts audit log (`action: 'resume_upload'`)

**Response:**
```json
{ "ok": true }
```

**Errors:**
```json
{ "error": "Upload not found" }    // 404
{ "error": "Unauthorized" }        // 401
```

---

### `GET /api/resume/status/:id`
**Auth required.**

Returns processing status for a specific upload. Used for polling in the upload progress UI.

**Response:**
```json
{
  "id": "uuid",
  "status": "uploaded",
  "progress": 30,
  "error": null,
  "created_at": "2024-01-15T10:30:00Z",
  "processed_at": null
}
```

**Progress mapping:**
| Status | Progress % |
|--------|-----------|
| pending | 10 |
| uploaded | 30 |
| processing | 65 |
| processed | 100 |
| failed | 0 |

---

### `GET /api/resume/download/:id`
**Auth required** (own uploads, or admin).

Generates a short-lived signed URL for downloading the resume file.

**Behavior:**
1. Fetches upload record; verifies ownership OR admin role
2. Creates 5-minute signed download URL via `storage.createSignedUrl()`
3. Inserts audit log (`action: 'resume_download'`)
4. Returns `302 redirect` to the signed URL

**Errors:**
```json
{ "error": "Unauthorized" }       // 401
{ "error": "Resume not found" }   // 404
```

---

## Profile Endpoints

### `GET /api/profile`
**Auth required.**

Returns the complete profile for the current user.

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "Priya Sharma",
    "headline": "Senior Full Stack Engineer",
    "summary": "...",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "linkedin_url": "https://linkedin.com/in/priya",
    "github_url": "https://github.com/priya",
    "portfolio_url": null,
    "salary_exp_min": 2000000,
    "salary_exp_max": 2500000,
    "notice_period_days": 30,
    "availability_status": "open",
    "completion_pct": 75
  },
  "skills": [...],
  "experiences": [...],
  "educations": [...]
}
```

---

### `PATCH /api/profile`
**Auth required.**

Updates profile fields. Empty string URLs are converted to `null`.

**Request body** (all fields optional):
```json
{
  "full_name": "Priya Sharma",
  "headline": "Senior Full Stack Engineer",
  "summary": "10 years experience...",
  "city": "Bangalore",
  "state": "Karnataka",
  "linkedin_url": "https://linkedin.com/in/priya",
  "github_url": "",
  "salary_exp_min": 2000000,
  "salary_exp_max": 2500000,
  "notice_period_days": 30,
  "availability_status": "open"
}
```

**Response:**
```json
{ "profile": { ...updated profile... } }
```

---

### `POST /api/profile/skills`
**Auth required.**

Adds a skill to the current user's profile.

**Request body:**
```json
{
  "skill_name": "React",
  "skill_type": "technical",
  "proficiency": "expert",
  "years_exp": 5
}
```

**Response:**
```json
{ "skill": { "id": "uuid", "skill_name": "React", ... } }
```

---

### `DELETE /api/profile/skills/:id`
**Auth required.**

Deletes a skill. Verifies ownership before deletion.

**Response:**
```json
{ "ok": true }
```

**Errors:**
```json
{ "error": "Skill not found" }    // 404
```

---

## Admin Endpoints

### `GET /api/admin/candidates`
**Admin required** (role = `admin` or `super_admin`).

Lists candidates with pagination and optional status filter.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `50` | Max 100 |
| `status` | — | Filter by upload status |

**Response:**
```json
{
  "candidates": [
    {
      "id": "uuid",
      "original_filename": "resume.pdf",
      "status": "uploaded",
      "created_at": "2024-01-15T10:30:00Z",
      "file_size_bytes": 524288,
      "users": {
        "id": "uuid",
        "email": "priya@example.com",
        "phone": "+919876543210",
        "profiles": {
          "full_name": "Priya Sharma",
          "city": "Bangalore",
          "completion_pct": 75,
          "availability_status": "open"
        }
      }
    }
  ],
  "total": 342,
  "page": 1,
  "limit": 50,
  "totalPages": 7
}
```

---

## Error Format

All errors follow this shape:
```json
{ "error": "Human-readable error message" }
```

## Auth Implementation Notes

- Sessions are stored in HTTP-only cookies managed by `@supabase/ssr`
- Middleware (`middleware.ts`) refreshes expiring sessions on every request
- Service-role client (`createServiceClient()`) is used only server-side for privileged operations
- The `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser
