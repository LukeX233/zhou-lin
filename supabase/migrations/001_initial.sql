-- ============================================================
-- Lin Dough Handmade — Initial Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES  (extends auth.users)
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text,
  phone      text,
  wechat     text,
  is_admin   boolean default false,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────
-- MENU ITEMS
-- ─────────────────────────────────────────────
create table if not exists menu_items (
  id              uuid primary key default gen_random_uuid(),
  name_zh         text not null,
  name_en         text,
  description_zh  text,
  description_en  text,
  price           numeric(10,2) not null,
  image_url       text,
  available_date  date not null,
  pickup_time     text,           -- e.g. "5:00pm – 7:00pm"
  capacity        integer,        -- null = unlimited
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ITEM OPTION GROUPS  (e.g. "辣度", "香菜")
-- ─────────────────────────────────────────────
create table if not exists item_option_groups (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid references menu_items(id) on delete cascade,
  label_zh      text not null,
  label_en      text,
  is_required   boolean default true,
  display_order integer default 0
);

-- ─────────────────────────────────────────────
-- ITEM OPTION CHOICES  (e.g. "不辣", "中辣", "重辣")
-- ─────────────────────────────────────────────
create table if not exists item_option_choices (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid references item_option_groups(id) on delete cascade,
  value_zh       text not null,
  value_en       text,
  price_modifier numeric(10,2) default 0,
  display_order  integer default 0
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id),
  customer_name   text not null,
  customer_phone  text,
  customer_wechat text,
  status          text default 'pending_payment'
                    check (status in ('pending_payment','confirmed','completed','cancelled')),
  total_amount    numeric(10,2) not null,
  unique_amount   numeric(10,2) not null,  -- slightly adjusted cents for Plaid matching
  plaid_matched   boolean default false,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references orders(id) on delete cascade,
  menu_item_id   uuid references menu_items(id),
  quantity       integer default 1,
  unit_price     numeric(10,2) not null
);

-- ─────────────────────────────────────────────
-- ORDER ITEM SELECTIONS  (which options were chosen)
-- ─────────────────────────────────────────────
create table if not exists order_item_selections (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid references order_items(id) on delete cascade,
  group_id       uuid references item_option_groups(id),
  choice_id      uuid references item_option_choices(id),
  value_zh       text not null
);

-- ─────────────────────────────────────────────
-- POLLS  (weekly demand surveys)
-- ─────────────────────────────────────────────
create table if not exists polls (
  id           uuid primary key default gen_random_uuid(),
  question_zh  text not null,
  question_en  text,
  is_active    boolean default true,
  closes_at    timestamptz,
  created_at   timestamptz default now()
);

create table if not exists poll_options (
  id            uuid primary key default gen_random_uuid(),
  poll_id       uuid references polls(id) on delete cascade,
  label_zh      text not null,
  label_en      text,
  display_order integer default 0
);

create table if not exists poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid references polls(id) on delete cascade,
  option_id  uuid references poll_options(id) on delete cascade,
  user_id    uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

-- ─────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────

-- menu_items with order count for capacity tracking
create or replace view menu_items_with_counts as
select
  m.*,
  coalesce(
    (select sum(oi.quantity)
     from order_items oi
     join orders o on o.id = oi.order_id
     where oi.menu_item_id = m.id
       and o.status not in ('cancelled')
    ), 0
  )::integer as orders_count
from menu_items m;

-- poll options with vote counts
create or replace view poll_options_with_counts as
select
  po.*,
  count(pv.id)::integer as vote_count
from poll_options po
left join poll_votes pv on pv.option_id = po.id
group by po.id;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table profiles          enable row level security;
alter table menu_items        enable row level security;
alter table item_option_groups enable row level security;
alter table item_option_choices enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table order_item_selections enable row level security;
alter table polls             enable row level security;
alter table poll_options      enable row level security;
alter table poll_votes        enable row level security;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Profiles: users can read/update their own; admin can read all
create policy "profiles: own read"   on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles: own update" on profiles for update using (auth.uid() = id);
create policy "profiles: admin update" on profiles for update using (is_admin());

-- Menu items: everyone can read active items; admin can do everything
create policy "menu_items: public read" on menu_items for select using (is_active = true);
create policy "menu_items: admin all"   on menu_items for all using (is_admin());

-- Option groups/choices: public read; admin can do everything
create policy "option_groups: public read"  on item_option_groups  for select using (true);
create policy "option_choices: public read" on item_option_choices for select using (true);
create policy "option_groups: admin all"    on item_option_groups  for all using (is_admin());
create policy "option_choices: admin all"   on item_option_choices for all using (is_admin());

-- Orders: users see own orders; insert allowed for authenticated; admin sees all
create policy "orders: own read"    on orders for select using (auth.uid() = user_id or is_admin());
create policy "orders: insert auth" on orders for insert with check (auth.uid() = user_id);
create policy "orders: admin all"   on orders for all using (is_admin());

create policy "order_items: own read" on order_items for select
  using (exists(select 1 from orders o where o.id = order_id and o.user_id = auth.uid()) or is_admin());
create policy "order_items: insert" on order_items for insert with check (true);

create policy "order_selections: insert"   on order_item_selections for insert with check (true);
create policy "order_selections: own read" on order_item_selections for select using (true);

-- Polls: public read; admin can do everything
create policy "polls: public read"   on polls        for select using (true);
create policy "options: public read" on poll_options for select using (true);
create policy "votes: own read"      on poll_votes   for select using (auth.uid() = user_id);
create policy "votes: insert auth"   on poll_votes   for insert with check (auth.uid() = user_id);
create policy "polls: admin all"     on polls        for all using (is_admin());
create policy "options: admin all"   on poll_options for all using (is_admin());

-- ─────────────────────────────────────────────
-- STORAGE BUCKET for food photos (admin uploads)
-- ─────────────────────────────────────────────
-- Run this in Supabase Dashboard > Storage, or via CLI:
-- insert into storage.buckets (id, name, public) values ('food-photos', 'food-photos', true);
