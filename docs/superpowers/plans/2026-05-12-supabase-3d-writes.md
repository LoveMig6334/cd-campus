# Phase 3d — Supabase Writes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the prototype's interactive surfaces (Carelin form, P'share studio, scoreboard edit, calendar Add Event, root-only admin management) to real Supabase Server Actions. After 3d every action in the spec's minimum write set works end-to-end and survives a page refresh.

**Architecture:** Hand-rolled validation, no Zod / `react-hook-form`. Server Actions live next to the page that owns them (`app/.../actions.ts`). All actions return `ActionResult = { ok: true } | { ok: false; error: string }` (or `redirect()` on success). Auth is enforced inside the action via two helpers — `requireAdmin()` and `requireRootAdmin()` — both delegate to RLS-helpful security-definer SQL functions. After each successful write the action calls `revalidatePath(...)` on the pages whose reads depend on the entity. Forms use the native `<form action={fn}>` shape; the Carelin student form additionally uses `useActionState` for inline error display per spec.

**Tech Stack:** Next.js 16 App Router (Server Components default, Server Actions co-located), React 19 (`useActionState`), `@supabase/ssr` server client + `@supabase/supabase-js` service-role client (already in `lib/supabase/`), generated `Database` types.

**Spec:** [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](../specs/2026-05-12-supabase-migration-design.md) §3d.

---

## Departures from skill defaults

**No automated tests.** Same rationale as 3a / 3b / 3c. Verification per task is `npm run lint && npm run build`; final verification is the spec's exit-criteria walkthrough (manual page exercise — post a Carelin request, reply as admin, edit a score, etc.).

**Commit cadence per task.** Each task ends with a single commit on `main`. Tasks deliberately scope to one logical surface so the diff stays reviewable.

**No caching.** Phase 3 stays uncached; the Supabase server client reads `cookies()`, which marks every consuming route as dynamic automatically. `revalidatePath` is still called after writes so any in-flight Router cache (the per-navigation client cache, not the Data Cache) drops.

---

## Action contract

```ts
// lib/actions.ts (NEW — used by every Server Action below)
export type ActionResult = { ok: true } | { ok: false; error: string };
```

Forms call actions via `<form action={fn}>`. The Carelin student form uses `useActionState(fn, { ok: true })` for inline errors. Every other action ends in either `redirect('/the/page')` (which throws, short-circuiting the function) on success, or `return { ok: false, error }` on failure.

After every successful write: `revalidatePath('/affected/route')` for **all** routes whose query helpers depend on the touched entity. The mapping is spelled out per-action below.

---

## Auth helpers

`lib/auth.ts` (new, server-only) exports two functions used by every authenticated action:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export async function requireAdmin(): Promise<AdminRow> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await db
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error("Not an active admin");
  return data;
}

export async function requireRootAdmin(): Promise<AdminRow> {
  const admin = await requireAdmin();
  if (admin.tier !== "root") throw new Error("Root admin required");
  return admin;
}
```

The `admins_select_self` RLS policy on the `admins` table lets the authenticated user read their own row, so this works under RLS without escalating to service role.

`throw new Error(...)` in a Server Action surfaces to the framework's error boundary and is enough for the prototype — the `proxy.ts` gate already prevents non-admins from reaching admin pages, so reaching these helpers without a valid session is itself an internal error.

---

## Revalidation matrix

Reference table: which `revalidatePath` calls follow each write. Use this when implementing each action below.

| Write                                      | revalidatePath calls                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `createAdmin` / `disableAdmin`             | `/admin/admins`                                                                     |
| `postCarelinRequest`                       | `/student/carelin`, `/admin/carelin`                                                |
| `replyToCarelin`                           | `/admin/carelin`, `/admin/carelin/[id]` (use literal of the id), `/student/carelin` |
| `markAnswered`                             | `/admin/carelin`, `/admin/carelin/[id]`, `/student/carelin`                         |
| `editScoreboard`                           | `/admin/sport`, `/student/sport`, `/student`, `/admin`                              |
| `addEvent`                                 | `/admin/calendar`, `/student/calendar`, `/admin`, `/student`                        |
| `saveDraft` / `publishPost` / `deletePost` | `/admin/pshare`, `/student/pshare`                                                  |

---

## Constants

- **Today (prototype):** `2026-05-12` (matches the rest of the codebase).
- **Anchor timezone:** Asia/Bangkok (`+07:00`).
- **`carelin_status` enum:** `'open' | 'answered'`.
- **`pshare_status` enum:** `'draft' | 'published' | 'review'` (we only use `draft` + `published`).
- **`event_category` enum:** `'sport' | 'tradition' | 'music' | 'admin' | 'academic'`.
- **`admin_tier` enum:** `'root' | 'normal'`.

---

## Tasks

### Task 1: Shared action contract + auth helpers

**Files:**

- Create: `lib/actions.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Create `lib/actions.ts`**

```ts
export type ActionResult = { ok: true } | { ok: false; error: string };
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export async function requireAdmin(): Promise<AdminRow> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await db
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error("Not an active admin");
  return data;
}

export async function requireRootAdmin(): Promise<AdminRow> {
  const admin = await requireAdmin();
  if (admin.tier !== "root") throw new Error("Root admin required");
  return admin;
}
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass. Nothing imports these yet, but TypeScript and lint should accept them on their own.

- [ ] **Step 4: Commit**

```bash
git add lib/actions.ts lib/auth.ts
git commit -m "$(cat <<'EOF'
add: shared ActionResult + requireAdmin/requireRootAdmin helpers
EOF
)"
```

---

### Task 2: Admins list page (read-only) + sidebar entry

**Files:**

- Create: `lib/queries/admins.ts`
- Create: `app/admin/admins/page.tsx`
- Modify: `app/admin/layout.tsx`
- Modify: `components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Add `getAdmins()` query helper**

Create `lib/queries/admins.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminListRow = Pick<
  Database["public"]["Tables"]["admins"]["Row"],
  "id" | "email" | "display_name" | "tier" | "is_active" | "created_at"
>;

export async function getAdmins(): Promise<AdminListRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("admins")
    .select("id, email, display_name, tier, is_active, created_at")
    .order("tier", { ascending: true }) // 'normal' < 'root' lexicographically — flip below
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAdmins: ${error.message}`);
  // Show roots first regardless of alpha order
  return (data ?? []).sort((a, b) => {
    if (a.tier === b.tier) return a.created_at.localeCompare(b.created_at);
    return a.tier === "root" ? -1 : 1;
  });
}
```

- [ ] **Step 2: Accept an `extraItems` prop on the sidebar**

Modify `components/layout/AdminSidebar.tsx`. Make the component accept an optional list of nav items appended after the built-in NAV array. Replace the existing component signature:

```tsx
type NavItem = {
  href: string;
  en: string;
  th: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  /* unchanged */
];

