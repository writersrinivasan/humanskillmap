# UI Wireframes

All screens shown in ASCII. Actual implementation uses Tailwind CSS + shadcn/ui + Framer Motion.

---

## 1. Login Page (`/login`)

```
┌────────────────────────────────────────┐
│              [T] TalentVault           │
│        Connecting talent with          │
│        the right opportunities         │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  [ Phone Number ]  [ Email ]     │  │ ← Tabs with slide animation
│  │  ─────────────────────────────   │  │
│  │                                  │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ +91  │  Enter mobile number │ │  │ ← Phone tab
│  │  └─────────────────────────────┘ │  │
│  │                                  │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │   Send OTP              [→] │ │  │ ← Primary button (indigo)
│  │  └─────────────────────────────┘ │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│     By continuing, you agree to our   │
│         Terms · Privacy Policy         │
└────────────────────────────────────────┘
```

**Behavior:**
- Default tab: Phone
- +91 prefix is fixed, non-editable
- 10-digit validation with real-time feedback
- On submit: POST `/api/auth/send-otp` → redirect to `/verify-otp`

---

## 2. Verify OTP Page (`/verify-otp`)

```
┌────────────────────────────────────────┐
│              [T] TalentVault           │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      Enter verification code     │  │
│  │  Sent to +91 XXXXXX7890          │  │ ← Masked phone/email
│  │                                  │  │
│  │   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │  │ ← 6 individual input boxes
│  │   │3 │ │_ │ │_ │ │_ │ │_ │ │_ │ │  │   auto-advance on digit
│  │   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │  │
│  │                                  │  │
│  │      Auto-submits when complete  │  │
│  │                                  │  │
│  │  Didn't receive it?              │  │
│  │  Resend OTP (in 0:42)           │  │ ← Countdown timer
│  │                                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘

States:
  [Loading spinner]  → verifying OTP
  [Red border + error message] → invalid OTP
  [Green flash] → success → redirect
```

---

## 3. Upload Page (`/upload`) — Idle State

```
┌──────────────────────────────────────────────────┐
│  [T] TalentVault   Upload · Profile ·  Sign out  │ ← Top nav
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │         ┌─────────────────────┐           │  │
│  │         │                     │           │  │
│  │         │      ↑              │           │  │
│  │         │  Drag & drop your   │           │  │
│  │         │     resume here     │           │  │
│  │         │                     │           │  │
│  │         │  PDF, DOC, DOCX     │           │  │
│  │         │  Up to 10 MB        │           │  │
│  │         └─────────────────────┘           │  │
│  │                                            │  │
│  │            ── or ──                        │  │
│  │                                            │  │
│  │         [ Choose File ]                    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘

Drag Active State: border turns indigo, background lightens, slight scale-up
Drag Reject State: border turns red, shows "Only PDF/DOC accepted"
```

---

## 4. Upload Page — Uploading State

```
┌──────────────────────────────────────────────────┐
│  [T] TalentVault   Upload · Profile ·  Sign out  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  📄 John_Resume_2024.pdf           [✕]     │  │
│  │                                            │  │
│  │  Uploading...                              │  │
│  │  ████████████████░░░░░░░░░░░░░░░░  58%    │  │ ← Animated progress bar
│  │                                            │  │
│  │  Phase labels:                             │  │
│  │  ✓ Validating → ✓ Requesting →            │  │
│  │  → Uploading  →   Processing              │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘

Phase → label mapping:
  requesting  → "Preparing upload..."
  uploading   → "Uploading... {n}%"
  confirming  → "Saving..."
  done        → "Done!"
```

---

## 5. Upload Page — Success State

```
┌──────────────────────────────────────────────────┐
│  [T] TalentVault   Upload · Profile ·  Sign out  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │              ✅                            │  │
│  │                                            │  │
│  │       Resume uploaded successfully!        │  │
│  │                                            │  │
│  │    Redirecting to your profile in 2s...    │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 6. Profile Page (`/profile`)

```
┌──────────────────────────────────────────────────┐
│  [T] TalentVault   Upload · Profile ·  Sign out  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  [JS]                                       │ │ ← Avatar with completion ring
│  │       Priya Sharma                          │ │
│  │       Senior Full Stack Engineer            │ │ ← headline
│  │       📍 Bangalore, Karnataka               │ │
│  │       [🟢 Open to Work]                     │ │ ← availability badge
│  │                                             │ │
│  │  [LinkedIn] [GitHub]                        │ │
│  │                                             │ │
│  │  75% complete  [Complete Profile →]         │ │ ← only shows if < 80%
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  📄 Resume                                  │ │
│  │  ─────────────────────────────────────────  │ │
│  │  [🟡 Processing]  Uploaded 2 hours ago      │ │ ← status badge
│  │  [ Download ]  [ Replace ]                  │ │
│  │  John_Resume_2024.pdf                       │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Skills                                     │ │
│  │  ─────────────────────────────────────────  │ │
│  │  [React ×] [TypeScript ×] [Node.js ×]       │ │ ← chips, ×=delete on hover
│  │  [PostgreSQL ×] [+ Add Skill]               │ │
│  │                                             │ │
│  │  Inline form (when + clicked):              │ │
│  │  [Skill name...] [Select level ▼] [Add]    │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Work Experience                            │ │
│  │  ─────────────────────────────────────────  │ │
│  │  ●─ Acme Corp · Senior Engineer  [Current] │ │ ← timeline dot
│  │  │   Mar 2022 – Present                     │ │
│  │  │   [React] [TypeScript] [AWS]             │ │
│  │  │                                          │ │
│  │  ●─ StartupXYZ · Full Stack Dev             │ │
│  │  │   Jan 2019 – Feb 2022                    │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Education                                  │ │
│  │  ─────────────────────────────────────────  │ │
│  │  🎓 IIT Madras · B.Tech Computer Science    │ │
│  │     2015 – 2019                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 7. Profile Completion Ring (SVG Component)

