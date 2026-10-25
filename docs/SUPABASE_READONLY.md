# Supabase anonymous read-only adapter

> Experimental development mode. No production account Auth, no public posting, and no new Supabase project is created automatically.

## What is implemented

`src/post-store.mjs` supports two modes: `local` (default JSON behavior) and `supabase-readonly` (anonymous PostgREST reads of RLS-visible published articles). This intentionally disables all `POST /api/posts` requests even with a local development bearer key. No service-role key, no secret key, and no user JWT is sent to Supabase.

## Before using the adapter

1. Create a **disposable** Supabase project you control. Apply `supabase/migrations/202610250001_initial_schema.sql` and verify the RLS rules. **Never run `supabase/tests/bootstrap.sql` in Supabase**; it is a CI-only PostgreSQL shim.
2. Create explicitly moderated/published test content using a trusted SQL-editor session in the disposable database. Do not use real user records. Ordinary users are intentionally limited to drafts by RLS.
3. Copy `.env.example` to `.env` (ignored by Git). Set:

    POST_STORE=supabase-readonly
    SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLISHABLE_KEY

4. Start `npm run dev` locally and open `/en/` or read `/api/posts?locale=en`.
5. Verify that `POST /api/posts` always returns HTTP 503 and that `/api/posts` never returns unpublished drafts.

## Security limits

- Only publishable keys accepted by the adapter. Never use `sb_secret_...` or legacy `service_role` keys.
- Reads go through RLS using anonymous PostgREST requests; no Authorization header and no session handling.
- The adapter explicitly filters `status=published`, but **RLS remains the actual database confidentiality boundary**.
- Network timeouts, untrusted/malformed upstream JSON and database failures return a generic 503; no silent fallback to JSON.
- This does not include real account authentication, comments, token rotation, moderation, backups, migrations of existing JSON posts or production hosting.

## Rollback

Set `POST_STORE=local` (or remove it), clear Supabase fields, and restart the local server. The existing JSON file remains unmodified when using read-only mode. Do not rely on the adapter for production or for migration of live data.

## Related work

See [Issue #14](https://github.com/rf24kja/24gotop-starter/issues/14) for the full PostgreSQL adapter with transactions and authenticated writes, and [Issue #15](https://github.com/rf24kja/24gotop-starter/issues/15) for verified sessions and ownership.