export function AdminSidebar({ extraItems = [] }: { extraItems?: NavItem[] }) {
  const pathname = usePathname();
  const items = [...NAV, ...extraItems];
  // …everything that previously mapped NAV maps `items` instead.
}
```

Also `export type { NavItem };` so the layout can construct one.

- [ ] **Step 3: Pass a root-only Admins nav item from the layout**

Rewrite `app/admin/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { AdminSidebar, type NavItem } from "@/components/layout/AdminSidebar";
import { requireAdmin } from "@/lib/auth";

const ADMINS_NAV: NavItem = {
  href: "/admin/admins",
  en: "Admins",
  th: "แอดมิน",
  icon: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21c1 -3.5 4 -5 6 -5s5 1.5 6 5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M14 21c0 -2.5 2 -4 3 -4s3 1.5 3 4" />
    </>
  ),
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  const extraItems: NavItem[] = admin.tier === "root" ? [ADMINS_NAV] : [];
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-6 py-6">
      <AdminSidebar extraItems={extraItems} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```

This makes the admin layout dynamic, which is correct: every admin page reads the session anyway.

- [ ] **Step 4: Create the read-only admins page**

Create `app/admin/admins/page.tsx`:

```tsx
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { requireRootAdmin } from "@/lib/auth";
import { getAdmins } from "@/lib/queries/admins";

