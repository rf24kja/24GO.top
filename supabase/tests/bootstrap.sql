-- Lightweight CI-only compatibility shim. NEVER run on a live Supabase project.
-- Supabase Auth already provides auth.users, auth.uid(), anon/authenticated roles.
create role anon noinherit nologin;
create role authenticated noinherit nologin;
create role service_role noinherit nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
