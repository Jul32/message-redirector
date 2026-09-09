-- Run this file alone in the NEW Supabase project's SQL editor.
-- Do NOT run the older owner/auth-based migrations for this unauthenticated demo.
-- Repeatable seed inserts preserve edits; no existing tables/data are dropped.
begin;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='properties' and column_name='owner_id') then
   raise exception 'This project has the legacy authenticated schema. Use the new empty demo project; this script does not remove existing data.';
 end if;
end $$;

create table if not exists public.properties (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200), address text not null
);
create table if not exists public.tenants (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null,
 property_id uuid not null references public.properties(id), unique(id,property_id)
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null,
 source text not null check(source in ('SMS','Email','WhatsApp','Other')),
 content text not null check(length(trim(content)) between 1 and 10000),
 category text not null default 'General' check(category in ('Maintenance','Payment','General','Urgent')),
 status text not null default 'Open' check(status in ('Open','Resolved')),
 created_at timestamptz not null default now(),
 direction text not null default 'incoming' check(direction in ('incoming','outgoing')),
 reply_to uuid references public.messages(id),
 foreign key(tenant_id,property_id) references public.tenants(id,property_id),
 check((direction='incoming' and reply_to is null) or (direction='outgoing' and reply_to is not null))
);
create table if not exists public.rules (
 id uuid primary key default gen_random_uuid(), keyword text not null check(length(trim(keyword)) between 1 and 100),
 category text not null check(category in ('Maintenance','Payment','General','Urgent'))
);
create table if not exists public.feedback (
 id uuid primary key default gen_random_uuid(), liked text not null default '' check(length(liked)<=4000),
 confusing text not null default '' check(length(confusing)<=4000), missing text not null default '' check(length(missing)<=4000),
 would_use text not null check(would_use in ('Yes','Maybe','No')),
 name text check(length(name)<=120), email text check(length(email)<=254), created_at timestamptz not null default now()
);
create index if not exists messages_inbox_created on public.messages(direction,created_at desc);
create index if not exists messages_conversation on public.messages(reply_to,created_at,id);
create index if not exists messages_property on public.messages(property_id);
create index if not exists messages_tenant on public.messages(tenant_id);
create index if not exists tenants_property on public.tenants(property_id);
create unique index if not exists demo_rule_keyword on public.rules(lower(trim(keyword)));
create index if not exists feedback_created on public.feedback(created_at desc);