```
        ┌───────────────────────────┐
        │        [  JS  ]           │
        │      ╭─────────╮          │
        │    ╱           ╲         │
        │   │    avatar   │         │
        │    ╲           ╱         │
        │      ╰─────────╯          │
        │         75%               │ ← percentage label
        └───────────────────────────┘

Ring colors:
  ≥ 80%: emerald (green)
  ≥ 50%: indigo (blue/purple)
  < 50%: amber (yellow/orange)

Animation: Framer Motion strokeDashoffset from 0 → (100-pct)%
```

---

## 8. Profile Edit Page (`/profile/edit`)

```
┌──────────────────────────────────────────────────┐
│  [T] TalentVault   Upload · Profile ·  Sign out  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ← Back to Profile                              │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Basic Info                                 │ │
│  │  Full name:  [Priya Sharma              ]   │ │
│  │  Headline:   [Senior Full Stack Engineer ]   │ │
│  │  Summary:    [                           ]   │ │
│  │              [                           ]   │ │ ← textarea
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Location                                   │ │
│  │  City:  [Bangalore        ]                 │ │
│  │  State: [Karnataka        ]                 │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Job Preferences                            │ │
│  │  Status:  [Open to Work ▼]                  │ │ ← select
│  │  Notice:  [30           ] days              │ │
│  │  Salary:  [₹20L] – [₹25L]                  │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Social Links                               │ │
│  │  LinkedIn:  [https://linkedin.com/in/priya] │ │
│  │  GitHub:    [https://github.com/priya     ] │ │
│  │  Portfolio: [                             ] │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  [ Save Changes ]      [ Cancel ]               │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 9. Admin Dashboard (`/admin/dashboard`)

```
┌──────────────────────────────────────────────────────────────┐
│ [T]              TalentVault Admin                           │
├──────────────┬───────────────────────────────────────────────┤
│ 📊 Dashboard │                                               │
│ 👥 Candidates│  Dashboard                                    │
│ 🔍 Search    │  Overview of all candidate activity           │
│              │                                               │
│              │  ┌────────────┐ ┌────────────┐               │
│              │  │ 342        │ │ 298        │               │
│              │  │ Total      │ │ Resumes    │               │
│              │  │ Candidates │ │ Uploaded   │               │
│              │  └────────────┘ └────────────┘               │
│              │  ┌────────────┐ ┌────────────┐               │
│              │  │ 256        │ │ 42         │               │
│              │  │ Successfully│ │ Pending    │               │
│              │  │ Stored     │ │ Processing │               │
│              │  └────────────┘ └────────────┘               │
│              │                                               │
│              │  Recent Uploads                               │
│              │  ─────────────────────────────────────────   │
│              │  Avatar Name/Email    Location Status  Date  │
│              │  [PS]  Priya Sharma  Bangalore [●Proc] 2h    │
│              │  [JD]  john@...     Chennai   [●Uplod] 5h    │
│              │  [AR]  Amit Raj     Mumbai    [●Pend]  1d    │
│              │  ...                                          │
├──────────────┤                                               │
│  Sign out    │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

---

## 10. Color System

```
Primary (indigo):   #4f46e5  →  buttons, links, ring, active states
Success (emerald):  #10b981  →  "processed" status, completion ≥80%
Warning (amber):    #f59e0b  →  "pending" status, completion <50%
Info (blue):        #3b82f6  →  "uploaded" status
Muted:              #6b7280  →  secondary text, labels
Background:         #f8fafc  →  page background
Card:               #ffffff  →  card surfaces
Border:             #e2e8f0  →  dividers, input borders
```

---

## 11. Responsive Breakpoints

```
Mobile (< 768px):
  - Single column layout
  - Admin sidebar hidden → top header nav
  - Profile cards stacked
  - CandidateTable: hides Location and Uploaded Date columns

Tablet (768px–1024px):
  - Two-column stat grid
  - Location column visible in table

Desktop (> 1024px):
  - Admin: sidebar visible (256px fixed left)
  - Four-column stat grid
  - All table columns visible
  - Main content max-width: 1152px centered
```
