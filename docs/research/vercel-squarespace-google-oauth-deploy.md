# Deploying Emelbros Publicly: Vercel + Squarespace Domain + Google OAuth + Supabase

Research for GitHub issue #3 (Wayfinder map: Emelbros family platform, issue #1). Scope: exact steps and constraints to put the app on the owner's custom domain in production, with Google sign-in via Supabase, while keeping local dev working. All claims below are sourced from vendor primary documentation (linked inline). Researched 2026-07-11.

---

## 1. Vercel (Hobby/free tier) + Squarespace-registered domain

### 1.1 Hobby plan eligibility

The Hobby plan is free and "restricts users to non-commercial, personal use only" per Vercel's fair-use guidelines; commercial usage is defined as any deployment used for financial gain (payments, ads) by anyone involved in building it — a private family app with no payments/ads/donations-for-profit qualifies as personal use. Hobby includes custom domains at no extra cost with automatic SSL, up to **50 domains per project**.
Source: [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby), [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)

### 1.2 Which DNS record type goes where

Vercel's own domain-configuration flow distinguishes apex vs. subdomain:

- **Apex domain** (`emelbros.com`): configure with an **A record** pointing at the IP address Vercel's dashboard displays for your project. Vercel explicitly recommends A over CNAME at the apex because RFC 1034 §3.6.2 forbids other records (NS, MX) coexisting with a CNAME at a zone's root — a CNAME at the apex would break mail and nameserver delegation.
- **Subdomain** (`app.emelbros.com`): configure with a **CNAME record** pointing at the project-specific target Vercel shows you (Vercel's generic subdomain CNAME target is `cname.vercel-dns.com`; per-project it may show something like `<hash>.vercel-dns-017.com`). Vercel's CNAME value is given with a trailing period (fully-qualified) — copy it exactly.
- Some DNS providers offer an **ALIAS/ANAME** workaround for apex domains that resolves like a CNAME but is legal at the zone apex — Vercel mentions DNSimple/DNS Made Easy by name as providers that support this, pointed at `cname.vercel-dns.com`.
- Alternatively, **both** apex and subdomain can be configured by delegating to **Vercel's nameservers** instead of individual records (required if you ever want a wildcard subdomain, since Vercel needs to run the ACME DNS-01 challenge itself).

Sources: [Adding & Configuring a Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Managing DNS Records](https://vercel.com/docs/domains/managing-dns-records), [Troubleshooting domains](https://vercel.com/docs/domains/troubleshooting)

### 1.3 Squarespace-specific constraints

Squarespace is registrar-only by default unless nameservers were changed — as long as the domain still uses **Squarespace's own nameservers**, Squarespace also hosts the DNS zone and exposes a "Custom Records" panel (Domains → your domain → DNS → DNS Settings → Custom Records) that supports **A, AAAA, ALIAS, CNAME, CAA, DNS(KEY), HTTPS, MX, NS, SRV, TXT** records. This means, for this project, you do **not** need to move DNS hosting off Squarespace or touch nameservers to point the domain at Vercel — you can add records directly in Squarespace's panel.
Source: [DNS records for web hosting](https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting), [Edit your domain's DNS records](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-DNS-records-to-your-domain)

Concrete quirks/limitations to plan around:

- **CNAME cannot be set at the apex.** Squarespace's own docs state "it's not possible to add a CNAME with @ in the Name field" — so the apex (`emelbros.com`) must use an **A record** (Vercel's documented value) rather than CNAME. This matches Vercel's own apex guidance, so no conflict.
- **ALIAS is offered as an apex-capable record type** in Squarespace's panel, but Squarespace's help article examples only show ALIAS pointed at another *domain* (e.g., `example.com`), not explicitly confirmed against an arbitrary third-party CNAME target like `cname.vercel-dns.com`. Because this isn't unambiguously documented either way, treat Vercel's **A-record method as the safe, explicitly-supported path for the apex**, and treat ALIAS as an unconfirmed alternative rather than the primary plan.
- A `www` or `app` **subdomain** should use a plain **CNAME** record pointed at the value Vercel's dashboard gives you — this is unambiguously supported.
- Editing DNS records in Squarespace requires re-entering your account password or 2FA as a confirmation step.
- Squarespace's own support scope is limited: "We can help with showing you where to add records to your DNS settings. We can't provide technical advice about DNS records or information about how DNS records work with other services" — so if something doesn't propagate, Squarespace support will not debug the Vercel side.
- DNS changes to individual records typically propagate quickly; only a full **nameserver** change (not needed here) takes up to 24–48 hours per Vercel's docs.

Sources: [DNS records for web hosting](https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting), [Edit your domain's DNS records](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-DNS-records-to-your-domain), [Troubleshooting domains — propagation](https://vercel.com/docs/domains/troubleshooting)

### 1.4 Recommended shape for this project

Given Emelbros will likely want `emelbros.<tld>` (apex) and/or `app.emelbros.<tld>` (subdomain):

| Domain part | Squarespace record type | Value |
|---|---|---|
| Apex (`emelbros.com`) | **A** | IP address shown in Vercel → Project → Settings → Domains after adding the apex domain |
| `www` (if used) | **CNAME** | Value shown by Vercel (e.g. `cname.vercel-dns.com.`), copied exactly incl. trailing dot |
| `app` subdomain (if used instead of/alongside apex) | **CNAME** | Value shown by Vercel for that specific subdomain |

No nameserver change and no wildcard domain are needed for a 5-user family app, so the simpler per-record method (not Vercel nameservers) is sufficient.

---

## 2. Google Cloud Console OAuth consent screen for Supabase's Google provider

### 2.1 Redirect URI Supabase expects registered in Google Cloud Console

Supabase's Google provider requires you to register, under **Authorized redirect URIs** in the Google Cloud OAuth client, the callback URL Supabase generates:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

(shown directly on the Google provider configuration page inside the Supabase Dashboard for your project). For local Supabase CLI development the equivalent is `http://127.0.0.1:54321/auth/v1/callback`.
Source: [Login with Google | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)

### 2.2 "External" user type with only 5 known users

Google Cloud's OAuth consent screen requires choosing a **User Type**: "Internal" is only available for/restricted to Google Workspace organizations authenticating their own org members; a normal Gmail-based family domain must use **External**. External apps go through a **publishing status**: **Testing** or **In production**.

- In **Testing** status, the app is limited to **up to 100 test users** explicitly listed on the consent screen — 5 family Google accounts fits comfortably.
- Google's docs do not describe an exemption from ever finishing verification purely due to "staying in Testing forever," but for a non-sensitive-scope app (see below) verification is not the gating factor for Testing-mode use.

Source: [Manage App Audience](https://support.google.com/cloud/answer/15549945?hl=en), [Configure the OAuth consent screen and choose scopes](https://developers.google.com/workspace/guides/configure-oauth-consent)

### 2.3 Whether Google verification is required at this scale

Verification is triggered by **scope sensitivity**, not directly by user count. Google's own classification:

- **Sensitive scopes** (e.g., Calendar read, Contacts write) and **restricted scopes** (e.g., Gmail, Drive) require Google's verification process (which can include a security assessment) before general availability.
- **Non-sensitive/basic scopes** — `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` — are exactly what Supabase's Google provider uses by default, and Google's docs state apps that only request these do **not need to complete the (full) verification process**, even to publish to production for the general public.
- The separate **100-new-user cap** applies specifically to *unverified* apps that request sensitive/restricted scopes; it is not documented as applying to apps using only non-sensitive scopes.
- Apps using only basic/non-sensitive scopes get additional benefits while unverified: test users don't see the "unverified app" warning screen, and their authorization doesn't expire after 7 days (a restriction that otherwise applies to unverified apps with broader scopes).
- The one remaining requirement even for a non-sensitive-scope app: if you want your app's **name/logo shown** on the consent screen (rather than a generic/warning presentation) while in External+production status, Google requires a lighter **"brand verification"** step (2–3 business days), which is distinct from and less involved than full sensitive-scope verification.

**Practical implication for Emelbros:** because Supabase's default Google scopes (`openid`, `email`, `profile`) are non-sensitive, the app can add the 5 family members as **test users** in **Testing** publishing status and never need to submit for full verification. If a polished sign-in screen (proper app name/logo, no scary interstitial) is wanted, only the quicker brand-verification step applies — not the full review.

Sources: [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en), [OAuth verification FAQ](https://support.google.com/cloud/answer/13463817?hl=en), [Manage App Audience](https://support.google.com/cloud/answer/15549945?hl=en), [Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification?hl=en)

### 2.4 Required OAuth consent screen fields

Regardless of scale, Google's consent-screen setup requires: App name, User support email, Developer contact email, and User type (Internal/External); scopes are declared separately in the "Data Access" step and non-sensitive scopes (`openid`/`email`/`profile`) are pre-filled by default for the Google Sign-In use case.
Source: [Configure the OAuth consent screen and choose scopes](https://developers.google.com/workspace/guides/configure-oauth-consent)

---

## 3. Supabase Auth: production domain + localhost simultaneously

Supabase Auth's **URL Configuration** page (Authentication → URL Configuration in the Supabase Dashboard) has two relevant settings:

- **Site URL** — the default redirect target used when no explicit `redirectTo` is passed by client code (also used for things like email-confirmation links). Set this to the production URL, e.g. `https://emelbros.com` (or `https://app.emelbros.com`).
- **Additional Redirect URLs** — an allow-list of every other URL/pattern OAuth/magic-link redirects are permitted to target. This is where local dev is added alongside production so both work at the same time, e.g.:
  - `http://localhost:3000/**`
  - `https://emelbros.com/**` (or the exact production callback path)

Supabase supports glob-style wildcard matching in this list: `*` matches within a path segment, `**` matches across segments (including `/`), and `?`/`[...]` for single-char/range matching — useful for `localhost:3000/**` and preview-deployment domains (`https://*.vercel.app/**`). Supabase's own guidance: use the wildcard forms for local dev and preview URLs, but set the **exact** path for the production entry rather than relying on a wildcard there, for tighter security.
Source: [Redirect URLs | Supabase Docs](https://supabase.com/docs/guides/auth/redirect-urls)

Practical config for Emelbros (production apex/subdomain + local dev, no preview environments needed for a 5-user private app):

- Site URL: `https://emelbros.com` (or the chosen production hostname)
- Additional Redirect URLs:
  - `http://localhost:3000/**`
  - `https://emelbros.com/**`

This lets the same Supabase project (and same Google OAuth client, since Supabase's own `/auth/v1/callback` is what's registered in Google Cloud Console, not your app's own domain) serve both `next dev` on `localhost:3000` and the deployed Vercel production domain without reconfiguring Google or Supabase per environment.

---

## Step-by-step summary

1. **Vercel:** In the Vercel project → Settings → Domains, add the apex domain (e.g. `emelbros.com`) and/or `app.emelbros.com`. Vercel is free to use here since this is personal, non-commercial use (Hobby plan).
2. **Squarespace DNS:** In Squarespace → Domains → the domain → DNS → DNS Settings → Custom Records (no nameserver change needed if the domain still uses Squarespace's nameservers):
   - Add an **A record** at `@` with the IP Vercel displays, for the apex domain.
   - Add a **CNAME record** at `www` and/or `app` with the exact value (including trailing period) Vercel displays, for any subdomain.
   - Confirm with password/2FA when Squarespace prompts.
   - Wait for Vercel's dashboard to show the domain as valid/SSL-issued (usually well under Squarespace's stated propagation windows for record-level, non-nameserver changes).
3. **Google Cloud Console:** Create/confirm an OAuth 2.0 Client ID (Web application). Set OAuth consent screen **User Type = External**, keep **Publishing status = Testing**, and add the 5 family Gmail accounts as **test users**. Leave scopes at the default non-sensitive set (`openid`, `email`, `profile`) — this avoids the verification process and the 100-new-user cap (both of which apply only to sensitive/restricted scopes). Under **Authorized redirect URIs**, add `https://<project-ref>.supabase.co/auth/v1/callback` (get the exact value from Supabase Dashboard → Authentication → Providers → Google).
4. **Supabase:** In Authentication → Providers, enable Google and paste the Client ID/Secret from Google Cloud Console. In Authentication → URL Configuration, set **Site URL** to the production domain (`https://emelbros.com`), and add both `http://localhost:3000/**` and `https://emelbros.com/**` to **Additional Redirect URLs** so local dev and production both work without swapping config.
5. **Vercel env vars:** Set the Supabase URL/anon key (and `NEXT_PUBLIC_SITE_URL` or equivalent) as Vercel project environment variables so the deployed app's redirect logic points at the production domain rather than localhost.
6. Optional polish (not required for 5 known users): if a fully-branded consent screen (no "unverified app" warning) is wanted, submit for Google's lightweight **brand verification** (2–3 business days) rather than full sensitive-scope verification, since only non-sensitive scopes are used.
