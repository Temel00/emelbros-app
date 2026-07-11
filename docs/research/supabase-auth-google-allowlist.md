# Supabase Auth + Google Sign-In with a Fixed Email Allowlist (Next.js App Router)

Research for a private 5-user family app: Next.js App Router, Supabase Auth (Google sign-in only), Vercel free tier. All claims below are sourced from official Supabase docs, the `@supabase/ssr` package source, and Supabase's own search results for their docs corpus. Where a page could not be fetched directly (blocked/404), that is noted and a substitute primary source is cited instead.

---

## 1. `@supabase/ssr` setup for Next.js App Router

Supabase's current (non-deprecated) SSR integration is the `@supabase/ssr` package, which explicitly **replaces** the old `@supabase/auth-helpers-nextjs` / `auth-helpers-react` / `auth-helpers-remix` / `auth-helpers-sveltekit` packages ([github.com/supabase/ssr](https://github.com/supabase/ssr)). Any tutorial still referencing `auth-helpers-nextjs` is stale.

The canonical Next.js App Router guide is [supabase.com/docs/guides/auth/server-side/nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs). Key points from that page:

- Install both `@supabase/supabase-js` and `@supabase/ssr`.
- Two client factories are used, matching where the code runs:
  - `createBrowserClient` — for Client Components, running in the browser.
  - `createServerClient` — for Server Components, Server Actions, and Route Handlers, running only on the server.
- Because Server Components cannot write cookies themselves, **middleware** is the mechanism that refreshes and persists the session: it calls `supabase.auth.getClaims()` to validate the token, then propagates refreshed cookies via `request.cookies.set` (for the current request) and `response.cookies.set` (back to the browser).
- **Critical guidance directly from the docs**: *"Always use `supabase.auth.getClaims()` to protect pages and user data. Never trust `supabase.auth.getSession()` inside server code"* — because `getClaims()` cryptographically validates the JWT against Supabase's published keys, whereas `getSession()` reads the (possibly stale/unverified) session from cookies. `getUser()` is a third option that performs a network round-trip to Supabase to re-fetch the current user. Pick `getClaims()` for authorization checks in middleware/server code.
- Supabase notes that "creating a Supabase client is lightweight," recommending a fresh client per request on the server, with a singleton pattern acceptable for the browser client.

