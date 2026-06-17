create extension if not exists "pgcrypto";

create type public.user_role as enum ('client', 'provider', 'admin');
create type public.provider_status as enum ('draft', 'pending_review', 'verified', 'suspended');
create type public.booking_status as enum ('pending', 'accepted', 'en_route', 'active', 'completed', 'cancelled');
create type public.urgency_level as enum ('standard', 'priority', 'critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text not null default '',
  role public.user_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_types (
  id text primary key,
  name text not null,
  description text not null,
  base_rate_cents integer not null check (base_rate_cents > 0),
  icon text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null default '',
  license_number text not null default '',
  years_experience integer not null default 0 check (years_experience between 0 and 50),
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  bio text not null default '',
  coverage_areas text not null default '',
  verification_status public.provider_status not null default 'draft',
  home_latitude double precision,
  home_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_home_latitude_check check (home_latitude is null or home_latitude between -90 and 90),
  constraint provider_home_longitude_check check (home_longitude is null or home_longitude between -180 and 180)
);

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_hour smallint not null check (start_hour between 0 and 23),
  end_hour smallint not null check (end_hour between 1 and 24),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint provider_availability_hours_check check (end_hour > start_hour)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid references public.provider_profiles(user_id) on delete restrict,
  service_type_id text not null references public.service_types(id) on delete restrict,
  location_address text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  scheduled_at timestamptz not null,
  duration_hours integer not null check (duration_hours between 1 and 24),
  guards_needed integer not null check (guards_needed between 1 and 12),
  special_instructions text,
  urgency_level public.urgency_level not null default 'standard',
  status public.booking_status not null default 'pending',
  quoted_total_cents integer not null default 0 check (quoted_total_cents >= 0),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint booking_longitude_check check (longitude is null or longitude between -180 and 180),
  constraint bookings_provider_required_after_pending check (
    status in ('pending', 'cancelled') or provider_id is not null
  )
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status public.booking_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'authorized', 'captured', 'failed')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index bookings_client_status_idx on public.bookings(client_id, status);
create index bookings_provider_status_idx on public.bookings(provider_id, status);
create index bookings_scheduled_at_idx on public.bookings(scheduled_at);
create index booking_history_booking_id_idx on public.booking_status_history(booking_id, created_at desc);
create index provider_availability_provider_idx on public.provider_availability(provider_id, weekday);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role :=
    case
      when coalesce(new.raw_user_meta_data ->> 'role', '') in ('client', 'provider', 'admin')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'client'::public.user_role
    end;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    requested_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.record_booking_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.booking_status_history (
      booking_id,
      status,
      actor_id
    )
    values (
      new.id,
      new.status,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger provider_profiles_set_updated_at
before update on public.provider_profiles
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger bookings_record_history
after insert or update of status on public.bookings
for each row execute function public.record_booking_status_history();

alter table public.profiles enable row level security;
alter table public.service_types enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.provider_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Users can insert own profile"
on public.profiles for insert
with check (id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Admins manage profiles"
on public.profiles for delete
using (public.is_admin());

create policy "Authenticated users can read service types"
on public.service_types for select
using (auth.role() = 'authenticated');

create policy "Admins manage service types"
on public.service_types for all
using (public.is_admin())
with check (public.is_admin());

create policy "Providers can read own profile"
on public.provider_profiles for select
using (user_id = auth.uid() or public.is_admin());

create policy "Providers can create own profile"
on public.provider_profiles for insert
with check (user_id = auth.uid() or public.is_admin());

create policy "Providers can update own profile"
on public.provider_profiles for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Providers can read own availability"
on public.provider_availability for select
using (provider_id = auth.uid() or public.is_admin());

create policy "Providers can manage own availability"
on public.provider_availability for all
using (provider_id = auth.uid() or public.is_admin())
with check (provider_id = auth.uid() or public.is_admin());

create policy "Clients and assigned providers can read bookings"
on public.bookings for select
using (
  client_id = auth.uid()
  or provider_id = auth.uid()
  or public.is_admin()
);

create policy "Clients create own bookings"
on public.bookings for insert
with check (client_id = auth.uid());

create policy "Clients update own pending bookings"
on public.bookings for update
using (
  client_id = auth.uid()
  and status in ('pending', 'accepted')
)
with check (
  client_id = auth.uid()
  and status in ('pending', 'cancelled', 'accepted')
);

create policy "Verified providers can claim pending bookings"
on public.bookings for update
using (
  provider_id is null
  and status = 'pending'
  and exists (
    select 1
    from public.provider_profiles
    where user_id = auth.uid()
      and verification_status = 'verified'
  )
)
with check (
  provider_id = auth.uid()
  and status = 'accepted'
);

create policy "Assigned providers can progress bookings"
on public.bookings for update
using (
  provider_id = auth.uid()
  and status in ('accepted', 'en_route', 'active')
)
with check (
  provider_id = auth.uid()
  and status in ('accepted', 'en_route', 'active', 'completed', 'cancelled')
);

create policy "Admins manage bookings"
on public.bookings for all
using (public.is_admin())
with check (public.is_admin());

create policy "Participants can read booking history"
on public.booking_status_history for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings
    where bookings.id = booking_status_history.booking_id
      and (bookings.client_id = auth.uid() or bookings.provider_id = auth.uid())
  )
);

create policy "Admins can write booking history"
on public.booking_status_history for insert
with check (public.is_admin());

create policy "Participants can read payments"
on public.payments for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings
    where bookings.id = payments.booking_id
      and (bookings.client_id = auth.uid() or bookings.provider_id = auth.uid())
  )
);

create policy "Admins manage payments"
on public.payments for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own notifications"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin());

create policy "Users can mark own notifications"
on public.notifications for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Admins create notifications"
on public.notifications for insert
with check (public.is_admin());
