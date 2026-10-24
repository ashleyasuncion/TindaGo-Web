-- ============================================================================
-- TindaGo — GCash QR image for manual payments (2026-10-24)
--
-- Why: the store owner can already publish a GCash *number* in
-- backoffice/preorder_qr.html. This adds an optional QR image uploaded once
-- and shown on every manual-GCash surface:
--   * backoffice/preorder_qr.html  — upload / preview / remove
--   * preorder/ (customer page)    — shown on the GCash receipt
--   * Android checkout             — shown in the manual GCash sale dialog
--
-- Adds:
--   1. store_profiles.gcash_qr_url — public URL of the owner's QR image.
--   2. A public `gcash-qr` Storage bucket (2 MB, png/jpeg/webp).
--   3. Storage RLS: anyone may read; a signed-in owner may write only inside
--      their own <uid>/ folder.
--
-- Idempotent: safe to re-run.
--
-- Rollback:
--   alter table public.store_profiles drop column if exists gcash_qr_url;
--   delete from storage.objects where bucket_id = 'gcash-qr';
--   delete from storage.buckets where id = 'gcash-qr';
-- ============================================================================

-- 1. Public URL of the uploaded QR image ('' = not set).
alter table public.store_profiles
  add column if not exists gcash_qr_url text not null default '';

-- 2. Public bucket. Public read is intentional: the image is a payment QR that
--    the customer page and the owner's phone must load without a session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gcash-qr',
  'gcash-qr',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage policies (scoped to this bucket only).
drop policy if exists "gcash_qr_public_read" on storage.objects;
create policy "gcash_qr_public_read" on storage.objects
  for select using (bucket_id = 'gcash-qr');

drop policy if exists "gcash_qr_owner_insert" on storage.objects;
create policy "gcash_qr_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gcash-qr'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "gcash_qr_owner_update" on storage.objects;
create policy "gcash_qr_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'gcash-qr'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'gcash-qr'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "gcash_qr_owner_delete" on storage.objects;
create policy "gcash_qr_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'gcash-qr'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- END GCash QR schema — run this once in the Supabase SQL editor.
-- ============================================================================
