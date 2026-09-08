create type public.message_source as enum ('SMS','Email','WhatsApp','Other');
create type public.message_category as enum ('Maintenance','Payment','General','Urgent');
create type public.message_status as enum ('Open','Resolved');
create table public.properties (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check(length(trim(name)) > 0), address text not null, unique(id,owner_id)
);
create table public.tenants (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null, email text not null, property_id uuid not null,
 foreign key(property_id,owner_id) references public.properties(id,owner_id), unique(id,property_id,owner_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users on delete cascade,
 tenant_id uuid not null, property_id uuid not null, source public.message_source not null,
 content text not null check(length(trim(content)) between 1 and 10000), category public.message_category not null default 'General',
 status public.message_status not null default 'Open', created_at timestamptz not null default now(),
 foreign key(tenant_id,property_id,owner_id) references public.tenants(id,property_id,owner_id)
);
create table public.rules (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users on delete cascade,
 keyword text not null check(length(trim(keyword)) between 1 and 100), category public.message_category not null
);
create unique index rules_keyword_unique on public.rules(owner_id,lower(trim(keyword)));
create index messages_owner_created on public.messages(owner_id,created_at desc);
create index tenants_owner on public.tenants(owner_id);
create index properties_owner on public.properties(owner_id);
create index rules_owner on public.rules(owner_id);
alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.messages enable row level security;
alter table public.rules enable row level security;
create policy owner_access on public.properties for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_access on public.tenants for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_access on public.messages for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_access on public.rules for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create function public.categorize_message() returns trigger language plpgsql set search_path = public as $$
begin
 select category into new.category from public.rules where owner_id=new.owner_id and position(lower(keyword) in lower(new.content)) > 0
 order by (category='Urgent') desc,id asc limit 1;
 new.category := coalesce(new.category,'General');
 return new;
end $$;
create trigger categorize_new_message before insert on public.messages for each row execute function public.categorize_message();
