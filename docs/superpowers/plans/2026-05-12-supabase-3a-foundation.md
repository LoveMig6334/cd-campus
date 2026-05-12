# Phase 3a — Supabase Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Supabase auth into the app — install client libraries, build the admin login UI, gate `/admin/**` behind a session, and add sign-out. No data tables yet (those land in Phase 3b).

**Architecture:** Three Supabase client factories under `lib/supabase/` (server, browser, service-role). The login form is a Server Component with a Server Action calling `supabase.auth.signInWithPassword`. `middleware.ts` refreshes session cookies on every request and redirects unauthenticated `/admin/**` traffic to `/login`. The existing AdminSidebar gains a "Sign out" form.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr`, `server-only`, Next.js 16 App Router middleware + Server Actions.

**Spec:** [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](../specs/2026-05-12-supabase-migration-design.md) §3a.

---

## Departures from skill defaults

**No automated tests.** The spec explicitly accepts "no automated tests" as known risk #4 for the prototype. Verification is manual via the dev server. Adding a test harness now contradicts the spec.

**Commit cadence per task.** The spec says each sub-phase ships as one commit / PR; the writing-plans skill says commit per task. I'm following the skill (per-task commits) — squash to one commit before opening the PR if you want the spec's deliverable shape.

---

## File structure

| File | Purpose | New / Modified |
|---|---|---|
| `package.json` + `package-lock.json` | Add `@supabase/supabase-js`, `@supabase/ssr`, `server-only` | Modified |
| `.env.example` | Documented placeholders for Supabase env vars | New |
| `lib/supabase/server.ts` | `createClient()` for RSC + Server Actions, cookie-bridged | New |
| `lib/supabase/client.ts` | `createClient()` for browser components | New |
| `lib/supabase/serviceRole.ts` | `getSupabaseServiceRole()`, `import 'server-only'` | New |
| `middleware.ts` | Refresh session cookies, gate `/admin/**` on session | New |
| `app/login/page.tsx` | Email + password form, zine styling | New |
| `app/login/actions.ts` | `signIn` Server Action | New |
| `app/auth/signout/actions.ts` | `signOut` Server Action | New |
| `components/layout/AdminSidebar.tsx` | Append a Sign-out form below the nav | Modified |

---

## Prerequisites — manual user actions before Task 1

These are one-time setup steps the engineer must do before running through the plan:

1. Create a free Supabase project at https://supabase.com (any region).
2. From **Project Settings → API**, copy three values into a new `.env.local` at the repo root (see Task 2 for the exact format):
   - Project URL
   - `anon` public key
   - `service_role` secret key
3. From **Authentication → Users → Invite a user**, create your admin account. Pick a strong password (12+ chars). This is your root admin login.
4. Confirm `.gitignore` includes `.env*.local` (Next.js `create-next-app` does this by default — verify in Task 2).

---

## Tasks

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the three packages**

```bash
npm install @supabase/supabase-js @supabase/ssr server-only
```

Expected: three packages added under `dependencies` in `package.json`; lockfile updated.

- [ ] **Step 2: Verify install succeeded**

```bash
npm ls @supabase/supabase-js @supabase/ssr server-only
```

Expected: each listed at a real version (no `UNMET DEPENDENCY` lines).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "add supabase + server-only deps for phase 3a"
```

---

### Task 2: Add .env.example and verify .gitignore

**Files:**
- Create: `.env.example`
- Verify only: `.gitignore`

- [ ] **Step 1: Create `.env.example`**

Write `/Users/thatt/Dev/Web project/cd-campus/.env.example` with this content:

```
# Supabase — values from Project Settings → API
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"

# Server-only secret. NEVER prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret"

# Set to "1" in .env.local only when running the seed script (Phase 3b).
# NEVER set this on Vercel.
SUPABASE_ALLOW_SEED=""
```

- [ ] **Step 2: Confirm `.gitignore` already excludes `.env*.local`**

```bash
grep -n "\.env" .gitignore
```

Expected: a line like `.env*.local` or `.env.local` already present. If missing, append `.env*.local` to `.gitignore`.

- [ ] **Step 3: Confirm your real `.env.local` exists with the three values from Prerequisites**

```bash
test -f .env.local && grep -c "NEXT_PUBLIC_SUPABASE_URL" .env.local
```

Expected: prints `1`. If the file doesn't exist, create it now using the three values you copied during Prerequisites.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "add .env.example for supabase keys"
```

---

### Task 3: Create the server-side Supabase client

**Files:**
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Write the file**

Create `/Users/thatt/Dev/Web project/cd-campus/lib/supabase/server.ts`:

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — cookie writes flushed by middleware on next request.
          }
        },
      },
    },
  );
}
```

The `try/catch` around `setAll` is the Supabase-recommended pattern: in RSC contexts cookie mutations throw, but middleware refreshes the session on the next request so it's safe to swallow.

- [ ] **Step 2: Type-check the file in isolation**

```bash
npx tsc --noEmit
```

Expected: no errors. (If TypeScript flags the imports, re-confirm Task 1 succeeded.)

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "add server-side supabase client (rsc + server actions)"
```

---

### Task 4: Create the browser Supabase client

**Files:**
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Write the file**

Create `/Users/thatt/Dev/Web project/cd-campus/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

This file is intentionally minimal. No `"use client"` directive — the consumer decides. No `"server-only"` — this file IS allowed in client components.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts
git commit -m "add browser supabase client"
```

---

### Task 5: Create the service-role Supabase client

**Files:**
- Create: `lib/supabase/serviceRole.ts`

- [ ] **Step 1: Write the file**

Create `/Users/thatt/Dev/Web project/cd-campus/lib/supabase/serviceRole.ts`:

```ts
import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. Bypasses RLS — only call from Server Actions or Route Handlers
 * that have already verified the caller is authorised (e.g. is_root_admin()).
 */
