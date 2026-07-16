# Hosting on Vercel free tier; Squarespace stays registrar with DNS pointed at Vercel

The app deploys to Vercel's Hobby (free) tier, which covers a private, non-commercial family app at no cost and includes custom domains with automatic SSL. The owner's domain stays registered at Squarespace; Squarespace also continues to host the DNS zone, and the domain is pointed at Vercel by adding records in Squarespace's own DNS panel — an **A record** at the apex and a **CNAME** for any subdomain — with no nameserver change and no migration of DNS hosting. Google OAuth and Supabase are configured with the production domain as an allowed origin/redirect. Exact record values, quirks, and the local-dev-vs-production origin handling are captured in the deploy research ([#3](https://github.com/Temel00/emelbros-app/issues/3), `docs/research/vercel-squarespace-google-oauth-deploy.md`).

## Considered Options

**Moving DNS off Squarespace** (to Vercel or Cloudflare nameservers) was considered and rejected as unnecessary: Squarespace's Custom Records panel supports the A/CNAME records Vercel needs, so the registrar can stay put and the change is a couple of record edits rather than a nameserver cutover.

**A paid Vercel plan** was not needed — the Hobby tier's limits are comfortable for five users and its fair-use terms permit a private app with no payments or ads.
