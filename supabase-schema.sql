-- Research Paper Assistant: authenticated-user schema
-- Run this file in the Supabase Dashboard SQL Editor before connecting the app.
create extension if not exists pgcrypto;

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  -- Folder names are unique per user, but different users may use the same name.
  constraint folders_user_id_name_key unique (user_id, name)
);

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  authors text,
  publication_year integer check (publication_year is null or publication_year between 1 and 9999),
  journal text,
  source_url text,
  -- Reserved for a future Supabase Storage path. No PDF upload is implemented now.
  pdf_path text,
  created_at timestamptz not null default now(),
  constraint papers_source_url_is_http check (source_url is null or source_url ~* '^https?://')
);

-- A paper can appear in many folders, and a folder can contain many papers.
create table public.folder_papers (
  folder_id uuid not null references public.folders(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, paper_id)
);

-- Row Level Security is enabled on every app table. There are no public policies.
alter table public.folders enable row level security;
alter table public.papers enable row level security;
alter table public.folder_papers enable row level security;

-- Folders: auth.uid() is the id of the currently signed-in Supabase user.
create policy "Users can view their own folders"
  on public.folders for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their own folders"
  on public.folders for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own folders"
  on public.folders for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own folders"
  on public.folders for delete to authenticated
  using (user_id = auth.uid());

-- Papers use the same ownership rules as folders.
create policy "Users can view their own papers"
  on public.papers for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their own papers"
  on public.papers for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own papers"
  on public.papers for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own papers"
  on public.papers for delete to authenticated
  using (user_id = auth.uid());

-- A relationship is visible or writable only when the signed-in user owns both
-- records. This prevents linking another user's paper or folder by guessing a UUID.
create policy "Users can view their own folder paper relationships"
  on public.folder_papers for select to authenticated
  using (
    exists (select 1 from public.folders where id = folder_id and user_id = auth.uid())
    and exists (select 1 from public.papers where id = paper_id and user_id = auth.uid())
  );

create policy "Users can create their own folder paper relationships"
  on public.folder_papers for insert to authenticated
  with check (
    exists (select 1 from public.folders where id = folder_id and user_id = auth.uid())
    and exists (select 1 from public.papers where id = paper_id and user_id = auth.uid())
  );

create policy "Users can delete their own folder paper relationships"
  on public.folder_papers for delete to authenticated
  using (
    exists (select 1 from public.folders where id = folder_id and user_id = auth.uid())
    and exists (select 1 from public.papers where id = paper_id and user_id = auth.uid())
  );