Supplementary source: [github.com/supabase/ssr](https://github.com/supabase/ssr) confirms the package's purpose (consolidating framework-specific SSR helpers) and exposes `createBrowserClient` / `createServerClient` as the two entry points. It also documents a known limitation: **refresh tokens are single-use**, so if two concurrent requests share the same expired session cookie (e.g. two tabs opened at once), the second refresh attempt can fail after the first consumes the token. The middleware-per-navigation pattern mitigates this for normal page-load flows but does not eliminate races entirely — worth knowing for a small app since it's a `@supabase/ssr`-level constraint, not something an allowlist or RLS layer can fix.

*(Note: the npm README at [npmjs.com/package/@supabase/ssr](https://www.npmjs.com/package/@supabase/ssr) returned HTTP 403 when fetched directly; the GitHub repo README above was used as the equivalent primary source.)*

---

## 2. Restricting Google sign-in to a fixed allowlist

**Does Supabase let you restrict which Google accounts can sign in, natively?** Supabase's own Google provider docs ([supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google)) point to Google's own **Google Auth Platform "Audience"** console (`console.cloud.google.com/auth/audience`) as the place to configure "which Google users are allowed to sign in to your application" — but that's a Google Cloud OAuth consent-screen concept (e.g. restricting to "Internal" for a Google Workspace org, or a limited "Testing" user list on an unverified app), not a per-email allowlist enforced by Supabase itself. Supabase's docs do **not** describe a built-in "reject this email" setting for the Google provider, and do not explicitly confirm whether an `auth.users` row is created for literally any successful Google sign-in — the docs only describe the general flow ("a new user session is started by issuing an access and refresh token from Supabase Auth" once the OAuth exchange is valid). In practice, and consistent with how Supabase Auth Hooks are documented (see below), a Google sign-in that Google itself approves will proceed to Supabase's user-creation step unless something in Supabase's pipeline (a hook) explicitly intercepts it — enforcement has to happen on the Supabase/app side, not relegated to Google Cloud console settings alone, since that console list is really about the OAuth consent screen's testing/publishing state rather than a runtime allowlist you'd manage for 5 family members.

**Mechanism comparison:**

### Option A — "Before User Created" Auth Hook / Postgres trigger at signup time

Supabase's Auth Hooks system ([supabase.com/docs/guides/auth/auth-hooks](https://supabase.com/docs/guides/auth/auth-hooks)) lists several hook types, each implementable as a Postgres function or an HTTP endpoint, and available on the Free plan: **Before User Created**, **Custom Access Token**, **Send SMS**, **Send Email** (Free/Pro); **MFA Verification Attempt** and **Password Verification Attempt** are Team/Enterprise-only.

The **Before User Created** hook ([supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)) is the one that matters here:

- It fires **before** the new user row is inserted into `auth.users`.
- It can reject the signup outright: *"If the hook returns an error object, the signup is denied and the user is not created."* Error shape example from the docs: `{"error": {"message": "Only company emails are allowed to sign up.", "http_code": 400}}`.
- Because it runs pre-insert, a rejected sign-in leaves **no row at all** in `auth.users` — the cleanest possible outcome for "keep the users table exactly the 5 family members."
- Supabase's own docs even ship a worked example for this exact use case, titled **"Allow by Domain"**, implemented via a `signup_email_domains` table with `allow`/`deny` entries checked inside the hook function — i.e., Supabase's documented reference pattern for domain/email allowlisting *is* this hook.

Tradeoffs: requires writing and deploying a Postgres function (or HTTP endpoint) and enabling it as a hook in the dashboard — one extra piece of "infrastructure," but it's a single SQL function for a static 5-email list. Latency cost is a single Postgres function call in the hook chain during signup — negligible. UX-wise, the calling code gets a clean HTTP error back from the OAuth callback that the app can turn into a friendly "your account isn't authorized" page; no half-created user ever exists to clean up.

### Option B — `allowed_emails` table + RLS + post-signin app check

Alternative: let Supabase create the `auth.users` row unconditionally on any successful Google OAuth exchange, then check email membership in an `allowed_emails` table via RLS and/or an app-level check in middleware or a server component after redirect, denying access to app data (and/or immediately signing the user out) if the email isn't listed.

Tradeoffs: no hook/trigger to write, so it can feel simpler to a team unfamiliar with Postgres functions — but it pushes enforcement to *every* protected route/middleware invocation rather than once at signup, and it means **an `auth.users` row (and a Supabase Auth session/JWT) is created for anyone with a Google account**, allowlisted or not, before your app ever gets a chance to reject them. That's a strictly worse security posture (a stranger briefly obtains a valid, signed Supabase session) and worse cleanup story (orphaned `auth.users` rows for rejected attempts need periodic pruning, since Supabase has no built-in TTL for unconfirmed/unwanted users). RLS alone (per [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)) protects *table rows*, not the sign-in event itself — `auth.uid()` is null pre-auth and non-null the instant the OAuth exchange succeeds, so RLS has nothing to say about whether that user should have been allowed to authenticate in the first place. This mechanism is really "post-hoc access control," not allowlist *enforcement*.

**Recommendation for this app:** Option A (Before User Created hook) — reject at the door, so `auth.users` never contains anyone but the 5 family members. See [Recommendation](#recommendation).

---

## 3. `auth.uid()` → RLS → `profiles` table pattern

`auth.uid()` returns "the ID of the user making the request" and is the primitive nearly all RLS policies key off of ([supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)). The docs' RLS guide shows the general pattern:

```sql
create policy "User can see their own profile only."
on profiles for select
using ( (select auth.uid()) = user_id );
```

with an explicit warning: for unauthenticated requests `auth.uid()` is `null`, and since `null = user_id` is never true in SQL, an unauthenticated request is implicitly denied by such a policy — but the docs recommend being explicit (`(select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id`) rather than relying on that implicit behavior, for clarity/auditability.

Supabase's canonical, current `profiles` reference implementation lives on the **User Management** page ([supabase.com/docs/guides/auth/managing-user-data](https://supabase.com/docs/guides/auth/managing-user-data)) — this is the pattern reused across Supabase's own Next.js/React quickstarts. It is **trigger-populated**, not app-populated:

```sql
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  first_name text,
  last_name text,
  primary key (id)
);
alter table public.profiles enable row level security;
```

- A `handle_new_user()` function (marked `security definer`) inserts a row into `public.profiles`, pulling fields like first/last name out of `new.raw_user_meta_data`.
- An `on_auth_user_created` trigger on `auth.users` (`after insert`) invokes `handle_new_user()` automatically, so a `profiles` row is created in lockstep with every new `auth.users` row — the app never has to remember to do this itself.
- `security definer` is required because the trigger executes as `supabase_auth_admin`, which only has permissions within the `auth` schema; without `security definer` (running as the function's owner, typically `postgres`), the trigger couldn't write into `public.profiles`.
- Explicit warning in the docs: **"if the trigger fails, it could block signups, so test your code thoroughly"** — a failing trigger function throws during the `auth.users` insert transaction, so a broken `handle_new_user()` can lock out sign-in entirely. This is a real operational risk to design around (keep the trigger minimal and well-tested) but not a reason to abandon the pattern, since app-populated profiles have the opposite failure mode (a user is authenticated but has no profile row, breaking any code that assumes one exists).

The trigger-populated approach is Supabase's own documented default and composes cleanly with the Before User Created hook from Section 2: the hook rejects disallowed emails *before* `auth.users` insert, so the `on_auth_user_created` trigger — and therefore `profiles` — only ever fires for the 5 allowlisted family members.

---

## 4. Free-tier limits relevant to a 5-user app

From [supabase.com/pricing](https://supabase.com/pricing):

- **MAU (monthly active users):** 50,000 included on the Free plan — irrelevant at 5 users, effectively unlimited headroom.
- **Project pausing:** free projects are automatically paused after inactivity; the pricing page states this as "1 week of inactivity" (7 days). This is the one free-tier constraint most likely to actually bite a low-traffic family app — if nobody opens the app for a week, the project pauses and needs to be manually resumed from the dashboard before auth/API calls work again. There is no automatic keep-alive built in; the mitigation is either accepting occasional manual un-pausing or scheduling a trivial periodic request (e.g. a cron hitting a lightweight API route) to keep the project "active." (Supabase's platform docs confirm the same 7-day inactivity pause policy; see also [supabase.com/docs/guides/platform/going-into-prod](https://supabase.com/docs/guides/platform/going-into-prod).)
- **Database size:** 500 MB, shared CPU, 500 MB RAM — trivially sufficient for 5 users and family-app-scale data.
- **Egress:** 5 GB included (plus 5 GB "cached egress"); **File storage:** 1 GB included — both generous at this scale unless the app stores large media.
- **Active project limit:** Free tier allows **2 active projects** at a time; additional projects must stay paused (you can have unlimited *paused* projects, only 2 can be active simultaneously). Worth knowing if this family already runs another Supabase free project.
- **No automatic backups** on the Free tier, and **Auth audit log retention is only 1 hour** — for a family app this is low-risk, but it means there's no built-in point-in-time recovery story if data is accidentally deleted; manual/periodic export would be the only safety net.

From [supabase.com/docs/guides/platform/going-into-prod](https://supabase.com/docs/guides/platform/going-into-prod) (production checklist) and [supabase.com/docs/guides/auth/rate-limits](https://supabase.com/docs/guides/auth/rate-limits) (dedicated rate-limit reference):

- **Email-sending endpoints** (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user` when it triggers an email) are capped at **2 emails/hour by default** on the built-in mailer — this is *not* relevant to Google OAuth sign-in itself, but matters if this app ever adds a magic-link/password-recovery fallback alongside Google. Custom SMTP removes this cap.
- **OTP requests:** 360/hour by default, with a 60-second minimum window between requests per user (customizable) — not applicable to a Google-only flow.
- **Token refresh:** 1800 requests/hour per IP address (not customizable) — this is the limit most relevant to normal session-refresh traffic from `@supabase/ssr` middleware, and at 5 users it is not remotely close to being hit.
- **Verification / MFA / anonymous sign-in limits** exist but don't apply to a Google-only, non-MFA family app.
- Neither the rate-limits reference page nor the going-into-prod checklist documents a **dedicated OAuth/social-sign-in rate limit** distinct from the general token endpoints — i.e., there's no evidence of a specific "Google sign-ins per hour" cap beyond the generic IP-based buckets above, which are all far larger than 5 users could ever trigger.
- General production advice from the docs: enable email confirmations, keep OTP expiry ≤ 1 hour, and — if ever scaling beyond a toy app — give Supabase 2 weeks' notice before a traffic spike. None of this materially applies to a 5-user family app, but the **project-pause-after-7-days-inactivity** point above is the one item worth actually designing around.

---

## Recommendation

- **(a) Allowlist enforcement:** Use a **Supabase "Before User Created" Auth Hook** implemented as a Postgres function that checks the incoming email against a small hard-coded (or single-row-per-user) `allowed_emails` table and returns an error object to reject anyone else — Supabase's own docs ship this exact "Allow by Domain/email" pattern as the hook's reference example ([supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)). This rejects at the door before any `auth.users` row exists, which is strictly safer and simpler to reason about than letting arbitrary Google accounts authenticate and relying on RLS/middleware to catch them after the fact.

  **One-line decision log:** *"Enforce the 5-email allowlist via a Supabase 'Before User Created' Auth Hook (Postgres function) that rejects signup before an `auth.users` row is created — not via post-signin RLS/middleware checks."*

- **(b) Profiles/RLS pattern:** Use Supabase's canonical **trigger-populated `profiles` table** — `public.profiles` referencing `auth.users(id)`, RLS enabled with `auth.uid() = id`-style policies, populated automatically by a `security definer` `handle_new_user()` function fired via an `after insert on auth.users` trigger, per [supabase.com/docs/guides/auth/managing-user-data](https://supabase.com/docs/guides/auth/managing-user-data). Because the allowlist hook already guarantees only the 5 family members ever reach `auth.users`, the trigger only ever needs to handle those 5 rows, keeping the trigger function trivial and low-risk despite the docs' warning that a failing trigger can block signup.

  **One-line decision log:** *"Populate `profiles` via Supabase's standard `handle_new_user()` trigger on `auth.users` insert (not app-side inserts), scoped by RLS on `auth.uid() = id`."*
