create extension if not exists pgcrypto;

create type sitto_record_kind as enum ('fund', 'sale', 'production', 'expense', 'balance');
create type sitto_module as enum (
  'funds',
  'unit',
  'indirect',
  'breakeven',
  'cashbook',
  'sales',
  'production',
  'expenses',
  'reports'
);

create table public.sitto_records (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  record_date date not null,
  module sitto_module not null,
  kind sitto_record_kind not null,
  description text not null,
  purpose text,
  category text not null,
  quantity numeric(14, 2) not null default 1 check (quantity >= 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  amount numeric(14, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sitto_direct_cost_breakdown (
  id uuid primary key default gen_random_uuid(),
  component text not null unique,
  amount numeric(14, 2) not null check (amount >= 0)
);

create table public.sitto_monthly_indirect_costs (
  id uuid primary key default gen_random_uuid(),
  expense text not null unique,
  amount numeric(14, 2) not null check (amount >= 0)
);

create table public.sitto_audit_trail (
  id uuid primary key default gen_random_uuid(),
  record_id uuid references public.sitto_records(id) on delete set null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.sitto_next_ref(prefix text)
returns text
language plpgsql
security definer
as $$
declare
  next_number integer;
begin
  select coalesce(max(substring(ref from '[0-9]+$')::integer), 0) + 1
  into next_number
  from public.sitto_records
  where ref like prefix || '%';

  return prefix || lpad(next_number::text, 3, '0');
end;
$$;

create or replace function public.sitto_audit_records()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.sitto_audit_trail (record_id, action, old_data, new_data)
  values (coalesce(new.id, old.id), tg_op, to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end;
$$;

create trigger sitto_records_audit
after insert or update or delete on public.sitto_records
for each row execute function public.sitto_audit_records();

alter table public.sitto_records enable row level security;
alter table public.sitto_direct_cost_breakdown enable row level security;
alter table public.sitto_monthly_indirect_costs enable row level security;
alter table public.sitto_audit_trail enable row level security;

create policy "authenticated read sitto records" on public.sitto_records
for select to authenticated using (true);

create policy "authenticated manage sitto records" on public.sitto_records
for all to authenticated using (true) with check (true);

create policy "authenticated read direct costs" on public.sitto_direct_cost_breakdown
for select to authenticated using (true);

create policy "authenticated read indirect costs" on public.sitto_monthly_indirect_costs
for select to authenticated using (true);

create policy "authenticated read audit trail" on public.sitto_audit_trail
for select to authenticated using (true);

insert into public.sitto_direct_cost_breakdown (component, amount) values
  ('Harness System', 35000),
  ('Aluminium Frame', 25000),
  ('Seat Platform', 25000),
  ('Rubber Foot Pads', 6000),
  ('Paint', 5000),
  ('Bolts & Fasteners', 4000)
on conflict (component) do update set amount = excluded.amount;

insert into public.sitto_monthly_indirect_costs (expense, amount) values
  ('Business Name Registration', 90000),
  ('Wood Casting (Prototype Tooling)', 70000),
  ('Transport', 50000),
  ('Marketing & Promotion', 90000),
  ('Internet & Communication', 35000),
  ('Stationery & Record Keeping', 25000),
  ('Miscellaneous Expenses', 35000)
on conflict (expense) do update set amount = excluded.amount;

insert into public.sitto_records
  (ref, record_date, module, kind, description, purpose, category, quantity, unit_price)
values
  ('FND001', '2026-06-10', 'cashbook', 'fund', 'Stanbic Seed Fund Received', 'Seed funding', 'Grant Funding', 1, 500000),
  ('EXP001', '2026-06-11', 'funds', 'expense', 'Wood Casting (Prototype Tooling)', 'Prototype development', 'Indirect', 1, 70000),
  ('EXP002', '2026-06-13', 'funds', 'expense', 'Prototype Re-innovation', 'Product improvement', 'Product Development', 1, 110000),
  ('EXP003', '2026-06-13', 'funds', 'expense', 'Transport', 'Collection of materials', 'Indirect', 1, 10000),
  ('PRO001', '2026-06-15', 'production', 'production', 'Production of First 2 Sitto Chairs', 'Initial manufacturing', 'Direct', 2, 100000),
  ('BAL001', '2026-06-15', 'funds', 'balance', 'Cash Balance Retained', 'Working capital', 'Working Capital', 1, 20000),
  ('SIT001', '2026-06-20', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #1', 'Product Sale', 1, 150000),
  ('SIT002', '2026-06-23', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #2', 'Product Sale', 1, 150000),
  ('PRO002', '2026-06-24', 'production', 'production', 'Production of 2 Chairs', 'Second Production', 'Direct', 2, 100000),
  ('EXP004', '2026-06-25', 'funds', 'expense', 'Business Name Registration', 'Business formalisation', 'Indirect', 1, 90000),
  ('SIT003', '2026-06-28', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #3 & #4', 'Product Sale', 2, 150000),
  ('PRO003', '2026-06-30', 'production', 'production', 'Production of 1 Chair', 'Third Production', 'Direct', 1, 100000),
  ('SIT004', '2026-07-03', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #5', 'Product Sale', 1, 150000),
  ('PRO004', '2026-07-05', 'production', 'production', 'Production of 4 Chairs', 'Fourth Production', 'Direct', 4, 100000),
  ('SIT005', '2026-07-08', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #6-#8', 'Product Sale', 3, 150000),
  ('SIT006', '2026-07-10', 'sales', 'sale', 'Sitto Wearable Chair', 'Chair #9', 'Product Sale', 1, 150000),
  ('PRO005', '2026-07-12', 'production', 'production', 'Production of 4 Chairs', 'Fifth Production', 'Direct', 4, 100000),
  ('SIT007', '2026-07-13', 'sales', 'sale', 'Sitto Wearable Chair', 'Chairs #10 & #11', 'Product Sale', 2, 150000)
on conflict (ref) do update set
  record_date = excluded.record_date,
  module = excluded.module,
  kind = excluded.kind,
  description = excluded.description,
  purpose = excluded.purpose,
  category = excluded.category,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  updated_at = now();
