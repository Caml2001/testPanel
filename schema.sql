-- First remove existing policies
drop policy if exists "Enable insert for authenticated users only" on identity_verifications;
drop policy if exists "Allow public read access" on identity_verifications;
drop policy if exists "Allow update" on identity_verifications;
drop policy if exists "Allow public read access" on storage.objects;
drop policy if exists "Allow uploads" on storage.objects;

-- Recreate the table with the correct structure
drop table if exists identity_verifications;

create table identity_verifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  front_photo_url text not null,
  back_photo_url text not null,
  selfie_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  user_id uuid references auth.users(id)
);

-- Enable RLS
alter table identity_verifications enable row level security;

-- Create a more permissive policy for development
create policy "Allow all operations"
on identity_verifications
for all 
to public
using (true)
with check (true);

-- Set up storage bucket
insert into storage.buckets (id, name, public)
values ('id-photos', 'id-photos', true)
on conflict (id) do update
set public = true;

-- Create permissive storage policy
create policy "Allow all storage operations"
on storage.objects
for all
to public
using (bucket_id = 'id-photos')
with check (bucket_id = 'id-photos');