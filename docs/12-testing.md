# Testing Strategy

---

## 1. Testing Philosophy

**Priority order:**
1. **TypeScript** — catches type errors at compile time (already enforced, strict mode)
2. **Integration tests** — test real API routes against a real Supabase test project
3. **E2E tests** — test critical user flows in a real browser
4. **Unit tests** — only for pure utility functions (not mocked DB calls)

**What we deliberately avoid:**
- Mocking the database in unit tests (masks real schema/query bugs)
- Testing implementation details (test behavior, not internal code)
- 100% coverage as a goal (diminishing returns past ~70%)

---

## 2. Current Testing State (M1)

M1 has no automated tests. The project validates correctness via:
- **TypeScript strict mode** (`tsc --noEmit`) — zero errors
- **`next build`** — catches SSR/RSC errors, missing exports, invalid routes
- **Manual testing** — checklist in deployment guide

This is sufficient for M1. Add tests starting from M2 when the codebase stabilizes.

---

## 3. Unit Tests (Pure Functions)

**Tools:** Vitest + TypeScript

**What to test:**
```typescript
// lib/utils.ts — these have no external dependencies
describe('toE164Phone', () => {
  it('converts 10-digit to +91 format', () => {
    expect(toE164Phone('9876543210')).toBe('+919876543210')
  })
  it('leaves +91 prefix untouched', () => {
    expect(toE164Phone('+919876543210')).toBe('+919876543210')
  })
})

describe('validateResumeFile', () => {
  it('rejects files over 10MB', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    expect(validateResumeFile(file).valid).toBe(false)
  })
  it('accepts valid PDF', () => {
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    expect(validateResumeFile(file).valid).toBe(true)
  })
})

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })
})
```

**Setup:**
```bash
pnpm add -D vitest @vitest/coverage-v8
# vitest.config.ts in apps/web
```

---

## 4. Integration Tests (API Routes)

**Tools:** Vitest + Supertest (or just `fetch` in tests) + dedicated Supabase test project

**Strategy:** Run against a real Supabase test project. Create a test user before each test suite, clean up after.

```typescript
// tests/integration/auth.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const BASE_URL = process.env.TEST_APP_URL ?? 'http://localhost:3000'

describe('POST /api/auth/send-otp', () => {
  it('rejects invalid phone number', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'phone', value: '12345' }) // invalid
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('rejects invalid email', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', value: 'not-an-email' })
    })
    expect(res.status).toBe(400)
  })

  it('accepts valid email', async () => {
    // Note: This sends a real email to the test Supabase project
    // Use a test-specific email from Supabase inbucket (local) or Mailinator
    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', value: 'test@test.com' })
    })
    expect(res.status).toBe(200)
  })
})
```

**Test database setup:**
```typescript
// tests/setup.ts
import { createClient } from '@supabase/supabase-js'

const svc = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SERVICE_ROLE_KEY!
)

export async function createTestUser() {
  const { data } = await svc.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    email_confirm: true
  })
  return data.user!
}

export async function deleteTestUser(userId: string) {
  await svc.auth.admin.deleteUser(userId)
  // Cascade deletes all public.* rows
}
```

---

## 5. E2E Tests (Critical Flows)

**Tools:** Playwright

**Install:**
```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

**Critical flows to test:**

### Flow 1: New candidate uploads resume in < 60 seconds

```typescript
// tests/e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test'

test('candidate uploads resume in under 60 seconds', async ({ page }) => {
  const start = Date.now()

  // Step 1: Login via email OTP
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Email' }).click()
  await page.fill('[type="email"]', 'test@playwright-test.com')
  await page.click('[type="submit"]')

  // Step 2: Enter OTP (requires Supabase test project with email OTP)
  await page.waitForURL('/verify-otp**')
  // ... enter OTP digits

  // Step 3: Upload a file
  await page.waitForURL('/upload')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('./tests/fixtures/sample-resume.pdf')

  // Step 4: Wait for success
  await expect(page.getByText('Resume uploaded successfully')).toBeVisible({
    timeout: 30000
  })

  // Step 5: Redirected to profile
  await page.waitForURL('/profile')

  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThan(60000)  // Must be < 60 seconds
})
```

### Flow 2: Admin can view candidates

```typescript
test('admin can view candidate list', async ({ page }) => {
  // Log in as admin user
  // (pre-created in test setup)
  await page.goto('/admin/dashboard')
  await expect(page.getByText('Total Candidates')).toBeVisible()
  await expect(page.getByText('Recent Uploads')).toBeVisible()
})
```

### Flow 3: Profile completion updates

```typescript
test('profile completion score updates after adding skills', async ({ page }) => {
  // Start logged in as test candidate
  await page.goto('/profile')
  const initialScore = await page.getByText(/%/).textContent()

  // Add a skill
  await page.click('text=+ Add Skill')
  await page.fill('[placeholder="Skill name..."]', 'React')
  await page.click('text=Add')

  // Score should increase
  await expect(page.getByText(/%/)).not.toHaveText(initialScore!)
})
```

**Playwright config:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.TEST_APP_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 14'] } }
  ]
})
```

---

## 6. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: cd apps/web && npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: typecheck
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      NEXT_PUBLIC_APP_URL: https://example.com
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: cd apps/web && npx next build

  # Add when tests exist:
  # unit-tests:
  #   runs-on: ubuntu-latest
  #   steps:
  #     - run: cd apps/web && npx vitest run

  # e2e:
  #   runs-on: ubuntu-latest
  #   needs: build
  #   steps:
  #     - run: npx playwright test
```

---

## 7. Test Fixtures

```
tests/
├── fixtures/
│   ├── sample-resume.pdf          ← 1-page PDF for upload tests
│   ├── large-resume.pdf           ← 9.9 MB PDF (near limit)
│   └── oversized-resume.pdf       ← 11 MB (should be rejected)
├── integration/
│   ├── auth.test.ts
│   ├── upload.test.ts
│   └── profile.test.ts
├── e2e/
│   ├── upload-flow.spec.ts
│   ├── admin-view.spec.ts
│   └── profile-edit.spec.ts
└── setup.ts                       ← test user creation/cleanup
```

---

## 8. What NOT to Test

| Item | Why |
|------|-----|
| Supabase Auth internals | Supabase team tests this |
| Next.js routing | Framework responsibility |
| Tailwind CSS rendering | Visual regression tools (Storybook) if needed |
| React component re-renders | Avoid testing implementation details |
| Zod schema edge cases | Trust Zod's own tests |

---

## 9. Testing Roadmap

| Milestone | Testing to Add |
|-----------|---------------|
| M1 (current) | TypeScript + manual checklist |
| M2 | Unit tests for AI parsing utilities |
| M3 | Integration tests for search API + accuracy benchmarks |
| M4 | E2E tests for critical candidate and admin flows |
| M5 | Load testing (k6) + security testing (OWASP ZAP scan) |
