alter table public.profiles
 add column location text not null default '' check (char_length(location)<=80),
 add column website text not null default '' check (char_length(website)<=250 and (website='' or website ~ '^https://[^[:space:]]+$')),
 add column focus text not null default '' check (char_length(focus)<=160);
grant update(display_name,username,bio,avatar_url,location,website,focus) on public.profiles to authenticated;
create policy profiles_update_own on public.profiles for update to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
