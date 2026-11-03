create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'professional')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2800000 and (avatar_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or avatar_url ~ '^https://'))),
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, role),
  check ((role = 'student' and cardinality(specialties) = 0) or (role = 'professional' and cardinality(specialties) between 1 and 2 and specialties <@ array['Treinador', 'Nutricionista']::text[]))
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_create_own on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
