-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SONGS
create table public.songs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  data jsonb not null, -- The entire song JSON state
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.songs enable row level security;
create policy "Users can view own songs" on public.songs for select using (auth.uid() = user_id);
create policy "Users can insert own songs" on public.songs for insert with check (auth.uid() = user_id);
create policy "Users can update own songs" on public.songs for update using (auth.uid() = user_id);
create policy "Users can delete own songs" on public.songs for delete using (auth.uid() = user_id);

-- 3. INSTRUMENTS (Custom Kits)
create table public.instruments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  type text default 'sampler', -- 'sampler' or 'synth'
  data jsonb not null, -- Configuration data (envelope, filter, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.instruments enable row level security;
create policy "Users can view own instruments" on public.instruments for select using (auth.uid() = user_id);
create policy "Users can insert own instruments" on public.instruments for insert with check (auth.uid() = user_id);
create policy "Users can update own instruments" on public.instruments for update using (auth.uid() = user_id);
create policy "Users can delete own instruments" on public.instruments for delete using (auth.uid() = user_id);

-- Enforce Max 5 Instruments Limit via Trigger
create or replace function check_instrument_limit()
returns trigger as $$
begin
  if (select count(*) from public.instruments where user_id = auth.uid()) >= 5 then
    raise exception 'Maximum limit of 5 custom instruments reached.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_instrument_limit
  before insert on public.instruments
  for each row execute procedure check_instrument_limit();

-- 4. STORAGE (Samples)
-- Create a bucket named 'samples' in the Supabase Dashboard > Storage
-- We cannot create buckets via SQL in the standard editor usually, but we can set policies.

-- Policy: "Give users access to their own folder"
-- Path convention: user_id/filename.mp3

-- Allow authenticated uploads
create policy "Authenticated users can upload samples"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own samples
create policy "Users can update own samples"
on storage.objects for update
to authenticated
using (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own samples
create policy "Users can delete own samples"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (or authenticated only, but public is easier for playback)
-- User wants "save their songs and instruments", implying private.
-- But if we want to play them, we need to download them. 
-- Authenticated read is safer.
create policy "Users can view own samples"
on storage.objects for select
to authenticated
using (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