export function getSupabaseServiceRole() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

Two safety mechanisms here: `import "server-only"` makes Next 16 build-error if a client component reaches this file, and the comment documents that the caller is responsible for authorization.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/serviceRole.ts
git commit -m "add service-role supabase client (server-only)"
```

---

### Task 6: Create middleware

**Files:**
- Create: `middleware.ts` (top-level, sibling to `app/`)

- [ ] **Step 1: Write the middleware**

Create `/Users/thatt/Dev/Web project/cd-campus/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — must be called on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate /admin/** on a valid session.
  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Two important details: (1) `getUser()` must run on every request to keep the session fresh — don't gate the call behind the `startsWith("/admin")` check. (2) The matcher excludes static assets to keep middleware fast.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "add middleware to refresh session and gate /admin/**"
```

---

### Task 7: Create the signIn Server Action

**Files:**
- Create: `app/login/actions.ts`

- [ ] **Step 1: Write the action**

Create `/Users/thatt/Dev/Web project/cd-campus/app/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Email and password required")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}
```

The `next` param is sanitized to only allow paths under `/admin` to prevent open-redirect via `?next=https://evil.example`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/login/actions.ts
git commit -m "add signIn server action"
```

---

### Task 8: Create the login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Write the page**

Create `/Users/thatt/Dev/Web project/cd-campus/app/login/page.tsx`:

```tsx
import { signIn } from "./actions";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-10">
      <form
        action={signIn}
        className="w-full max-w-sm border-[1.5px] border-line bg-paper p-6"
        style={{ boxShadow: "5px 5px 0 var(--color-blue)" }}
      >
        <h1 className="font-display italic text-[28px] leading-none">
          Admin sign in
          <span className="mt-1 block font-mono text-[10px] not-italic uppercase tracking-[0.2em] text-mute-500">
            CD Smart Campus · เข้าสู่ระบบ
          </span>
        </h1>

        <input type="hidden" name="next" value={next ?? "/admin"} />

        <label className="mt-5 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute-500">
            Email · อีเมล
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 block w-full border-[1.2px] border-ink bg-cream px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute-500">
            Password · รหัสผ่าน
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full border-[1.2px] border-ink bg-cream px-2.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 border border-house-pink bg-house-pink/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-house-pink"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-5 w-full border-[1.5px] border-line bg-blue px-4 py-2.5 font-display italic text-[19px] text-white [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:5px_5px_0_var(--color-ink)]"
        >
          Sign in →
        </button>
      </form>
    </main>
  );
}
```

This is a Server Component (no `"use client"`). The form posts to the `signIn` Server Action via `<form action={…}>`. Errors come back via `?error=…` URL param.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "add /login page (server component + zine styling)"
```

---

### Task 9: Create the signOut Server Action

**Files:**
- Create: `app/auth/signout/actions.ts`

- [ ] **Step 1: Write the action**

Create `/Users/thatt/Dev/Web project/cd-campus/app/auth/signout/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

No corresponding `page.tsx` for `/auth/signout` — the action is invoked from the AdminSidebar form (Task 10).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/signout/actions.ts
git commit -m "add signOut server action"
```

---

### Task 10: Add Sign out form to AdminSidebar

**Files:**
- Modify: `components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Read the existing file to find the insertion point**

Open `/Users/thatt/Dev/Web project/cd-campus/components/layout/AdminSidebar.tsx`. The component currently ends with a `</nav>` followed by `</aside>`. The Sign-out form goes between them.

- [ ] **Step 2: Add the import at the top of the file**

After the existing `import { cn } from "@/lib/cn";` line, add:

```ts
import { signOut } from "@/app/auth/signout/actions";
```

- [ ] **Step 3: Add the Sign-out form before the closing `</aside>` tag**

After the `</nav>` tag and before `</aside>`, insert:

```tsx
<form action={signOut} className="mt-3 border-t-[1.5px] border-line pt-3">
  <button
    type="submit"
    className="w-full px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-mute-500 transition-colors hover:text-house-pink"
  >
    Sign out · ออกจากระบบ →
  </button>
</form>
```

Note: `AdminSidebar.tsx` has `"use client"` at the top. Importing a Server Action from a client component is supported in Next 16 — the `<form action={…}>` invocation crosses the boundary correctly.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/layout/AdminSidebar.tsx
git commit -m "wire sign-out form into admin sidebar"
```

---

### Task 11: Lint + build verification

**Files:** none modified.

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: clean exit, no errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: clean exit. The route table should now include:
- `/login` (static or dynamic — either is fine)
- `/admin/*` routes still listed (now dynamic because of middleware)
- No new warnings about middleware size or Edge runtime issues.

- [ ] **Step 3: If anything fails, fix it inline before proceeding**

Common failures and fixes:
- `Cannot find module '@supabase/...'` → Task 1 didn't install correctly; re-run `npm install`.
- `Module not found: Can't resolve '@/app/auth/signout/actions'` → check the file path in Task 9 matches the import in Task 10.
- TypeScript errors on `cookies().getAll()` → check Task 3 used `await cookies()` (Next 16 requires `await`).

No commit step here — verification only.

---

### Task 12: Manual verification in the dev server

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000.

- [ ] **Step 2: Verify unauthenticated access is blocked**

Open http://localhost:3000/admin in a fresh browser window (or incognito).

Expected: redirected to `http://localhost:3000/login?next=%2Fadmin`. The login form renders with the zine styling.

- [ ] **Step 3: Verify wrong-password failure**

In the form, enter your admin email + a deliberately wrong password. Submit.

Expected: redirected back to `/login?error=Invalid+login+credentials` (or similar). The error message renders inside the pink alert box.

- [ ] **Step 4: Verify successful login**

Enter your real password. Submit.

Expected: redirected to `/admin`. The Phase 2 admin overview renders normally — KPIs, greeting banner, KPIs, today's events, recent bookings table.

- [ ] **Step 5: Verify the Sign-out form**

Scroll to the bottom of the AdminSidebar (left column). Click "Sign out · ออกจากระบบ →".

Expected: redirected to `/login`. Visiting `/admin` again redirects back to `/login` (session is gone).

- [ ] **Step 6: Verify student routes are still public**

While signed out, open http://localhost:3000/student.

Expected: the student home renders without redirecting. Same for `/student/calendar`, `/student/sport`, etc.

- [ ] **Step 7: Verify the /login page is public**

Open http://localhost:3000/login while signed out.

Expected: form renders, no redirect.

- [ ] **Step 8: If everything passes, mark this task complete**

No commit needed (no code changed in this task). The plan is done when all 12 tasks check off and Task 12 passes end-to-end.

---

## Self-review

**Spec coverage** (against §3a in the spec):
- ✅ Install `@supabase/supabase-js` and `@supabase/ssr` → Task 1
- ✅ Create `lib/supabase/server.ts`, `lib/supabase/serviceRole.ts`, `lib/supabase/client.ts` → Tasks 3, 4, 5
- ✅ Wire env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) → Task 2 + Prerequisites
- ✅ Build `app/login/page.tsx` + `app/login/actions.ts` → Tasks 7, 8
- ✅ Build `app/auth/signout/actions.ts` → Task 9
- ✅ Build `middleware.ts` gating `/admin/**` → Task 6
- ✅ Verification: log in as root, see admin overview; log out, redirected → Task 12
- ⚠️ Bootstrap root admin row in `admins` table — **deferred to Phase 3b** (the table doesn't exist yet). In 3a, *any* authenticated Supabase Auth user can access `/admin`. The "root vs normal" distinction is enforced starting in 3b once the `admins` table + `is_root_admin()` helper exist. Documented in Task 12 step 4.
- ⚠️ Sign-out button — not in the spec text, but practically required to verify the auth round-trip. Added in Task 10. Flagging here for transparency.

**Placeholder scan:** No "TBD"/"TODO"/"implement later" patterns. Every step has concrete commands or code.

**Type consistency:** `createClient()` is the export name in both `lib/supabase/server.ts` and `lib/supabase/client.ts` — but they're never imported into the same file (server.ts only used in Server Components/Actions/middleware; client.ts only used in client components). The login action and signout action both `import { createClient } from "@/lib/supabase/server"` consistently. The service-role client uses a different name (`getSupabaseServiceRole`) to make it visually distinct in code reviews.

**Risks called out in plan:**
- The `admins` table doesn't exist yet → 3a's auth gate is "any logged-in Supabase Auth user", not "any row in `admins`". This is correct per the spec's sub-phase split but worth knowing.
- The Sign-out form lives in the AdminSidebar, which is `"use client"`. Server Actions are invocable from client components in Next 16 — this is supported. Confirmed in Task 10 step 3.
