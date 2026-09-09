-- Optional for an already-seeded shared demo. Only replaces the known fictional seed values.
-- Preview/back up the affected seed rows before running. No messages or feedback are changed.
begin;
update public.tenants set name='Demo Tenant Olivia' where id='00000000-0000-0000-0000-00000000000b' and name='Olivia Rhye';
update public.tenants set name='Demo Tenant Phoenix' where id='00000000-0000-0000-0000-00000000000c' and name='Phoenix Baker';
update public.tenants set name='Demo Tenant Lana' where id='00000000-0000-0000-0000-00000000000d' and name='Lana Steiner';
update public.tenants set name='Demo Tenant Demi' where id='00000000-0000-0000-0000-00000000000e' and name='Demi Wilkinson';
update public.tenants set name='Demo Tenant Drew' where id='00000000-0000-0000-0000-00000000000f' and name='Drew Cano';
update public.tenants set email='demo-tenant-1@example.com' where id='00000000-0000-0000-0000-00000000000b' and email='olivia.rhye@example.com';
update public.tenants set email='demo-tenant-2@example.com' where id='00000000-0000-0000-0000-00000000000c' and email='phoenix.baker@example.com';
update public.tenants set email='demo-tenant-3@example.com' where id='00000000-0000-0000-0000-00000000000d' and email='lana.steiner@example.com';
update public.tenants set email='demo-tenant-4@example.com' where id='00000000-0000-0000-0000-00000000000e' and email='demi.wilkinson@example.com';
update public.tenants set email='demo-tenant-5@example.com' where id='00000000-0000-0000-0000-00000000000f' and email='drew.cano@example.com';
update public.properties set address='Demo address 1 (fictional)' where id='00000000-0000-0000-0000-000000000001' and address='124 Maple Street, Austin, TX';
update public.properties set address='Demo address 2 (fictional)' where id='00000000-0000-0000-0000-000000000002' and address='860 Oak Avenue, Austin, TX';
update public.properties set address='Demo address 3 (fictional)' where id='00000000-0000-0000-0000-000000000003' and address='42 Parkside Drive, Austin, TX';
commit;
