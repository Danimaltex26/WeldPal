-- 005_storage.sql
-- Storage bucket for uploaded weld photos.

insert into storage.buckets (id, name, public)
values ('weld-images', 'weld-images', false);

-- Authenticated users can upload to their own folder
create policy "Users can upload weld images to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'weld-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own files
create policy "Users can read own weld images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'weld-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
