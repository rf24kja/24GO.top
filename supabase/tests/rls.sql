-- Execute only against an empty disposable database after bootstrap + migration.
-- Checks privileges as actual anon/authenticated roles with distinct JWT subjects.
\set ON_ERROR_STOP on
begin;

insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

insert into public.profiles(id,handle,display_name) values
 ('11111111-1111-4111-8111-111111111111','alice_test','Alice'),
 ('22222222-2222-4222-8222-222222222222','bob_test','Bob');

insert into public.posts(id,author_id,title,body,locale,category,status,published_at) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'Draft owned by Alice','This is a private draft used only for RLS access tests.','en','guides','draft',null),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',
  'Public article by Bob','This is a published article used only in isolated CI tests.','en','news','published',now());

insert into public.agents(id,owner_id,slug,display_name) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111',
  'alice_bot','Alice Test Bot');
insert into gotop_private.agent_credentials(agent_id,token_prefix,token_hash)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','gt_12345678',decode(repeat('ab',32),'hex'));

set local role anon;
do $check$
declare n integer;
begin
  select count(*) into n from public.posts;
  if n<>1 then raise exception 'anon must see ONLY published posts, got %',n; end if;
  select count(*) into n from public.agents;
  if n<>0 then raise exception 'anon must not see inactive agents'; end if;
  begin
    perform 1 from gotop_private.agent_credentials;
    raise exception 'anon unexpectedly accessed private credentials';
  exception when insufficient_privilege then null;
  end;
end $check$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $check$
declare n integer; rows_affected integer;
begin
  select count(*) into n from public.posts;
  if n<>2 then raise exception 'Alice must see own draft and published article, got %',n; end if;

  insert into public.posts(author_id,title,body,locale,category)
  values ('11111111-1111-4111-8111-111111111111','Alice new draft',
    'Authorized draft content for a signed in author on 24GOTOP.',
    'en','guides');
  select count(*) into n from public.posts where author_id='11111111-1111-4111-8111-111111111111';
  if n<>2 then raise exception 'Authenticated author could not create own draft'; end if;

  begin
    insert into public.posts(author_id,title,body,locale,category)
    values ('22222222-2222-4222-8222-222222222222','Malicious foreign draft',
      'This is an unauthorized attempted publication made in a database security test.',
      'en','guides');
    raise exception 'Alice created a draft owned by Bob!';
  exception when insufficient_privilege then null;
  end;

  update public.posts set body='A malicious edit to Bob''s published post must be blocked.'
    where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics rows_affected=row_count;
  if rows_affected<>0 then raise exception 'Alice edited Bob post'; end if;

  begin
    update public.posts set status='published' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Client unexpectedly received status update privilege';
  exception when insufficient_privilege then null;
  end;

  insert into public.comments(post_id,author_id,body)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     '11111111-1111-4111-8111-111111111111','Review this article carefully.');
  select count(*) into n from public.comments;
  if n<>1 then raise exception 'Alice cannot see own pending comment'; end if;

  select count(*) into n from public.agents
    where owner_id='11111111-1111-4111-8111-111111111111';
  if n<>1 then raise exception 'Alice cannot see own inactive agent'; end if;

  begin
    perform 1 from gotop_private.agent_credentials;
    raise exception 'Authenticated role accessed credential hashes';
  exception when insufficient_privilege then null;
  end;
end $check$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $check$
declare n integer; rows_affected integer;
begin
  select count(*) into n from public.posts;
  if n<>1 then raise exception 'Bob can see Alice drafts, count %',n; end if;
  select count(*) into n from public.comments;
  if n<>0 then raise exception 'Bob can see Alice pending comment'; end if;
  select count(*) into n from public.agents;
  if n<>0 then raise exception 'Bob can see Alice inactive agent'; end if;
  update public.posts set title='Hacked Alice draft' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics rows_affected=row_count;
  if rows_affected<>0 then raise exception 'Bob edited Alice draft'; end if;
end $check$;
reset role;

rollback;
\echo 'RLS authorization checks passed'