-- Fictional demo records; seeded before the categorization trigger is installed.
insert into public.properties (id,name,address) values ('00000000-0000-0000-0000-000000000001','The Maplewood','Demo address 1 (fictional)') on conflict do nothing;
insert into public.properties (id,name,address) values ('00000000-0000-0000-0000-000000000002','Oak & Willow','Demo address 2 (fictional)') on conflict do nothing;
insert into public.properties (id,name,address) values ('00000000-0000-0000-0000-000000000003','Parkside Residences','Demo address 3 (fictional)') on conflict do nothing;
insert into public.tenants (id,name,email,property_id) values ('00000000-0000-0000-0000-00000000000b','Demo Tenant Olivia','demo-tenant-1@example.com','00000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.tenants (id,name,email,property_id) values ('00000000-0000-0000-0000-00000000000c','Demo Tenant Phoenix','demo-tenant-2@example.com','00000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.tenants (id,name,email,property_id) values ('00000000-0000-0000-0000-00000000000d','Demo Tenant Lana','demo-tenant-3@example.com','00000000-0000-0000-0000-000000000003') on conflict do nothing;
insert into public.tenants (id,name,email,property_id) values ('00000000-0000-0000-0000-00000000000e','Demo Tenant Demi','demo-tenant-4@example.com','00000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.tenants (id,name,email,property_id) values ('00000000-0000-0000-0000-00000000000f','Demo Tenant Drew','demo-tenant-5@example.com','00000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.rules (id,keyword,category) values ('00000000-0000-0000-0000-0000000000c9','leak','Maintenance') on conflict do nothing;
insert into public.rules (id,keyword,category) values ('00000000-0000-0000-0000-0000000000ca','heating','Maintenance') on conflict do nothing;
insert into public.rules (id,keyword,category) values ('00000000-0000-0000-0000-0000000000cb','rent','Payment') on conflict do nothing;
insert into public.rules (id,keyword,category) values ('00000000-0000-0000-0000-0000000000cc','emergency','Urgent') on conflict do nothing;
insert into public.rules (id,keyword,category) values ('00000000-0000-0000-0000-0000000000cd','repair','Maintenance') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000065','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000001','SMS','Hi! There’s a leak under the kitchen sink. It seems to be getting worse — could someone come take a look?','Maintenance','Open','2026-09-08T10:42:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000066','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000002','Email','Quick question about rent for this month. Can you confirm the bank details are still the same?','Payment','Open','2026-09-08T09:18:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000067','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-000000000003','WhatsApp','The heating in my apartment hasn’t been working since last night. Could you send someone over?','Maintenance','Open','2026-09-08T08:05:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000068','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-000000000001','SMS','Emergency: there’s water coming through the ceiling in the hallway. Please call me as soon as possible.','Urgent','Open','2026-09-08T07:00:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000069','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-000000000002','Email','Hi, I’m expecting a large delivery on Friday. Is it okay for the courier to leave it in the lobby?','General','Open','2026-09-08T06:45:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000001','Email','Just sent over this month’s rent payment. Please let me know when it arrives. Thanks!','Payment','Resolved','2026-09-07T10:42:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006b','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-000000000003','SMS','The light on the second-floor landing keeps flickering. Would you be able to have it checked?','Maintenance','Open','2026-09-07T09:18:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006c','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000002','WhatsApp','Thanks for arranging the repair so quickly. The kitchen tap is working perfectly now!','Maintenance','Resolved','2026-09-07T08:05:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-000000000001','Email','I’d like to renew my lease when it ends in November. What are the next steps?','General','Open','2026-09-07T07:00:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-000000000002','SMS','The front door lock is sticking again. I had a hard time getting in this morning.','Maintenance','Open','2026-09-07T06:45:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-00000000006f','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-000000000003','Email','Could you send me a receipt for my last rent payment when you get a chance?','Payment','Resolved','2026-09-07T10:42:00Z') on conflict do nothing;
insert into public.messages (id,tenant_id,property_id,source,content,category,status,created_at) values ('00000000-0000-0000-0000-000000000070','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000001','Other','Can I reserve the community room for a small gathering next Saturday afternoon?','General','Resolved','2026-09-07T09:18:00Z') on conflict do nothing;

create or replace function public.prepare_demo_message() returns trigger language plpgsql set search_path = '' as $$
declare parent public.messages;
begin
 if new.direction='outgoing' then
  select * into parent from public.messages where id=new.reply_to and direction='incoming';
  if not found then raise exception 'A demo reply needs an incoming conversation'; end if;
  new.tenant_id:=parent.tenant_id; new.property_id:=parent.property_id;
  new.source:=parent.source; new.category:=parent.category; new.status:=parent.status;
 else
  select category into new.category from public.rules where position(lower(trim(keyword)) in lower(new.content))>0
   order by (category='Urgent') desc,id asc limit 1;
  new.category:=coalesce(new.category,'General');
 end if;
 return new;
end $$;
drop trigger if exists prepare_demo_message on public.messages;
create trigger prepare_demo_message before insert on public.messages for each row execute function public.prepare_demo_message();

alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.messages enable row level security;
alter table public.rules enable row level security;
alter table public.feedback enable row level security;
revoke all on public.properties,public.tenants,public.messages,public.rules,public.feedback from anon,authenticated;
grant select on public.properties,public.tenants,public.messages,public.rules to anon;
grant insert(id,tenant_id,property_id,source,content,direction,reply_to) on public.messages to anon;
grant update(status) on public.messages to anon;
grant insert(id,keyword,category),delete on public.rules to anon;

drop policy if exists demo_read on public.properties;
create policy demo_read on public.properties for select to anon using(true);
drop policy if exists demo_read on public.tenants;
create policy demo_read on public.tenants for select to anon using(true);
drop policy if exists demo_read on public.messages;
create policy demo_read on public.messages for select to anon using(true);
drop policy if exists demo_insert on public.messages;
create policy demo_insert on public.messages for insert to anon with check(true);
drop policy if exists demo_status on public.messages;
create policy demo_status on public.messages for update to anon using(true) with check(true);
drop policy if exists demo_read on public.rules;
create policy demo_read on public.rules for select to anon using(true);
drop policy if exists demo_insert on public.rules;
create policy demo_insert on public.rules for insert to anon with check(true);
drop policy if exists demo_delete on public.rules;
create policy demo_delete on public.rules for delete to anon using(true);

-- Write-only, idempotent feedback RPC. SECURITY DEFINER is necessary because
-- anon has NO table privileges, including SELECT; no feedback is returned.
-- No UPDATE means a retry cannot overwrite another response with the same ID.
create or replace function public.submit_demo_feedback(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.feedback(id,liked,confusing,missing,would_use,name,email,created_at)
 values ((payload->>'id')::uuid,coalesce(payload->>'liked',''),coalesce(payload->>'confusing',''),
 coalesce(payload->>'missing',''),payload->>'would_use',nullif(payload->>'name',''),nullif(payload->>'email',''),
 (payload->>'created_at')::timestamptz) on conflict(id) do nothing;
end $$;
revoke all on function public.submit_demo_feedback(jsonb) from public,anon,authenticated;
grant execute on function public.submit_demo_feedback(jsonb) to anon;
revoke all on function public.prepare_demo_message() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
