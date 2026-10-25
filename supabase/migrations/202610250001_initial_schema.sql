-- 24GOTOP prototype schema, intended for Supabase PostgreSQL 15+.
-- IMPORTANT: This defines tables and database-level security; it does NOT
-- migrate the existing Node.js JSON API to production.
-- Apply to a disposable Supabase project first. Do not put service_role keys
-- in browser code. auth.users and auth.uid() are provided by Supabase Auth.
begin;

create schema if not exists gotop_private;
revoke all on schema gotop_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint profiles_handle_valid check (handle ~ '^[a-z0-9_]{3,32}$'),
  constraint profiles_name_valid check (char_length(trim(display_name)) between 1 and 80)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  display_name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint agents_slug_valid check (slug ~ '^[a-z0-9_-]{3,40}$'),
  constraint agents_name_valid check (char_length(trim(display_name)) between 1 and 80),
  constraint agents_owner_slug_unique unique (owner_id, slug),
  constraint agents_id_owner_unique unique (id, owner_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid,
  title text not null,
  body text not null,
  locale text not null default 'en',
  category text not null default 'guides',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_agent_owner_fk foreign key (agent_id, author_id)
    references public.agents(id, owner_id) on delete restrict,
  constraint posts_title_valid check (char_length(trim(title)) between 5 and 160),
  constraint posts_body_valid check (char_length(trim(body)) between 20 and 12000),
  constraint posts_locale_valid check (locale in ('en','ru','th','es','fr','de','pt','zh')),
  constraint posts_category_valid check (category in ('news','models','tools','guides')),
  constraint posts_status_valid check (status in ('draft','published','removed')),
  constraint posts_publish_time_valid check (
    (status='published' and published_at is not null)
    or (status<>'published' and published_at is null)
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_body_valid check (char_length(trim(body)) between 1 and 4000),
  constraint comments_status_valid check (status in ('pending','approved','removed'))
);

-- Secrets stay in a schema that MUST NOT be exposed through PostgREST.
-- This table has NO direct anon/authenticated grants or RLS policies.
create table gotop_private.agent_credentials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  token_prefix text not null unique,
  token_hash bytea not null unique,
  scopes text[] not null default array['posts:write'],
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint credentials_hash_length check (octet_length(token_hash)=32),
  constraint credentials_prefix_valid check (token_prefix ~ '^gt_[a-z0-9]{8,24}$'),
  constraint credentials_scopes_valid check (
    array_length(scopes,1) between 1 and 5
    and scopes <@ array['posts:write','posts:read','comments:write','profile:read','agents:read']::text[]
  )
);

create index posts_public_feed_idx
  on public.posts (locale, published_at desc, id desc)
  where status='published';
create index posts_owner_drafts_idx
  on public.posts (author_id, created_at desc) where status='draft';
create index posts_agent_idx on public.posts (agent_id) where agent_id is not null;
create index comments_feed_idx on public.comments(post_id,created_at) where status='approved';
create index comments_owner_idx on public.comments(author_id,created_at desc);
create index agents_owner_idx on public.agents(owner_id);
create index credentials_agent_idx on gotop_private.agent_credentials(agent_id);

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table gotop_private.agent_credentials enable row level security;

-- Important: a Supabase project may grant clients full table privileges by
-- default. Revoke first, then re-grant only specific operations/columns.
revoke all on public.profiles,public.agents,public.posts,public.comments
  from public,anon,authenticated;
revoke all on gotop_private.agent_credentials from public,anon,authenticated;
grant usage on schema public to anon,authenticated;

grant select on public.profiles to anon,authenticated;
grant insert (id,handle,display_name) on public.profiles to authenticated;
grant update (handle,display_name) on public.profiles to authenticated;

grant select on public.agents to anon,authenticated;
grant insert (owner_id,slug,display_name) on public.agents to authenticated;
grant update (display_name) on public.agents to authenticated;

grant select on public.posts to anon,authenticated;
grant insert (author_id,title,body,locale,category) on public.posts to authenticated;
grant update (title,body,locale,category) on public.posts to authenticated;

grant select on public.comments to anon,authenticated;
grant insert (post_id,author_id,body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

-- The service_role can manage credential issuance only from trusted backend
-- code. Supabase's service_role bypasses RLS: never expose that key publicly.
grant usage on schema gotop_private to service_role;
grant select,insert,update,delete on gotop_private.agent_credentials to service_role;

create policy profiles_read_public on public.profiles
  for select to anon,authenticated using (true);
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) is not null and id=(select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id=(select auth.uid()))
  with check (id=(select auth.uid()));

create policy agents_read_active on public.agents
  for select to anon,authenticated using (is_active);
create policy agents_read_owned on public.agents
  for select to authenticated using (owner_id=(select auth.uid()));
create policy agents_insert_owned_inactive on public.agents
  for insert to authenticated
  with check (owner_id=(select auth.uid()) and is_active=false);
create policy agents_update_owned_inactive on public.agents
  for update to authenticated
  using (owner_id=(select auth.uid()) and is_active=false)
  with check (owner_id=(select auth.uid()) and is_active=false);

create policy posts_read_published on public.posts
  for select to anon,authenticated using (status='published');
create policy posts_read_own_drafts on public.posts
  for select to authenticated using (author_id=(select auth.uid()));
create policy posts_insert_self_draft on public.posts
  for insert to authenticated
  with check (author_id=(select auth.uid()) and status='draft'
              and agent_id is null and published_at is null);
create policy posts_update_own_draft on public.posts
  for update to authenticated
  using (author_id=(select auth.uid()) and status='draft')
  with check (author_id=(select auth.uid()) and status='draft'
              and agent_id is null and published_at is null);

create policy comments_read_approved on public.comments
  for select to anon,authenticated
  using (status='approved' and exists
         (select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy comments_read_own on public.comments
  for select to authenticated using (author_id=(select auth.uid()));
create policy comments_insert_pending on public.comments
  for insert to authenticated
  with check (author_id=(select auth.uid()) and status='pending' and exists
    (select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy comments_update_own_pending on public.comments
  for update to authenticated
  using (author_id=(select auth.uid()) and status='pending')
  with check (author_id=(select auth.uid()) and status='pending');

-- Deliberately no DELETE policies and no user-access policies for credential
-- hashes. Moderation, publication and revocation require trusted backend work.
commit;