export default async function AdminAdminsPage() {
  await requireRootAdmin();
  const admins = await getAdmins();
  return (
    <>
      <AdminTopbar titleTh="แอดมิน" eyebrow="Admins · root-only" />

      <Card>
        <CardTitle th="แอดมินทั้งหมด" en="All admins" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Display name", "Email", "Tier", "Status"].map((h, i) => (
                <th
                  key={i}
                  className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-2.5 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((a, i) => {
              const td =
                i < admins.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={a.id}
                  className="hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <span className="font-display text-[15px] italic">
                      {a.display_name}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-mono text-[12px]">{a.email}</span>
                  </td>
                  <td className={td}>
                    {a.tier === "root" ? (
                      <Pill variant="ok">root</Pill>
                    ) : (
                      <Pill>normal</Pill>
                    )}
                  </td>
                  <td className={td}>
                    {a.is_active ? (
                      <Pill variant="ok">active</Pill>
                    ) : (
                      <Pill variant="pend">disabled</Pill>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
```

If `Pill` does not accept those variants, fall back to the closest existing variant (the table already does this in `CarelinDeskTable`). Read `components/admin/Pill.tsx` first.

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build
```

Then sign in as the root admin in the dev server: the sidebar should show **Admins** under Carelin Desk, and `/admin/admins` should list every admin row with the root user on top. Logging out and visiting `/admin/admins` should hit the `/login` redirect from `proxy.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/admins.ts app/admin/admins/page.tsx app/admin/layout.tsx components/layout/AdminSidebar.tsx
git commit -m "$(cat <<'EOF'
add: root-only /admin/admins list page
EOF
)"
```

---

### Task 3: Admins write actions (createAdmin, disableAdmin) + form

**Files:**

- Create: `app/admin/admins/actions.ts`
- Modify: `app/admin/admins/page.tsx`

- [ ] **Step 1: Implement `createAdmin` and `disableAdmin`**

Create `app/admin/admins/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRootAdmin } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import type { ActionResult } from "@/lib/actions";

export async function createAdmin(formData: FormData): Promise<ActionResult> {
  await requireRootAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const tier = String(formData.get("tier") ?? "normal");

  if (!email || !display_name || !password) {
    return {
      ok: false,
      error: "Email, display name, and password are required.",
    };
  }
  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters." };
  }
  if (tier !== "root" && tier !== "normal") {
    return { ok: false, error: "Tier must be 'root' or 'normal'." };
  }

  const svc = getSupabaseServiceRole();

  const created = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    return {
      ok: false,
      error: created.error?.message ?? "Failed to create auth user.",
    };
  }

  const { error: insertError } = await svc.from("admins").insert({
    auth_user_id: created.data.user.id,
    email,
    display_name,
    tier,
  });
  if (insertError) {
    // Roll back the auth user so the form can be retried.
    await svc.auth.admin.deleteUser(created.data.user.id);
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function disableAdmin(formData: FormData): Promise<ActionResult> {
  const self = await requireRootAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing admin id." };
  if (id === self.id) {
    return { ok: false, error: "Cannot disable your own account." };
  }

  const svc = getSupabaseServiceRole();
  const { error } = await svc
    .from("admins")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/admins");
  return { ok: true };
}
```

Service-role is required for the auth user creation; the spec calls this out as the intended escape hatch.

- [ ] **Step 2: Add the create form + per-row disable button to the page**

Modify `app/admin/admins/page.tsx`. Above the existing card, add a **New admin** card with a form bound to `createAdmin`. Replace the last column of the table (currently empty) with a per-row disable button bound to `disableAdmin` — disabled (i.e. no button rendered) for the caller's own row and for already-disabled rows.

```tsx
// at the top of the file
import { createAdmin, disableAdmin } from "./actions";
import { Btn } from "@/components/admin/Btn";
```

Update the page body:

```tsx
const self = await requireRootAdmin();
const admins = await getAdmins();
// …
<Card className="mb-[18px]">
  <CardTitle th="เพิ่มแอดมิน" en="New admin" />
  <form action={createAdmin} className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
      Email
      <input
        name="email"
        type="email"
        required
        className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
      />
    </label>
    <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
      Display name · ชื่อแสดง
      <input
        name="display_name"
        type="text"
        required
        className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
      />
    </label>
    <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
      Password (≥ 12 chars)
      <input
        name="password"
        type="password"
        required
        minLength={12}
        className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
      />
    </label>
    <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
      Tier
      <select
        name="tier"
        defaultValue="normal"
        className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
      >
        <option value="normal">normal</option>
        <option value="root">root</option>
      </select>
    </label>
    <div className="md:col-span-2">
      <Btn variant="primary">Create admin →</Btn>
    </div>
  </form>
</Card>;
```

For the disable column, change the table header row to include a trailing empty `""` cell (already five columns now), and inside the row map:

```tsx
<td className={td}>
  {a.is_active && a.id !== self.id && (
    <form action={disableAdmin}>
      <input type="hidden" name="id" value={a.id} />
      <Btn>Disable</Btn>
    </form>
  )}
</td>
```

(Add `""` to the `["Display name", "Email", "Tier", "Status"]` array so heads align.)

- [ ] **Step 3: Verify (manual)**

```bash
npm run lint && npm run build
npm run dev
```

In the browser, signed in as root:

1. Submit the form with an arbitrary new email + 12-char password + `display_name=Test Admin` + `tier=normal`.
2. The new admin appears on the list with status **active**.
3. Sign out, sign in as `test@…` with the password — `/admin` should load (no Admins entry in the sidebar because tier=normal).
4. Sign back in as root, click **Disable** on that row — status flips to **disabled** and the button disappears.
5. Sign in as the disabled admin — `proxy.ts` allows the cookie, but `/admin/admins` throws (which surfaces an error boundary). That is acceptable for the prototype; the layout's `requireAdmin()` short-circuits with `is_active = true` and any admin page errors. **Acceptable behavior — disabling locks the user out of admin pages immediately.**

If the auth user creation fails (e.g. duplicate email), the form returns `{ ok: false, error }` but the page does not display it. Phase 3d only inlines errors on the **Carelin student form**; for the admins page, server-side `throw new Error(...)` for hard errors and unrendered `ActionResult` for soft errors is acceptable per spec. Check `npm run dev` server logs if a submission silently no-ops.

- [ ] **Step 4: Commit**

```bash
git add app/admin/admins/actions.ts app/admin/admins/page.tsx
git commit -m "$(cat <<'EOF'
add: createAdmin + disableAdmin server actions and form
EOF
)"
```

---

### Task 4: Student Carelin form + `postCarelinRequest`

**Files:**

- Create: `app/student/carelin/actions.ts`
- Create: `app/student/carelin/new/page.tsx`
- Create: `components/student/CarelinForm.tsx`
- Modify: `components/student/CarelinCta.tsx`

- [ ] **Step 1: Implement `postCarelinRequest`**

Create `app/student/carelin/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";

const ID_RE = /^[0-9]{4}$/;

export async function postCarelinRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const who_name = String(formData.get("who_name") ?? "").trim();
  const student_id_4 = String(formData.get("student_id_4") ?? "").trim();
  const klassRaw = String(formData.get("klass") ?? "").trim();
  const klass = klassRaw === "" ? null : klassRaw;

  if (!title) return { ok: false, error: "Please add a title." };
  if (!body) return { ok: false, error: "Please describe your request." };
  if (!who_name) return { ok: false, error: "Please tell us your name." };
  if (!ID_RE.test(student_id_4)) {
    return { ok: false, error: "Student ID must be exactly 4 digits." };
  }

  const db = await createClient();
  const { error } = await db
    .from("carelin_requests")
    .insert({ title, body, who_name, student_id_4, klass });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/carelin");
  revalidatePath("/admin/carelin");
  redirect("/student/carelin");
}
```

Note the `(_prev, formData)` signature — that's what `useActionState` passes.

- [ ] **Step 2: Build the client form component**

Create `components/student/CarelinForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions";
import { postCarelinRequest } from "@/app/student/carelin/actions";

const INITIAL: ActionResult = { ok: true };

export function CarelinForm() {
  const [state, action, pending] = useActionState(postCarelinRequest, INITIAL);
  return (
    <form action={action} className="space-y-3.5">
      <label className="block">
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Title · เรื่อง
        </span>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      <label className="block">
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Body · รายละเอียด
        </span>
        <textarea
          name="body"
          required
          rows={5}
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Name · ชื่อ
          </span>
          <input
            name="who_name"
            type="text"
            required
            maxLength={60}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Student ID · รหัส (4 หลัก)
          </span>
          <input
            name="student_id_4"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Class · ชั้น (optional)
        </span>
        <input
          name="klass"
          type="text"
          maxLength={20}
          placeholder="ม.5/2"
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      {!state.ok && (
        <p className="border-house-pink bg-house-pink/10 text-house-pink border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.1em] uppercase">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border-line bg-blue font-display text-yellow w-full border-[1.5px] px-4 py-3 text-[18px] italic [box-shadow:4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post request → ส่งคำขอ"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the form route**

Create `app/student/carelin/new/page.tsx`:

```tsx
import Link from "next/link";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { CarelinForm } from "@/components/student/CarelinForm";

export default function NewCarelinRequest() {
  return (
    <>
      <PageHead
        titleTh="ขอความช่วยเหลือ"
        titleEn="Post a request"
        action={
          <Link
            href="/student/carelin"
            className="border-line bg-paper text-mute-700 border-[1.5px] px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <MobileBody className="space-y-3.5">
        <Blurb accent="pink">
          เขียนสั้น ๆ พอเข้าใจ ★ ครู / รุ่นพี่ จะมาตอบใน Public Board
        </Blurb>
        <CarelinForm />
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 4: Make `CarelinCta` a link**

Modify `components/student/CarelinCta.tsx`. Swap the `<button>` for a `<Link href="/student/carelin/new">` and remove `type="button"`:

```tsx
import Link from "next/link";

export function CarelinCta() {
  return (
    <Link
      href="/student/carelin/new"
      className="border-line bg-house-pink flex w-full items-center gap-3 border-[1.5px] px-4 py-3.5 text-left text-white [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)]"
    >
      {/* identical inner markup as before */}
    </Link>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build
npm run dev
```

In the browser (no session needed — public route):

1. Visit `/student/carelin`. Click the pink **โพสต์ขอความช่วยเหลือ** card → lands on `/student/carelin/new`.
2. Submit with `student_id_4=abc` → inline error `Student ID must be exactly 4 digits.` appears.
3. Submit valid data → redirected to `/student/carelin`; the new request appears at the top of the Public Board.
4. Sign in as root, visit `/admin/carelin` — the new request appears (status **Open**, klass shown if provided).

- [ ] **Step 6: Commit**

```bash
git add app/student/carelin/actions.ts app/student/carelin/new/page.tsx components/student/CarelinForm.tsx components/student/CarelinCta.tsx
git commit -m "$(cat <<'EOF'
add: anonymous carelin request form + postCarelinRequest action
EOF
)"
```

---

### Task 5: Admin Carelin detail + `replyToCarelin` + `markAnswered` + dynamic tab counts

**Files:**

- Create: `app/admin/carelin/actions.ts`
- Create: `app/admin/carelin/[id]/page.tsx`
- Modify: `lib/queries/carelin.ts`
- Modify: `app/admin/carelin/page.tsx`
- Modify: `components/admin/CarelinDeskTable.tsx`
- Modify: `lib/ui/carelin.ts`

- [ ] **Step 1: Implement `replyToCarelin` + `markAnswered`**

Create `app/admin/carelin/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions";

export async function replyToCarelin(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const request_id = String(formData.get("request_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const role_label = String(formData.get("role_label") ?? "").trim() || null;
  if (!request_id) return { ok: false, error: "Missing request id." };
  if (!body) return { ok: false, error: "Reply body is required." };

  const db = await createClient();
  const { error } = await db.from("carelin_replies").insert({
    request_id,
    body,
    teacher_name: admin.display_name,
    role_label,
    avatar_letter: admin.display_name.slice(0, 1),
    created_by_admin_id: admin.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${request_id}`);
  revalidatePath("/student/carelin");
  return { ok: true };
}

export async function markAnswered(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const request_id = String(formData.get("request_id") ?? "");
  if (!request_id) return { ok: false, error: "Missing request id." };

  const db = await createClient();
  const { error } = await db
    .from("carelin_requests")
    .update({ status: "answered" })
    .eq("id", request_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${request_id}`);
  revalidatePath("/student/carelin");
  return { ok: true };
}
```

- [ ] **Step 2: Add `id` to desk rows + a single-request query**

Modify `lib/queries/carelin.ts`. Add `id` to the `CarelinDeskRow` shape via a new local type (don't touch `lib/types.ts` — the prototype's `CarelinDeskRow` lives there and is wider than what this page needs). The simplest path: add `id` to the existing `CarelinDeskRow` type in `lib/types.ts`, since it's an internal model and adding a required field forces the table component to pass it through.

Edit `lib/types.ts` (line ~309):

```ts
export type CarelinDeskRow = {
  id: string;
  when: string;
  requester: { name: string; studentId: string; klass: string };
  title: string;
  snippet: string;
  status: "Open" | "Answered";
};
```

In `lib/queries/carelin.ts`:

- Add `"id"` to the SELECT in `getCarelinDeskRows` (`"id, title, body, who_name, student_id_4, klass, status, created_at"`).
- Map it through: `{ id: r.id, when, requester, title, snippet, status }`.
- Add a new helper:

```ts
export type CarelinDetail = {
  id: string;
  title: string;
  body: string;
  who: string;
  studentId: string;
  klass: string;
  status: "open" | "answered";
  when: string;
  replies: Array<{
    teacher: string;
    role: string;
    body: string;
    avatar: string;
    when: string;
  }>;
};

export async function getCarelinDetail(
  id: string,
): Promise<CarelinDetail | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select(
      "id, title, body, who_name, student_id_4, klass, status, created_at, carelin_replies(teacher_name, role_label, body, avatar_letter, created_at)",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const replies =
    (data.carelin_replies as unknown as Array<{
      teacher_name: string | null;
      role_label: string | null;
      body: string;
      avatar_letter: string | null;
      created_at: string;
    }>) ?? [];
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    who: data.who_name,
    studentId: data.student_id_4,
    klass: data.klass ?? "",
    status: data.status as CarelinDetail["status"],
    when: relativeWhen(data.created_at),
    replies: replies
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        teacher: r.teacher_name ?? "",
        role: r.role_label ?? "",
        body: r.body,
        avatar: r.avatar_letter ?? "",
        when: relativeWhen(r.created_at),
      })),
  };
}

export async function getCarelinTabCounts(): Promise<{
  all: number;
  open: number;
  answered: number;
}> {
  const db = await createClient();
  const { data, error } = await db.from("carelin_requests").select("status");
  if (error) throw new Error(`getCarelinTabCounts: ${error.message}`);
  const rows = (data ?? []) as Array<{ status: "open" | "answered" }>;
  return {
    all: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    answered: rows.filter((r) => r.status === "answered").length,
  };
}
```

- [ ] **Step 3: Update the table to link Reply / View buttons**

Modify `components/admin/CarelinDeskTable.tsx`. Replace the `<Btn>` elements in the last column with `<Link>` versions that point to `/admin/carelin/${row.id}`:

```tsx
import Link from "next/link";
// …
<td className={td}>
  <Link
    href={`/admin/carelin/${row.id}`}
    className={
      row.status === "Open"
        ? "border-line bg-blue text-yellow inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
        : "border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
    }
  >
    {row.status === "Open" ? "Reply" : "View"}
  </Link>
</td>;
```

(`Btn` is a `<button>` and cannot wrap `<Link>` semantically; mirror its styling inline.)

- [ ] **Step 4: Make tab counts dynamic**

Modify `lib/ui/carelin.ts`. Convert the constant export into a small factory:

```ts
import type { AdminTabItem } from "@/lib/types";

export function carelinDeskTabs(counts: {
  all: number;
  open: number;
  answered: number;
}): AdminTabItem[] {
  return [
    { id: "all", label: "All", count: counts.all },
    { id: "open", label: "Open", count: counts.open },
    { id: "answered", label: "Answered", count: counts.answered },
  ];
}

export const CARELIN_DESK_ACTIVE_TAB = "all";
```

Modify `app/admin/carelin/page.tsx`. Replace the `CARELIN_DESK_TABS` import with `carelinDeskTabs` and call it with the result of `getCarelinTabCounts()`:

```tsx
import { carelinDeskTabs, CARELIN_DESK_ACTIVE_TAB } from "@/lib/ui/carelin";
import { getCarelinDeskRows, getCarelinTabCounts } from "@/lib/queries/carelin";
// …
const [kpis, rows, counts] = await Promise.all([
  getCarelinKpis(),
  getCarelinDeskRows(),
  getCarelinTabCounts(),
]);
// …
<TabBar tabs={carelinDeskTabs(counts)} activeId={CARELIN_DESK_ACTIVE_TAB} />;
```

- [ ] **Step 5: Create the detail page**

Create `app/admin/carelin/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { getCarelinDetail } from "@/lib/queries/carelin";
import { markAnswered, replyToCarelin } from "../actions";

export default async function CarelinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getCarelinDetail(id);
  if (!request) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="คำขอ"
        eyebrow="Carelin · request"
        actions={
          <Link
            href="/admin/carelin"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <CardTitle
            th={request.title}
            en={`From ${request.who} · #${request.studentId}${request.klass ? ` · ${request.klass}` : ""}`}
          />
          {request.status === "open" ? (
            <Pill variant="pend">Open</Pill>
          ) : (
            <Pill variant="ok">Answered</Pill>
          )}
        </div>
        <p className="text-ink text-[14px] leading-[1.55] whitespace-pre-line">
          {request.body}
        </p>
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="คำตอบ" en="Replies" />
        {request.replies.length === 0 ? (
          <p className="text-mute-500 font-mono text-[11px] tracking-[0.14em] uppercase">
            No replies yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {request.replies.map((r, i) => (
              <li
                key={i}
                className="border-ink bg-cream border-[1.5px] border-dashed px-3 py-2.5"
              >
                <div className="font-display mb-1 text-[14px] italic">
                  {r.teacher}
                  {r.role ? ` · ${r.role}` : ""}
                  <span className="text-mute-500 ml-2 font-mono text-[10px] not-italic">
                    {r.when}
                  </span>
                </div>
                <p className="text-ink text-[13.5px] leading-[1.5] whitespace-pre-line">
                  {r.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="ตอบกลับ" en="Reply" />
        <form action={replyToCarelin} className="space-y-3">
          <input type="hidden" name="request_id" value={request.id} />
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.14em] uppercase">
              Role label (optional, e.g. Physics / ดนตรี)
            </span>
            <input
              name="role_label"
              type="text"
              maxLength={40}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.14em] uppercase">
              Reply body
            </span>
            <textarea
              name="body"
              required
              rows={5}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13.5px]"
            />
          </label>
          <Btn variant="primary">Send reply →</Btn>
        </form>
      </Card>

      {request.status === "open" && (
        <Card className="mt-[18px]">
          <form action={markAnswered}>
            <input type="hidden" name="request_id" value={request.id} />
            <Btn>Mark as answered ✓</Btn>
          </form>
        </Card>
      )}
    </>
  );
}
```

- [ ] **Step 6: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as root:

1. `/admin/carelin` tab counts now reflect real row totals (no longer 19 / 7 / 12).
2. Click **Reply** on an open row → lands on `/admin/carelin/<uuid>`.
3. Submit a reply → page refreshes, the reply appears in the **Replies** card.
4. Click **Mark as answered** → status pill flips to **Answered**; navigate back to `/admin/carelin` and the row's status pill is **Answered**.
5. Visit `/student/carelin` — the request now shows the teacher reply card.

- [ ] **Step 7: Commit**

```bash
git add app/admin/carelin/actions.ts app/admin/carelin/[id]/page.tsx app/admin/carelin/page.tsx components/admin/CarelinDeskTable.tsx lib/queries/carelin.ts lib/types.ts lib/ui/carelin.ts
git commit -m "$(cat <<'EOF'
add: carelin reply + mark-answered actions and detail page
EOF
)"
```

---

### Task 6: Admin Sport scoreboard editor + `editScoreboard`

**Files:**

- Create: `app/admin/sport/actions.ts`
- Create: `app/admin/sport/edit/page.tsx`
- Modify: `components/admin/ScoreboardCard.tsx`

- [ ] **Step 1: Implement `editScoreboard`**

Create `app/admin/sport/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions";

export async function editScoreboard(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const db = await createClient();

  // 4 houses, ids 1..4. Field names: score_1, score_2, score_3, score_4.
  for (const id of [1, 2, 3, 4] as const) {
    const raw = String(formData.get(`score_${id}`) ?? "");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100000 || !Number.isInteger(n)) {
      return {
        ok: false,
        error: `Score for house ${id} must be a non-negative integer.`,
      };
    }
    const { error } = await db
      .from("houses")
      .update({ current_score: n })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  revalidatePath("/student");
  revalidatePath("/admin");
  redirect("/admin/sport");
}
```

- [ ] **Step 2: Build the editor page**

Create `app/admin/sport/edit/page.tsx`:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getScoreboard } from "@/lib/queries/houses";
import { editScoreboard } from "../actions";

const HOUSE_ID_BY_KEY = { green: 1, purple: 2, orange: 3, pink: 4 } as const;

export default async function EditScoreboardPage() {
  const scoreboard = await getScoreboard();
  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขคะแนน"
        eyebrow="Edit scoreboard"
        actions={
          <Link
            href="/admin/sport"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="คะแนนบ้าน" en="House scores" />
        <form
          action={editScoreboard}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {scoreboard.map((entry) => {
            const id = HOUSE_ID_BY_KEY[entry.house];
            return (
              <label key={entry.house} className="block">
                <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
                  {entry.nameEn} · {entry.nameTh}
                </span>
                <input
                  name={`score_${id}`}
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={entry.score}
                  className="border-line bg-paper font-display text-ink mt-1 w-full border-[1.5px] px-3 py-2 text-[24px] italic"
                />
              </label>
            );
          })}
          <div className="md:col-span-2">
            <Btn variant="primary">Save scores →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Link the ScoreboardCard pill**

Modify `components/admin/ScoreboardCard.tsx`. Wrap the `✎ edit score` span in a `<Link>` pointing to `/admin/sport/edit`. (Whole-card link is unnecessary; just the pill.)

```tsx
import Link from "next/link";
// …
<Link
  href="/admin/sport/edit"
  className="border-blue text-blue mt-2.5 inline-block border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase"
>
  ✎ edit score
</Link>;
```

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as root or normal admin:

1. `/admin/sport` → click any **✎ edit score** pill → lands on `/admin/sport/edit`.
2. Change one score, submit → redirected to `/admin/sport`; the card reflects the new value.
3. Visit `/student/sport` → leaderboard reflects the new value.
4. Visit `/student` (home hero "leading" pill) → updated if the leading house changed.

- [ ] **Step 5: Commit**

```bash
git add app/admin/sport/actions.ts app/admin/sport/edit/page.tsx components/admin/ScoreboardCard.tsx
git commit -m "$(cat <<'EOF'
add: scoreboard editor + editScoreboard action
EOF
)"
```

---

### Task 7: Admin Calendar Add Event + `addEvent`

**Files:**

- Create: `app/admin/calendar/actions.ts`
- Create: `app/admin/calendar/new/page.tsx`
- Modify: `app/admin/calendar/page.tsx`

- [ ] **Step 1: Implement `addEvent`**

Create `app/admin/calendar/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions";

const CATEGORIES = [
  "sport",
  "tradition",
  "music",
  "admin",
  "academic",
] as const;
type Category = (typeof CATEGORIES)[number];

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export async function addEvent(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const tag_raw = String(formData.get("tag") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const starts_at_local = String(formData.get("starts_at") ?? "").trim();
  const location_raw = String(formData.get("location") ?? "").trim();
  const highlight = formData.get("highlight") === "on";

  if (!title_th) return { ok: false, error: "Thai title is required." };
  if (!isCategory(category)) return { ok: false, error: "Invalid category." };
  if (!starts_at_local)
    return { ok: false, error: "Start datetime is required." };

  // <input type="datetime-local"> produces e.g. "2026-05-12T15:30".
  // Anchor to Asia/Bangkok (+07:00) per project convention.
  const starts_at = `${starts_at_local}:00+07:00`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(starts_at)) {
    return { ok: false, error: "Bad starts_at format." };
  }

  const db = await createClient();
  const { error } = await db.from("events").insert({
    title_th,
    title_en: title_en_raw || null,
    tag: tag_raw || null,
    category,
    starts_at,
    location: location_raw || null,
    highlight,
    created_by_admin_id: admin.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}
```

- [ ] **Step 2: Build the new-event page**

Create `app/admin/calendar/new/page.tsx`:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { addEvent } from "../actions";

const CATEGORIES = [
  { value: "sport", label: "Sport · กีฬา" },
  { value: "tradition", label: "Tradition · ประเพณี" },
  { value: "music", label: "Music · ดนตรี" },
  { value: "admin", label: "Admin · บริหาร" },
  { value: "academic", label: "Academic · วิชาการ" },
];

export default function NewEventPage() {
  return (
    <>
      <AdminTopbar
        titleTh="เพิ่มกิจกรรม"
        eyebrow="New calendar event"
        actions={
          <Link
            href="/admin/calendar"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="รายละเอียดกิจกรรม" en="Event details" />
        <form
          action={addEvent}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Thai title · ชื่อภาษาไทย (required)
            </span>
            <input
              name="title_th"
              type="text"
              required
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              English title (optional)
            </span>
            <input
              name="title_en"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Category
            </span>
            <select
              name="category"
              required
              defaultValue="academic"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Tag · e.g. "Sport · ลานกีฬากลาง" (optional)
            </span>
            <input
              name="tag"
              type="text"
              maxLength={80}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Starts at (Asia/Bangkok)
            </span>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue="2026-05-12T09:00"
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
              Location (optional)
            </span>
            <input
              name="location"
              type="text"
              maxLength={120}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
            />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input name="highlight" type="checkbox" />
            <span className="text-mute-700 font-mono text-[11px] tracking-[0.14em] uppercase">
              Highlight (yellow briefing chip)
            </span>
          </label>

          <div className="md:col-span-2">
            <Btn variant="primary">Save event →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Wire the "+ Add Event" button**

Modify `app/admin/calendar/page.tsx`. Replace the `<Btn variant="primary">+ Add Event</Btn>` with a styled Link to `/admin/calendar/new`. The simplest path:

```tsx
import Link from "next/link";
// …
<Link
  href="/admin/calendar/new"
  className="border-line bg-blue text-yellow inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
>
  + Add Event
</Link>;
```

(Match `Btn variant="primary"` styling by reading `components/admin/Btn.tsx` first; copy its primary classes if the snippet above doesn't match.)

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as admin:

1. `/admin/calendar` → click **+ Add Event** → lands on `/admin/calendar/new`.
2. Fill title_th + pick a date in May 2026 + category → submit.
3. Redirected to `/admin/calendar`. With `tag=null` the event will appear in the BigCal grid (which filters `is.null` on tag). Pick `2026-05-15T10:00` and it should land on day 15.
4. Visit `/student/calendar`. The day-dot for May 15 should now include the chosen category color (matches the `getStudentMonth` selector).
5. Visit `/admin` overview — `getAdminTodayEvents` filters to 2026-05-12 events with non-null tag, so a 5/12 + non-empty tag event appears there.

- [ ] **Step 5: Commit**

```bash
git add app/admin/calendar/actions.ts app/admin/calendar/new/page.tsx app/admin/calendar/page.tsx
git commit -m "$(cat <<'EOF'
add: calendar add-event page + addEvent action
EOF
)"
```

---

### Task 8: P'share Studio list + admin query

**Files:**

- Modify: `lib/queries/pshare.ts`
- Modify: `app/admin/pshare/page.tsx`

- [ ] **Step 1: Add `getAllPsharePosts()` admin query**

Modify `lib/queries/pshare.ts`. Add (do not change the existing student helper):

```ts
export type PshareAdminRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "review";
  author: string;
  num: string;
  publishedAt: string | null;
  updatedAt: string;
};

export async function getAllPsharePosts(): Promise<PshareAdminRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "id, slug, title, status, author_alias, num_label, published_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`getAllPsharePosts: ${error.message}`);
  return (data ?? []).map<PshareAdminRow>((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status as PshareAdminRow["status"],
    author: p.author_alias ?? "",
    num: p.num_label ?? "",
    publishedAt: p.published_at,
    updatedAt: p.updated_at,
  }));
}
```

- [ ] **Step 2: Replace the stub page with a real list**

Rewrite `app/admin/pshare/page.tsx`:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { getAllPsharePosts } from "@/lib/queries/pshare";

const STATUS_LABEL = {
  draft: "Draft",
  published: "Published",
  review: "Review",
} as const;

export default async function AdminPshareList() {
  const posts = await getAllPsharePosts();
  return (
    <>
      <AdminTopbar
        titleTh="พี่แชร์"
        eyebrow="P'share Studio"
        actions={
          <Link
            href="/admin/pshare/new"
            className="border-line bg-blue text-yellow inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            + New post
          </Link>
        }
      />

      <Card>
        <CardTitle th="โพสต์ทั้งหมด" en="All posts" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["#", "Title · ชื่อโพสต์", "Author", "Status", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-2.5 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const td =
                i < posts.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={p.id}
                  className="hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <span className="font-display text-[15px] italic">
                      {p.num || "–"}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-display text-[15px] italic">
                      {p.title}
                    </span>
                    <small className="text-mute-500 mt-px block font-mono text-[10px]">
                      {p.slug}
                    </small>
                  </td>
                  <td className={td}>{p.author}</td>
                  <td className={td}>
                    {p.status === "published" ? (
                      <Pill variant="ok">{STATUS_LABEL[p.status]}</Pill>
                    ) : (
                      <Pill variant="pend">{STATUS_LABEL[p.status]}</Pill>
                    )}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/admin/pshare/${p.id}/edit`}
                      className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as admin:

1. `/admin/pshare` now lists every seeded post with status pills. `+ New post` and per-row `Edit` links are placeholders that 404 — that lands in Task 9.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/pshare.ts app/admin/pshare/page.tsx
git commit -m "$(cat <<'EOF'
swap: /admin/pshare from stub to real post list
EOF
)"
```

---

### Task 9: P'share editor + `saveDraft` + `publishPost`

**Files:**

- Create: `app/admin/pshare/actions.ts`
- Create: `components/admin/PshareEditor.tsx`
- Create: `app/admin/pshare/new/page.tsx`
- Create: `app/admin/pshare/[id]/edit/page.tsx`

- [ ] **Step 1: Implement `saveDraft` and `publishPost`**

Create `app/admin/pshare/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions";

type DraftFields = {
  slug: string;
  title: string;
  num_label: string | null;
  snippet: string | null;
  body_md: string | null;
  author_alias: string | null;
  art_halftone: string | null;
  art_bg: string | null;
  art_num_color: string | null;
  tags: string[];
};

function parseDraft(
  formData: FormData,
): { ok: true; data: DraftFields } | { ok: false; error: string } {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return {
      ok: false,
      error: "Slug must be lowercase letters, digits, or hyphens.",
    };
  }
  if (!title) return { ok: false, error: "Title is required." };

  const num_label = String(formData.get("num_label") ?? "").trim() || null;
  const snippet = String(formData.get("snippet") ?? "").trim() || null;
  const body_md = String(formData.get("body_md") ?? "") || null;
  const author_alias =
    String(formData.get("author_alias") ?? "").trim() || null;
  const art_halftone =
    String(formData.get("art_halftone") ?? "").trim() || null;
  const art_bg = String(formData.get("art_bg") ?? "").trim() || null;
  const art_num_color =
    String(formData.get("art_num_color") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags =
    tagsRaw === ""
      ? []
      : tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

  return {
    ok: true,
    data: {
      slug,
      title,
      num_label,
      snippet,
      body_md,
      author_alias,
      art_halftone,
      art_bg,
      art_num_color,
      tags,
    },
  };
}

export async function saveDraft(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return parsed;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({ ...parsed.data, status: "draft" })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("pshare_posts").insert({
      ...parsed.data,
      status: "draft",
      created_by_admin_id: admin.id,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}

export async function publishPost(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return parsed;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({
        ...parsed.data,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("pshare_posts").insert({
      ...parsed.data,
      status: "published",
      published_at: new Date().toISOString(),
      created_by_admin_id: admin.id,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
```

`saveDraft` always normalises status back to `draft`; `publishPost` always sets `published` + stamps `published_at`. Editing a published post and clicking **Save draft** demotes it (intentional — gives admins a way to unpublish).

- [ ] **Step 2: Build the shared editor**

Create `components/admin/PshareEditor.tsx`:

```tsx
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { saveDraft, publishPost } from "@/app/admin/pshare/actions";

type Defaults = {
  id?: string;
  slug?: string;
  title?: string;
  num_label?: string | null;
  snippet?: string | null;
  body_md?: string | null;
  author_alias?: string | null;
  art_halftone?: string | null;
  art_bg?: string | null;
  art_num_color?: string | null;
  tags?: string[];
};

const HALFTONES = ["halftone-bl", "halftone-bk", "halftone-soft"] as const;

export function PshareEditor({ defaults }: { defaults: Defaults }) {
  const d = defaults;
  return (
    <Card>
      <CardTitle th="แก้ไขโพสต์" en={d.id ? "Edit post" : "New post"} />
      {/* One form, two actions — pick via the submit button's formAction. */}
      <form className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {d.id && <input type="hidden" name="id" value={d.id} />}

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Slug (lowercase, hyphens)
          </span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            maxLength={80}
            defaultValue={d.slug ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Num label (e.g. "01")
          </span>
          <input
            name="num_label"
            type="text"
            maxLength={6}
            defaultValue={d.num_label ?? ""}
            className="border-line bg-paper font-display text-ink mt-1 w-full border-[1.5px] px-3 py-2 text-[20px] italic"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Title
          </span>
          <input
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={d.title ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[15px]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Snippet
          </span>
          <input
            name="snippet"
            type="text"
            maxLength={240}
            defaultValue={d.snippet ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Body (Markdown)
          </span>
          <textarea
            name="body_md"
            rows={12}
            defaultValue={d.body_md ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Author alias
          </span>
          <input
            name="author_alias"
            type="text"
            maxLength={80}
            defaultValue={d.author_alias ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Halftone variant
          </span>
          <select
            name="art_halftone"
            defaultValue={d.art_halftone ?? "halftone-bl"}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          >
            {HALFTONES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Art background (CSS color, optional)
          </span>
          <input
            name="art_bg"
            type="text"
            maxLength={40}
            placeholder="var(--color-cream)"
            defaultValue={d.art_bg ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Num color (CSS color, optional)
          </span>
          <input
            name="art_num_color"
            type="text"
            maxLength={40}
            placeholder="var(--color-ink)"
            defaultValue={d.art_num_color ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Tags (comma-separated, e.g. "#math-olympiad, #tmo")
          </span>
          <input
            name="tags"
            type="text"
            defaultValue={(d.tags ?? []).join(", ")}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <div className="flex gap-2 md:col-span-2">
          <Btn formAction={saveDraft}>Save draft</Btn>
          <Btn formAction={publishPost} variant="primary">
            Publish →
          </Btn>
        </div>
      </form>
    </Card>
  );
}
```

The two submit buttons use the React `formAction` prop, which overrides the form's default action per-button. Both actions reuse the same form fields.

If `Btn` doesn't forward `formAction`, switch to plain `<button type="submit" formAction={…}>` with the same Tailwind classes Btn applies (read `components/admin/Btn.tsx`).

- [ ] **Step 3: New-post route**

Create `app/admin/pshare/new/page.tsx`:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { PshareEditor } from "@/components/admin/PshareEditor";

export default function NewPsharePost() {
  return (
    <>
      <AdminTopbar
        titleTh="โพสต์ใหม่"
        eyebrow="P'share · new post"
        actions={
          <Link
            href="/admin/pshare"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <PshareEditor defaults={{}} />
    </>
  );
}
```

- [ ] **Step 4: Edit-post route**

Create `app/admin/pshare/[id]/edit/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { PshareEditor } from "@/components/admin/PshareEditor";
import { createClient } from "@/lib/supabase/server";

export default async function EditPsharePost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "id, slug, title, num_label, snippet, body_md, author_alias, art_halftone, art_bg, art_num_color, tags",
    )
    .eq("id", id)
    .single();
  if (error || !data) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขโพสต์"
        eyebrow="P'share · edit post"
        actions={
          <Link
            href="/admin/pshare"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <PshareEditor
        defaults={{
          id: data.id,
          slug: data.slug,
          title: data.title,
          num_label: data.num_label,
          snippet: data.snippet,
          body_md: data.body_md,
          author_alias: data.author_alias,
          art_halftone: data.art_halftone,
          art_bg: data.art_bg,
          art_num_color: data.art_num_color,
          tags: data.tags ?? [],
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as admin:

1. `/admin/pshare` → click **+ New post** → fill slug=`test-001`, title=`Test`, body=`# Hi`, snippet=`hello`, author=`พี่ทอม`, halftone=`halftone-bl`, tags=`#test, #wip` → click **Save draft**. Redirected to `/admin/pshare`, new row appears with status pill **Draft**.
2. Edit that row → change title → click **Publish**. Redirected back; status now **Published**.
3. Visit `/student/pshare` → the post appears in the public feed.
4. Edit again → click **Save draft** → demotes back to draft; row vanishes from `/student/pshare`.

- [ ] **Step 6: Commit**

```bash
git add app/admin/pshare/actions.ts components/admin/PshareEditor.tsx app/admin/pshare/new/page.tsx app/admin/pshare/[id]/edit/page.tsx
git commit -m "$(cat <<'EOF'
add: pshare editor + saveDraft/publishPost actions
EOF
)"
```

---

### Task 10: P'share delete

**Files:**

- Modify: `app/admin/pshare/actions.ts`
- Modify: `app/admin/pshare/[id]/edit/page.tsx`

- [ ] **Step 1: Implement `deletePost`**

Append to `app/admin/pshare/actions.ts`:

```ts
export async function deletePost(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing post id." };

  const db = await createClient();
  const { error } = await db.from("pshare_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
```

- [ ] **Step 2: Add a delete button on the edit page**

Modify `app/admin/pshare/[id]/edit/page.tsx`. Below the editor card, render a small danger-zone form:

```tsx
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { deletePost } from "../../actions";
// …
<Card className="border-house-pink mt-[18px]">
  <CardTitle th="ลบโพสต์" en="Delete post" />
  <form action={deletePost}>
    <input type="hidden" name="id" value={data.id} />
    <Btn>Delete permanently</Btn>
  </form>
</Card>;
```

(Phase 3d skips a confirm prompt; admin acceptance of the prototype's no-frills delete is fine.)

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
npm run dev
```

Signed in as admin:

1. Open any post's edit page → click **Delete permanently** → row vanishes from `/admin/pshare`; published posts also vanish from `/student/pshare`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/pshare/actions.ts app/admin/pshare/[id]/edit/page.tsx
git commit -m "$(cat <<'EOF'
add: deletePost action and danger-zone control
EOF
)"
```

---

### Task 11: Final verification — exit-criteria walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Clean lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass with zero warnings.

- [ ] **Step 2: Walk the spec exit criteria**

In a `npm run dev` browser, with `proxy.ts` cookies cleared, run through the spec exit list:

1. **Anon Carelin post** — visit `/student/carelin/new` (no session), submit a request → appears at the top of `/student/carelin`.
2. **Admin reply** — sign in as root, `/admin/carelin` → row shows Reply → detail page → submit reply → reply appears under the request.
3. **Mark answered** — same detail page → click Mark as answered → status flips to Answered everywhere.
4. **Edit a score** — `/admin/sport` → ✎ edit score → change a value → see it on `/student/sport`.
5. **Add an event** — `/admin/calendar` → + Add Event → submit → event appears on `/admin/calendar` BigCal (if tag empty) and as a dot on `/student/calendar` for the chosen day.
6. **Publish a P'share post** — `/admin/pshare` → + New post → fill → Publish → appears on `/student/pshare`.
7. **Create + sign in as a new admin** — `/admin/admins` → create form → sign out → sign in as the new admin. `/admin` loads (no Admins sidebar entry because tier=normal).
8. **Refresh test** — refresh each page after each write; everything persists.

- [ ] **Step 3: Record row counts in Supabase Studio**

Open the Supabase dashboard → Database → Tables. Note the row counts for: `admins`, `carelin_requests`, `carelin_replies`, `pshare_posts`, `events`, `houses`. Capture in the final summary.

- [ ] **Step 4: Stop**

Per spec: "Phase 3 ends here." Summarise what shipped, list the row counts, ask whether to ship to Vercel or iterate further.

No commit on this task — verification only.

---

## Self-review checklist

After all tasks: confirm the following are all true.

- [ ] **Spec coverage:** every entry in the §3d minimum write set has a task: `signIn` (3a, no-op here), `signOut` (3a, no-op here), `createAdmin` (T3), `disableAdmin` (T3), `postCarelinRequest` (T4), `replyToCarelin` (T5), `markAnswered` (T5), `editScoreboard` (T6), `addEvent` (T7), `saveDraft` (T9), `publishPost` (T9), `deletePost` (T10).
- [ ] **Carelin 5th field:** `klass` is rendered in `CarelinForm.tsx` and persisted by `postCarelinRequest` (T4).
- [ ] **`useActionState`** is used exactly once: the Carelin form (T4). No other form uses it.
- [ ] **Service-role only in `createAdmin` / `disableAdmin`** (T3). All other writes use the cookie-bound server client and rely on RLS for authorization.
- [ ] **`revalidatePath` matrix** is implemented in every action — see the table near the top.
- [ ] **No `'use client'` on Server Actions.** Every `actions.ts` file starts with `"use server"`.
- [ ] **No `tailwind.config.js`, no `middleware.ts`, no Zod / react-hook-form / lucide-react / state-management library** added.
